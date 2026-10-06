const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');
require('dotenv').config();
const Admin = require('./models/Admin');
const Blog = require('./models/Blog');

process.env.NODE_ENV = 'test';
const app = require('./server');
const http = require('http');

let server;
let baseUrl;

async function startServer() {
    await mongoose.connect(process.env.MONGO_URI);
    return new Promise((resolve) => {
        server = http.createServer(app);
        server.listen(0, () => {
            const port = server.address().port;
            baseUrl = `http://localhost:${port}`;
            console.log(`[TEST] Test server listening on ${baseUrl}`);
            resolve();
        });
    });
}

async function stopServer() {
    if (server) server.close();
    await mongoose.disconnect();
}

async function runTests() {
    await startServer();

    try {
        console.log('\n--- 1. Testing SuperAdmin Login ---');
        const superRes = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'superadmin@utsanova.com', password: 'superadmin@1234' })
        });
        const superData = await superRes.json();
        console.log('SuperAdmin Login Status:', superRes.status);
        console.log('SuperAdmin Role:', superData.role);
        console.log('SuperAdmin Permissions:', superData.permissions);
        if (superRes.status !== 200 || superData.role !== 'superadmin') {
            throw new Error('SuperAdmin login failed');
        }
        const superToken = superData.token;

        console.log('\n--- 2. Testing Regular Admin Login ---');
        const adminRes = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@utsanova.com', password: 'admin@1234' })
        });
        const adminData = await adminRes.json();
        console.log('Admin Login Status:', adminRes.status);
        console.log('Admin Role:', adminData.role);
        console.log('Admin Status:', adminData.status);
        console.log('Admin Permissions:', adminData.permissions);
        if (adminRes.status !== 200 || adminData.role !== 'admin') {
            throw new Error('Regular Admin login failed');
        }

        console.log('\n--- 3. SuperAdmin Creates New Custom Admin with Restricted Permissions ---');
        const testEmail = `test.subadmin.${Date.now()}@utsanova.com`;
        const createRes = await fetch(`${baseUrl}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${superToken}`
            },
            body: JSON.stringify({
                email: testEmail,
                password: 'password123',
                role: 'admin',
                permissions: {
                    canCreateBlog: true,
                    canEditBlog: true,
                    canDeleteBlog: false, // RESTRICTED
                    canUseAI: false,     // RESTRICTED
                    canScheduleBlog: false // RESTRICTED
                }
            })
        });
        const createData = await createRes.json();
        console.log('Create SubAdmin Status:', createRes.status);
        console.log('Created Admin ID:', createData._id);
        console.log('Created Admin Permissions:', createData.permissions);
        if (createRes.status !== 201) {
            throw new Error(`Failed to create subadmin: ${JSON.stringify(createData)}`);
        }
        const subAdminId = createData._id;

        console.log('\n--- 4. Restricted Admin Logs In ---');
        const subLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testEmail, password: 'password123' })
        });
        const subLoginData = await subLoginRes.json();
        const subToken = subLoginData.token;
        console.log('SubAdmin Token Received:', !!subToken);

        console.log('\n--- 5. Testing Permission: Restricted Admin attempts to create blog (Allowed) ---');
        const postRes = await fetch(`${baseUrl}/api/blogs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${subToken}`
            },
            body: JSON.stringify({
                title: 'Test Blog by SubAdmin',
                content: 'This should be permitted.',
                conclusion: 'Conclusion here',
                status: 'Draft'
            })
        });
        const postData = await postRes.json();
        console.log('Blog Create Status (expected 201):', postRes.status);
        if (postRes.status !== 201) {
            throw new Error(`Blog create failed: ${JSON.stringify(postData)}`);
        }
        const createdBlogId = postData._id;

        console.log('\n--- 6. Testing Permission: Restricted Admin attempts to use AI (Forbidden) ---');
        const aiRes = await fetch(`${baseUrl}/api/blogs/ai-generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${subToken}`
            },
            body: JSON.stringify({ topic: 'Quantum Computing' })
        });
        const aiData = await aiRes.json();
        console.log('AI Generation Status (expected 403):', aiRes.status);
        console.log('AI Message:', aiData.message);
        if (aiRes.status !== 403) {
            throw new Error(`Expected 403 Forbidden for AI generation, got ${aiRes.status}`);
        }

        console.log('\n--- 7. Testing Permission: Restricted Admin attempts to delete blog (Forbidden) ---');
        const deleteRes = await fetch(`${baseUrl}/api/blogs/${createdBlogId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${subToken}`
            }
        });
        const deleteData = await deleteRes.json();
        console.log('Delete Blog Status (expected 403):', deleteRes.status);
        console.log('Delete Message:', deleteData.message);
        if (deleteRes.status !== 403) {
            throw new Error(`Expected 403 Forbidden for Delete blog, got ${deleteRes.status}`);
        }

        console.log('\n--- 8. SuperAdmin Updates Permissions: Grants AI Permission ---');
        const updatePermRes = await fetch(`${baseUrl}/api/auth/admins/${subAdminId}/permissions`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${superToken}`
            },
            body: JSON.stringify({
                permissions: {
                    canCreateBlog: true,
                    canEditBlog: true,
                    canDeleteBlog: true,
                    canUseAI: true, // NOW GRANTED
                    canScheduleBlog: true
                }
            })
        });
        const updatePermData = await updatePermRes.json();
        console.log('Update Permissions Status:', updatePermRes.status);
        console.log('New Permissions:', updatePermData.permissions);
        if (updatePermRes.status !== 200 || !updatePermData.permissions.canDeleteBlog) {
            throw new Error('Failed to update permissions');
        }

        console.log('\n--- 9. SubAdmin can now delete blog with new permissions ---');
        const deleteRes2 = await fetch(`${baseUrl}/api/blogs/${createdBlogId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${subToken}`
            }
        });
        const deleteData2 = await deleteRes2.json();
        console.log('Delete Blog Status (expected 200):', deleteRes2.status);
        console.log('Delete Message:', deleteData2.message);
        if (deleteRes2.status !== 200) {
            throw new Error(`Expected 200 for Delete blog after grant, got ${deleteRes2.status}`);
        }

        console.log('\n--- 10. SuperAdmin Revokes SubAdmin Access ---');
        const revokeRes = await fetch(`${baseUrl}/api/auth/admins/${subAdminId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${superToken}`
            },
            body: JSON.stringify({ status: 'revoked' })
        });
        const revokeData = await revokeRes.json();
        console.log('Revoke Status (expected 200):', revokeRes.status);
        console.log('Account Status:', revokeData.status, 'isActive:', revokeData.isActive);

        console.log('\n--- 11. Revoked SubAdmin attempts to use API with previous token (Blocked) ---');
        const meRes = await fetch(`${baseUrl}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${subToken}` }
        });
        const meData = await meRes.json();
        console.log('Revoked API call Status (expected 403):', meRes.status);
        console.log('Revocation Message:', meData.message);
        if (meRes.status !== 403 || !meData.isRevoked) {
            throw new Error('Revoked token was not blocked');
        }

        console.log('\n--- 12. Revoked SubAdmin attempts to login (Blocked) ---');
        const loginBlockedRes = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testEmail, password: 'password123' })
        });
        const loginBlockedData = await loginBlockedRes.json();
        console.log('Revoked Login Status (expected 403):', loginBlockedRes.status);
        console.log('Revocation Login Message:', loginBlockedData.message);
        if (loginBlockedRes.status !== 403) {
            throw new Error('Revoked account was able to log in');
        }

        console.log('\n--- 13. SuperAdmin Restores Access ---');
        const restoreRes = await fetch(`${baseUrl}/api/auth/admins/${subAdminId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${superToken}`
            },
            body: JSON.stringify({ status: 'active' })
        });
        const restoreData = await restoreRes.json();
        console.log('Restore Status:', restoreRes.status);
        console.log('Restored Status:', restoreData.status);

        console.log('\n--- 14. SubAdmin can login again ---');
        const loginRestoredRes = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testEmail, password: 'password123' })
        });
        console.log('Restored Login Status (expected 200):', loginRestoredRes.status);
        if (loginRestoredRes.status !== 200) {
            throw new Error('Restored account login failed');
        }

        console.log('\n--- 15. SuperAdmin Deletes SubAdmin Account ---');
        const deleteAdminRes = await fetch(`${baseUrl}/api/auth/admins/${subAdminId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${superToken}` }
        });
        const deleteAdminData = await deleteAdminRes.json();
        console.log('Delete Admin Status (expected 200):', deleteAdminRes.status);
        console.log('Delete Admin Message:', deleteAdminData.message);

        console.log('\n--- 16. Protection: SuperAdmin cannot delete themselves ---');
        const superProfileRes = await fetch(`${baseUrl}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${superToken}` }
        });
        const superProfile = await superProfileRes.json();
        const deleteSelfRes = await fetch(`${baseUrl}/api/auth/admins/${superProfile._id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${superToken}` }
        });
        console.log('Delete Self Status (expected 400):', deleteSelfRes.status);
        if (deleteSelfRes.status !== 400) {
            throw new Error('SuperAdmin was able to delete themselves');
        }

        console.log('\n========================================');
        console.log('ALL 16 AUTHORIZATION TESTS PASSED PERFECTLY!');
        console.log('========================================\n');
    } finally {
        await stopServer();
    }
}

runTests().catch((err) => {
    console.error('Test Suite Failed:', err);
    process.exit(1);
});
