/**
 * test-upload-integration.js
 * End-to-end integration test suite for Cloudinary & Multer image upload pipeline.
 */
const http = require('http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = require('./server');
const Admin = require('./models/Admin');

const TEST_PORT = 58540;
let server;
let adminToken;
let revokedToken;

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key';

// Helper for multipart/form-data POST request
function uploadMultipartRequest(options, fileField, fileName, fileMime, fileBuffer, extraFields = {}) {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    
    let body = Buffer.alloc(0);

    // Extra fields
    for (const [key, val] of Object.entries(extraFields)) {
      const fieldHead = Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`
      );
      body = Buffer.concat([body, fieldHead]);
    }

    // File field (if provided)
    if (fileField && fileBuffer) {
      const fileHead = Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${fileField}"; filename="${fileName}"\r\nContent-Type: ${fileMime}\r\n\r\n`
      );
      const fileTail = Buffer.from('\r\n');
      body = Buffer.concat([body, fileHead, fileBuffer, fileTail]);
    }

    const closeBoundary = Buffer.from(`--${boundary}--\r\n`);
    body = Buffer.concat([body, closeBoundary]);

    const reqOptions = {
      hostname: 'localhost',
      port: TEST_PORT,
      path: options.path,
      method: options.method || 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
        ...(options.headers || {})
      }
    };

    const req = http.request(reqOptions, (res) => {
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        let json;
        try {
          json = JSON.parse(rawData);
        } catch {
          json = { raw: rawData };
        }
        resolve({ status: res.statusCode, data: json });
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function jsonRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: 'localhost',
      port: TEST_PORT,
      path: options.path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = http.request(reqOptions, (res) => {
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        let json;
        try {
          json = JSON.parse(rawData);
        } catch {
          json = { raw: rawData };
        }
        resolve({ status: res.statusCode, data: json });
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('\n========================================');
  console.log('STARTING CLOUDINARY UPLOAD INTEGRATION TESTS');
  console.log('========================================\n');

  try {
    server = app.listen(TEST_PORT);
    console.log(`[TEST] Test server listening on http://localhost:${TEST_PORT}`);

    // Wait for mongo
    if (mongoose.connection.readyState !== 1) {
      await new Promise((res) => mongoose.connection.once('open', res));
    }
    console.log('[TEST] MongoDB Connected');

    // Create / find active admin
    let activeAdmin = await Admin.findOne({ email: 'superadmin@utsanova.com' });
    if (!activeAdmin) {
      activeAdmin = await Admin.create({
        email: 'superadmin@utsanova.com',
        password: 'hash',
        role: 'superadmin',
        status: 'active',
        isActive: true
      });
    }

    adminToken = jwt.sign({ id: activeAdmin._id }, JWT_SECRET, { expiresIn: '1h' });

    // Create revoked admin
    const revokedAdmin = await Admin.findOneAndUpdate(
      { email: 'revoked.uploader@utsanova.com' },
      { email: 'revoked.uploader@utsanova.com', password: 'hash', status: 'revoked', isActive: false },
      { upsert: true, new: true }
    );
    revokedToken = jwt.sign({ id: revokedAdmin._id }, JWT_SECRET, { expiresIn: '1h' });

    // Test 1: GET /api/upload/status without token (401)
    console.log('--- 1. Upload status without auth ---');
    const t1 = await jsonRequest({ path: '/api/upload/status' });
    console.log('Status (expected 401):', t1.status);
    if (t1.status !== 401) throw new Error(`Expected 401, got ${t1.status}`);

    // Test 2: GET /api/upload/status with admin token (200)
    console.log('\n--- 2. Upload status with admin auth ---');
    const t2 = await jsonRequest({
      path: '/api/upload/status',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('Status (expected 200):', t2.status, 'Configured:', t2.data.configured);
    if (t2.status !== 200) throw new Error(`Expected 200, got ${t2.status}`);

    // Test 3: POST /api/upload/image without auth (401)
    console.log('\n--- 3. Upload image without auth ---');
    const samplePngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    const t3 = await uploadMultipartRequest(
      { path: '/api/upload/image' },
      'image',
      'test.png',
      'image/png',
      samplePngBuffer
    );
    console.log('Status (expected 401):', t3.status);
    if (t3.status !== 401) throw new Error(`Expected 401, got ${t3.status}`);

    // Test 4: POST /api/upload/image with revoked admin token (403)
    console.log('\n--- 4. Revoked admin attempts to upload (Blocked) ---');
    const t4 = await uploadMultipartRequest(
      {
        path: '/api/upload/image',
        headers: { Authorization: `Bearer ${revokedToken}` }
      },
      'image',
      'test.png',
      'image/png',
      samplePngBuffer
    );
    console.log('Status (expected 403):', t4.status);
    if (t4.status !== 403) throw new Error(`Expected 403, got ${t4.status}`);

    // Test 5: POST /api/upload/image with no file (400)
    console.log('\n--- 5. Upload with no file attached ---');
    const t5 = await uploadMultipartRequest(
      {
        path: '/api/upload/image',
        headers: { Authorization: `Bearer ${adminToken}` }
      },
      null,
      null,
      null,
      null
    );
    console.log('Status (expected 400):', t5.status, t5.data.message);
    if (t5.status !== 400) throw new Error(`Expected 400, got ${t5.status}`);

    // Test 6: POST /api/upload/image with invalid file type (400)
    console.log('\n--- 6. Upload with invalid file type (.txt file) ---');
    const textBuffer = Buffer.from('This is a text file, not an image');
    const t6 = await uploadMultipartRequest(
      {
        path: '/api/upload/image',
        headers: { Authorization: `Bearer ${adminToken}` }
      },
      'image',
      'document.txt',
      'text/plain',
      textBuffer
    );
    console.log('Status (expected 400):', t6.status, t6.data.message);
    if (t6.status !== 400) throw new Error(`Expected 400, got ${t6.status}`);

    // Test 7: POST /api/upload/image with valid image (200)
    console.log('\n--- 7. Upload with valid PNG image ---');
    const t7 = await uploadMultipartRequest(
      {
        path: '/api/upload/image',
        headers: { Authorization: `Bearer ${adminToken}` }
      },
      'image',
      'valid-sample.png',
      'image/png',
      samplePngBuffer
    );
    console.log('Status (expected 200):', t7.status);
    console.log('Success:', t7.data.success);
    console.log('URL received:', t7.data.url?.substring(0, 45) + '...');
    if (t7.status !== 200 || !t7.data.url) {
      throw new Error(`Expected 200 and image URL, got status ${t7.status}`);
    }

    console.log('\n========================================');
    console.log('ALL 7 CLOUDINARY UPLOAD TESTS PASSED PERFECTLY!');
    console.log('========================================\n');
    process.exit(0);
  } catch (err) {
    console.error('[TEST ERROR]', err);
    process.exit(1);
  } finally {
    if (server) server.close();
  }
}

runTests();
