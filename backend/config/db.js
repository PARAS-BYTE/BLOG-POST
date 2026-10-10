const mongoose = require('mongoose');
const https = require('https');
try {
    const dns = require('dns');
    dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

/**
 * Perform a DNS-over-HTTPS (DoH) query using Node's native https module.
 * This completely bypasses local ISP / Windows port 53 UDP blocks.
 */
function queryDoh(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, {
            headers: { 'Accept': 'application/dns-json' },
            timeout: 5000
        }, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed);
                } catch (e) {
                    reject(new Error(`Failed to parse DoH response from ${url}: ${e.message}`));
                }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error(`DoH query timed out: ${url}`));
        });
    });
}

/**
 * Resolve SRV and TXT records for a mongodb+srv hostname via HTTPS.
 * Converts mongodb+srv://... into a standard direct replica-set mongodb:// URI.
 */
async function resolveMongoSrvViaHttps(srvUri) {
    const srvPattern = /^mongodb\+srv:\/\/([^@]+)@([^\/\?]+)(?:\/([^\?]*))?(?:\?(.*))?$/;
    const match = srvUri.match(srvPattern);
    if (!match) {
        return srvUri; // Not a mongodb+srv URI
    }

    const [, auth, clusterHost, dbName, rawQuery] = match;
    console.log(`[DNS-Resolver] Resolving MongoDB Atlas cluster "${clusterHost}" via DNS-over-HTTPS...`);

    // Providers to try (Google and Cloudflare)
    const providers = [
        {
            name: 'Google',
            srvUrl: `https://dns.google/resolve?name=_mongodb._tcp.${clusterHost}&type=SRV`,
            txtUrl: `https://dns.google/resolve?name=${clusterHost}&type=TXT`
        },
        {
            name: 'Cloudflare',
            srvUrl: `https://cloudflare-dns.com/dns-query?name=_mongodb._tcp.${clusterHost}&type=SRV`,
            txtUrl: `https://cloudflare-dns.com/dns-query?name=${clusterHost}&type=TXT`
        }
    ];

    let srvAnswer = null;
    let txtAnswer = null;

    for (const provider of providers) {
        try {
            const [srvRes, txtRes] = await Promise.all([
                queryDoh(provider.srvUrl),
                queryDoh(provider.txtUrl).catch(() => null)
            ]);

            if (srvRes && srvRes.Answer && srvRes.Answer.length > 0) {
                srvAnswer = srvRes.Answer;
                txtAnswer = txtRes && txtRes.Answer ? txtRes.Answer : [];
                console.log(`[DNS-Resolver] Successfully resolved cluster hosts via ${provider.name} DoH.`);
                break;
            }
        } catch (err) {
            console.warn(`[DNS-Resolver] ${provider.name} DoH lookup failed: ${err.message}. Trying next provider...`);
        }
    }

    if (!srvAnswer || srvAnswer.length === 0) {
        throw new Error(`Could not resolve SRV records for ${clusterHost} via any DoH provider.`);
    }

    // Parse shard hosts and ports from SRV records
    const hosts = srvAnswer.map(ans => {
        // format of data: "priority weight port target."
        const parts = (ans.data || '').trim().split(/\s+/);
        if (parts.length >= 4) {
            const port = parts[2];
            const target = parts[3].replace(/\.$/, '');
            return `${target}:${port}`;
        }
        return null;
    }).filter(Boolean);

    if (hosts.length === 0) {
        throw new Error('No valid host records found in DoH SRV response.');
    }

    // Parse options from TXT record (replicaSet, authSource)
    const optionsMap = new Map();
    optionsMap.set('ssl', 'true');

    if (txtAnswer && txtAnswer.length > 0) {
        for (const ans of txtAnswer) {
            const txtData = (ans.data || '').replace(/^"|"$/g, '');
            const params = new URLSearchParams(txtData);
            for (const [k, v] of params.entries()) {
                optionsMap.set(k, v);
            }
        }
    }

    // Add query params from original URI
    if (rawQuery) {
        const queryParams = new URLSearchParams(rawQuery);
        for (const [k, v] of queryParams.entries()) {
            optionsMap.set(k, v);
        }
    }

    const optionsString = Array.from(optionsMap.entries())
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');

    const directUri = `mongodb://${auth}@${hosts.join(',')}/${dbName || ''}?${optionsString}`;
    return directUri;
}

/**
 * Connect to MongoDB with:
 * 1. Support for direct local MongoDB (if configured or requested)
 * 2. Automatic DNS-over-HTTPS fallback if ISP/Windows blocks Atlas SRV lookups
 * 3. Automatic fallback to local MongoDB (mongodb://127.0.0.1:27017/utsanova_blog) if Atlas fails
 */
async function connectDB() {
    if (mongoose.connection.readyState === 1) {
        return;
    }
    const rawUri = process.env.MONGO_URI;
    const localUri = process.env.LOCAL_MONGO_URI || 'mongodb://127.0.0.1:27017/utsanova_blog';

    // If configured explicitly to use local MongoDB
    if (process.env.USE_LOCAL_DB === 'true') {
        console.log('🔄 USE_LOCAL_DB is active. Connecting to local MongoDB...');
        return await tryConnect(localUri, 'Local MongoDB');
    }

    if (!rawUri) {
        console.error('❌ MONGO_URI is not defined in backend/.env.');
        return;
    }

    // Attempt 1: Direct Mongoose connect to Cloud Atlas
    try {
        await mongoose.connect(rawUri, { serverSelectionTimeoutMS: 5000 });
        console.log('✅ MongoDB Connected successfully to Cloud Atlas!');
        return;
    } catch (directErr) {
        // If it's a mongodb+srv:// URI and direct connection failed (e.g. SRV DNS blocked by ISP)
        if (rawUri.startsWith('mongodb+srv://')) {
            console.log('⚠️ Direct Atlas SRV connection failed (' + directErr.message + '). Attempting DNS-over-HTTPS resolution for Cloud Atlas...');

            try {
                const fallbackUri = await resolveMongoSrvViaHttps(rawUri);
                await mongoose.connect(fallbackUri, { serverSelectionTimeoutMS: 8000 });
                console.log('✅ MongoDB Connected successfully to Cloud Atlas (via HTTPS DNS Resolver)!');
                return;
            } catch (fallbackErr) {
                console.error('❌ Cloud Atlas connection failed via HTTPS DNS Resolver:', fallbackErr.message);
            }
        } else {
            console.error('❌ Cloud Atlas connection failed:', directErr.message);
        }

        // Only fall back to local if explicitly allowed
        if (process.env.ALLOW_LOCAL_FALLBACK === 'true') {
            console.log('🔄 ALLOW_LOCAL_FALLBACK is set. Attempting fallback to local MongoDB (' + localUri + ')...');
            const localConnected = await tryConnect(localUri, 'Local MongoDB Fallback');
            if (localConnected) return;
        }

        console.error('❌ Could not establish connection to Cloud MongoDB Atlas.');
        logHelp(directErr.message);
    }
}

async function tryConnect(uri, label) {
    try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
        console.log(`✅ ${label} Connected successfully!`);
        return true;
    } catch (err) {
        console.warn(`❌ ${label} connection failed:`, err.message);
        return false;
    }
}

function logHelp(msg) {
    console.error('\n📋 HOW TO FIX:');
    console.error(' Option 1 (Local MongoDB): Start MongoDB locally, or install MongoDB Community Server.');
    console.error(' Option 2 (Atlas Whitelist): In MongoDB Atlas -> Network Access -> Add IP -> 0.0.0.0/0 (Allow from anywhere).');
    console.error(' Option 3 (Switch to Local in .env): Set MONGO_URI=mongodb://127.0.0.1:27017/utsanova_blog in backend/.env\n');
}

module.exports = { connectDB, resolveMongoSrvViaHttps };
