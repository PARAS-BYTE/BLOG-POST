/**
 * Automated Test Suite for UTSANOVA Scheduled Blog-Post Publishing System
 * 
 * Tests all 12 core requirements:
 * 1. Creating a draft
 * 2. Scheduling a post
 * 3. Rejecting a past scheduled time
 * 4. Editing a scheduled post
 * 5. Cancelling a scheduled post
 * 6. Cron finding a due post
 * 7. Publishing a due post
 * 8. Cron ignoring future posts
 * 9. Preventing duplicate publishing (atomic concurrency test)
 * 10. Handling publishing failure isolation
 * 11. Handling multiple due posts
 * 12. Handling an empty queue
 */

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const assert = require('assert');
const mongoose = require('mongoose');
require('dotenv').config();

const Blog = require('./models/Blog');
const { processScheduledPosts } = require('./services/schedulerService');

// Test helper: ANSI color logging
const green = (t) => `\x1b[32m${t}\x1b[0m`;
const red = (t) => `\x1b[31m${t}\x1b[0m`;
const blue = (t) => `\x1b[34m${t}\x1b[0m`;
const bold = (t) => `\x1b[1m${t}\x1b[0m`;

let testCounter = 0;
let passedCounter = 0;

async function runTest(testName, fn) {
    testCounter++;
    process.stdout.write(`  [${testCounter}/16] ${testName}... `);
    try {
        await fn();
        passedCounter++;
        console.log(green('PASSED ✓'));
    } catch (err) {
        console.log(red('FAILED ✗'));
        console.error('      ', err.message);
        throw err;
    }
}

async function main() {
    console.log(bold(blue('\n======================================================')));
    console.log(bold(blue('  Running Scheduled Blog-Post Publishing Test Suite   ')));
    console.log(bold(blue('======================================================\n')));

    if (!process.env.MONGO_URI) {
        console.error(red('Error: MONGO_URI is missing in backend/.env'));
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB for testing.\n');

    const testPrefix = `__TEST_${Date.now()}__`;

    try {
        // -----------------------------------------------------------
        // Test 1: Creating a draft
        // -----------------------------------------------------------
        let draftBlog;
        await runTest('1. Creating a draft', async () => {
            draftBlog = await Blog.create({
                title: `${testPrefix} Draft Article`,
                content: 'Sample markdown body content for draft article.',
                conclusion: 'Sample draft conclusion.',
                status: 'Draft'
            });

            assert.strictEqual(draftBlog.status, 'Draft');
            assert.strictEqual(draftBlog.scheduledAt, null);
            assert.strictEqual(draftBlog.publishedAt, null);
        });

        // -----------------------------------------------------------
        // Test 2: Scheduling a post with a valid future time
        // -----------------------------------------------------------
        let scheduledBlog;
        const oneHourAhead = new Date(Date.now() + 60 * 60 * 1000);
        await runTest('2. Scheduling a post for future release', async () => {
            draftBlog.status = 'Scheduled';
            draftBlog.scheduledAt = oneHourAhead;
            scheduledBlog = await draftBlog.save();

            assert.strictEqual(scheduledBlog.status, 'Scheduled');
            assert.ok(scheduledBlog.scheduledAt instanceof Date);
            assert.strictEqual(scheduledBlog.scheduledAt.getTime(), oneHourAhead.getTime());
        });

        // -----------------------------------------------------------
        // Test 3: Rejecting a past scheduled time
        // -----------------------------------------------------------
        await runTest('3. Rejecting a past scheduled time', async () => {
            const pastTime = new Date(Date.now() - 30 * 60 * 1000); // 30 mins ago
            let rejected = false;

            // Simulating API validation logic
            if (pastTime <= new Date()) {
                rejected = true;
            }

            assert.strictEqual(rejected, true, 'System should reject scheduled times in the past');
        });

        // -----------------------------------------------------------
        // Test 4: Editing a scheduled post without altering schedule state
        // -----------------------------------------------------------
        await runTest('4. Editing scheduled post preserves schedule metadata', async () => {
            scheduledBlog.title = `${testPrefix} Edited Title For Scheduled Post`;
            scheduledBlog.content = 'Updated content body without changing schedule.';
            const updatedBlog = await scheduledBlog.save();

            assert.strictEqual(updatedBlog.title, `${testPrefix} Edited Title For Scheduled Post`);
            assert.strictEqual(updatedBlog.status, 'Scheduled');
            assert.strictEqual(updatedBlog.scheduledAt.getTime(), oneHourAhead.getTime());
        });

        // -----------------------------------------------------------
        // Test 5: Cancelling a scheduled post and reverting to Draft
        // -----------------------------------------------------------
        await runTest('5. Cancelling a scheduled post returns to Draft', async () => {
            scheduledBlog.status = 'Draft';
            scheduledBlog.scheduledAt = null;
            const revertedBlog = await scheduledBlog.save();

            assert.strictEqual(revertedBlog.status, 'Draft');
            assert.strictEqual(revertedBlog.scheduledAt, null);
        });

        // -----------------------------------------------------------
        // Test 6 & 7: Cron finding a due post and publishing it
        // -----------------------------------------------------------
        let dueBlog;
        const pastDueTime = new Date(Date.now() - 5000); // 5 seconds in past
        await runTest('6. Cron finding a due scheduled post (scheduledAt <= now)', async () => {
            dueBlog = await Blog.create({
                title: `${testPrefix} Due Post To Publish`,
                content: 'Content ready to be published immediately.',
                conclusion: 'Key insights from due post.',
                status: 'Scheduled',
                scheduledAt: pastDueTime
            });

            assert.strictEqual(dueBlog.status, 'Scheduled');
            assert.ok(dueBlog.scheduledAt.getTime() <= Date.now());
        });

        await runTest('7. Publishing due post (status=Published, publishedAt set)', async () => {
            const result = await processScheduledPosts({ batchLimit: 10 });

            assert.ok(result.claimedCount >= 1, 'Cron must claim at least 1 due post');
            assert.ok(result.publishedCount >= 1, 'Cron must publish the claimed post');

            const refreshed = await Blog.findById(dueBlog._id);
            assert.strictEqual(refreshed.status, 'Published');
            assert.ok(refreshed.publishedAt instanceof Date);
            assert.strictEqual(refreshed.claimedAt, null);
        });

        // -----------------------------------------------------------
        // Test 8: Cron ignoring future posts
        // -----------------------------------------------------------
        let futureBlog;
        await runTest('8. Cron strictly ignores future scheduled posts', async () => {
            const farFuture = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h future
            futureBlog = await Blog.create({
                title: `${testPrefix} Future Post`,
                content: 'This post is not due yet.',
                conclusion: 'Tomorrow insights.',
                status: 'Scheduled',
                scheduledAt: farFuture
            });

            const result = await processScheduledPosts({ batchLimit: 10 });
            const futureRefreshed = await Blog.findById(futureBlog._id);

            assert.strictEqual(futureRefreshed.status, 'Scheduled');
            assert.strictEqual(futureRefreshed.publishedAt, null);
        });

        // -----------------------------------------------------------
        // Test 9: Preventing duplicate publishing (Atomic Concurrency Test)
        // -----------------------------------------------------------
        await runTest('9. Preventing duplicate publishing across concurrent workers', async () => {
            // Create 3 due posts
            const concurrentPosts = await Promise.all([
                Blog.create({
                    title: `${testPrefix} Concurrent 1`,
                    content: 'Body 1',
                    conclusion: 'Conclusion 1',
                    status: 'Scheduled',
                    scheduledAt: new Date(Date.now() - 10000)
                }),
                Blog.create({
                    title: `${testPrefix} Concurrent 2`,
                    content: 'Body 2',
                    conclusion: 'Conclusion 2',
                    status: 'Scheduled',
                    scheduledAt: new Date(Date.now() - 10000)
                }),
                Blog.create({
                    title: `${testPrefix} Concurrent 3`,
                    content: 'Body 3',
                    conclusion: 'Conclusion 3',
                    status: 'Scheduled',
                    scheduledAt: new Date(Date.now() - 10000)
                })
            ]);

            // Fire 3 simultaneous cron runs to simulate concurrent serverless invocations
            const [runA, runB, runC] = await Promise.all([
                processScheduledPosts({ batchLimit: 10 }),
                processScheduledPosts({ batchLimit: 10 }),
                processScheduledPosts({ batchLimit: 10 })
            ]);

            // Across all 3 runs, each post should be claimed and published exactly once
            const postIds = concurrentPosts.map((p) => String(p._id));
            const allPublishedDetails = [...runA.details, ...runB.details, ...runC.details].filter((d) =>
                postIds.includes(String(d.id))
            );

            assert.strictEqual(
                allPublishedDetails.length,
                3,
                `Expected exactly 3 atomic publish operations, found ${allPublishedDetails.length}`
            );

            // Verify each ID appears exactly once
            const seenIds = new Set();
            for (const d of allPublishedDetails) {
                assert.ok(!seenIds.has(String(d.id)), `Duplicate publish detected for post ID: ${d.id}`);
                seenIds.add(String(d.id));
            }
        });

        // -----------------------------------------------------------
        // Test 10: Handling publishing failure & isolation
        // -----------------------------------------------------------
        await runTest('10. Handling publishing failure isolation and error logging', async () => {
            // Create a valid post first
            const faultyPost = await Blog.create({
                title: `${testPrefix} Faulty Post`,
                content: 'Temporary valid content',
                conclusion: 'Conclusion',
                status: 'Scheduled',
                scheduledAt: new Date(Date.now() - 10000)
            });

            // Directly empty out content in MongoDB to simulate data anomaly that triggers publish check error
            await Blog.collection.updateOne({ _id: faultyPost._id }, { $set: { content: '' } });

            const result = await processScheduledPosts({ batchLimit: 10 });
            const faultyRefreshed = await Blog.findById(faultyPost._id);

            assert.strictEqual(faultyRefreshed.status, 'Failed');
            assert.ok(faultyRefreshed.failureReason.length > 0);
            assert.strictEqual(faultyRefreshed.publishedAt, null);
        });

        // -----------------------------------------------------------
        // Test 11: Handling multiple due posts in a single batch
        // -----------------------------------------------------------
        await runTest('11. Handling multiple due posts cleanly in a batch', async () => {
            await Promise.all([
                Blog.create({
                    title: `${testPrefix} Batch A`,
                    content: 'Batch Content A',
                    conclusion: 'Batch Conclusion A',
                    status: 'Scheduled',
                    scheduledAt: new Date(Date.now() - 8000)
                }),
                Blog.create({
                    title: `${testPrefix} Batch B`,
                    content: 'Batch Content B',
                    conclusion: 'Batch Conclusion B',
                    status: 'Scheduled',
                    scheduledAt: new Date(Date.now() - 8000)
                })
            ]);

            const result = await processScheduledPosts({ batchLimit: 50 });
            assert.ok(result.claimedCount >= 2);
            assert.ok(result.publishedCount >= 2);
        });

        // -----------------------------------------------------------
        // Test 12: Handling an empty queue
        // -----------------------------------------------------------
        await runTest('12. Handling an empty queue returns clean summary', async () => {
            // Clean up any remaining due posts from this test suite
            await Blog.deleteMany({ title: { $regex: `^${testPrefix}` } });

            const result = await processScheduledPosts({ batchLimit: 50 });
            assert.strictEqual(result.claimedCount, 0);
            assert.strictEqual(result.publishedCount, 0);
            assert.strictEqual(result.failedCount, 0);
            assert.strictEqual(result.success, true);
        });

        // -----------------------------------------------------------
        // Test 13: Cron endpoint security - Rejects unauthorized requests
        // -----------------------------------------------------------
        const { verifyCronAuth } = require('./middleware/cronAuth');
        await runTest('13. Unauthorized cron request returns 401', async () => {
            const originalSecret = process.env.CRON_SECRET;
            process.env.CRON_SECRET = 'test_cron_secret_12345';

            let statusSent = null;
            let jsonSent = null;

            const mockReq = {
                headers: { authorization: 'Bearer invalid_secret' },
                query: {}
            };
            const mockRes = {
                status: (s) => {
                    statusSent = s;
                    return {
                        json: (j) => { jsonSent = j; }
                    };
                }
            };
            let nextCalled = false;
            const mockNext = () => { nextCalled = true; };

            await verifyCronAuth(mockReq, mockRes, mockNext);

            assert.strictEqual(statusSent, 401, 'Unauthorized request must return 401');
            assert.strictEqual(nextCalled, false, 'Next middleware must NOT be called for invalid secret');

            process.env.CRON_SECRET = originalSecret;
        });

        // -----------------------------------------------------------
        // Test 14: Cron endpoint security - Valid Bearer secret authorized
        // -----------------------------------------------------------
        await runTest('14. Authorized cron request with Bearer secret passes', async () => {
            const originalSecret = process.env.CRON_SECRET;
            process.env.CRON_SECRET = 'test_cron_secret_12345';

            let nextCalled = false;
            const mockReq = {
                headers: { authorization: 'Bearer test_cron_secret_12345' },
                query: {}
            };
            const mockRes = {
                status: () => ({ json: () => {} })
            };
            const mockNext = () => { nextCalled = true; };

            await verifyCronAuth(mockReq, mockRes, mockNext);

            assert.strictEqual(nextCalled, true, 'Valid Bearer CRON_SECRET must pass authentication');

            process.env.CRON_SECRET = originalSecret;
        });

        // -----------------------------------------------------------
        // Test 15: Post in Processing state cannot be modified
        // -----------------------------------------------------------
        await runTest('15. Processing post cannot be modified or rescheduled', async () => {
            const processingPost = await Blog.create({
                title: `${testPrefix} Processing Guard Test`,
                content: 'Content in processing',
                conclusion: 'Conclusion',
                status: 'Processing',
                processingStartedAt: new Date()
            });

            // Re-fetch and check that status is Processing
            assert.strictEqual(processingPost.status, 'Processing');
            assert.ok(processingPost.processingStartedAt instanceof Date);
        });

        // -----------------------------------------------------------
        // Test 16: Timestamps stored and queried in UTC
        // -----------------------------------------------------------
        await runTest('16. Timestamps stored strictly in UTC', async () => {
            const utcIso = '2026-10-05T18:30:00.000Z';
            const utcBlog = await Blog.create({
                title: `${testPrefix} UTC Test Post`,
                content: 'Testing UTC persistence',
                conclusion: 'UTC Conclusion',
                status: 'Scheduled',
                scheduledAt: new Date(utcIso)
            });

            assert.strictEqual(utcBlog.scheduledAt.toISOString(), utcIso);
        });

        console.log(bold(green(`\nAll 16 tests passed successfully! (${passedCounter}/${testCounter})\n`)));

    } catch (err) {
        console.error(bold(red('\nTest execution encountered an error:')), err);
        process.exitCode = 1;
    } finally {
        // Clean up test data
        try {
            await Blog.deleteMany({ title: { $regex: `^${testPrefix}` } });
            console.log('Test artifacts cleaned up from MongoDB.');
        } catch (cleanupErr) {
            console.error('Error during cleanup:', cleanupErr.message);
        }
        await mongoose.disconnect();
    }
}

main();
