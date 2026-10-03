const Blog = require('../models/Blog');

/**
 * Core scheduled posts processing engine.
 * 
 * Guarantees:
 * 1. Atomic claim mechanism prevents duplicate execution / double publishing across concurrent serverless instances.
 * 2. Stuck job recovery: any job stalled in 'Processing' for longer than lockTimeoutMinutes is automatically reclaimed.
 * 3. Individual post failure isolation: an error in one post does not abort the processing of others.
 * 4. Comprehensive logging of claimed, published, failed, and duration without sensitive data.
 * 
 * @param {Object} options
 * @param {number} [options.batchLimit=50] - Maximum posts to process in one execution
 * @param {number} [options.lockTimeoutMinutes=5] - Minutes after which a 'Processing' post is considered crashed/stale
 * @returns {Promise<Object>} Execution summary
 */
async function processScheduledPosts(options = {}) {
    const startTime = Date.now();
    const now = new Date();
    const batchLimit = Math.max(1, options.batchLimit || 50);
    const lockTimeoutMinutes = Math.max(1, options.lockTimeoutMinutes || 5);
    const lockThreshold = new Date(now.getTime() - lockTimeoutMinutes * 60 * 1000);

    console.log(`[Scheduler] Invocation started at ${now.toISOString()}`);

    const claimedPosts = [];

    // Atomically claim eligible posts one-by-one up to batchLimit
    // An eligible post is either:
    // (a) status === 'Scheduled' and scheduledAt <= now
    // (b) status === 'Processing' and claimedAt <= lockThreshold (stale/crashed worker recovery)
    for (let i = 0; i < batchLimit; i++) {
        try {
            const claimed = await Blog.findOneAndUpdate(
                {
                    $or: [
                        {
                            status: 'Scheduled',
                            scheduledAt: { $lte: now }
                        },
                        {
                            status: 'Processing',
                            claimedAt: { $lte: lockThreshold }
                        }
                    ]
                },
                {
                    $set: {
                        status: 'Processing',
                        claimedAt: now
                    }
                },
                {
                    returnDocument: 'after'
                }
            );

            if (!claimed) {
                // No more due posts waiting to be claimed
                break;
            }

            claimedPosts.push(claimed);
        } catch (claimErr) {
            console.error('[Scheduler] Error during atomic claim:', claimErr.message);
            break;
        }
    }

    console.log(`[Scheduler] Claimed ${claimedPosts.length} post(s) for processing.`);

    let publishedCount = 0;
    let failedCount = 0;
    const details = [];

    for (const post of claimedPosts) {
        try {
            // Validate essential fields before publishing
            if (!post.title || !post.content) {
                throw new Error('Post is missing required title or content');
            }

            const publishDate = new Date();

            await Blog.findByIdAndUpdate(post._id, {
                $set: {
                    status: 'Published',
                    publishedAt: publishDate,
                    failureReason: ''
                },
                $unset: {
                    claimedAt: 1
                }
            });

            publishedCount++;
            details.push({
                id: post._id,
                title: post.title,
                status: 'Published',
                scheduledAt: post.scheduledAt,
                publishedAt: publishDate
            });
            console.log(`[Scheduler] Successfully published "${post.title}" (ID: ${post._id})`);
        } catch (publishErr) {
            failedCount++;
            const errorMessage = publishErr.message || 'Unknown publishing error';
            console.error(`[Scheduler] Failed to publish post "${post._id}": ${errorMessage}`);

            await Blog.findByIdAndUpdate(post._id, {
                $set: {
                    status: 'Failed',
                    failureReason: errorMessage
                },
                $unset: {
                    claimedAt: 1
                }
            });

            details.push({
                id: post._id,
                title: post.title,
                status: 'Failed',
                error: errorMessage
            });
        }
    }

    const durationMs = Date.now() - startTime;
    console.log(`[Scheduler] Invocation finished in ${durationMs}ms: claimed=${claimedPosts.length}, published=${publishedCount}, failed=${failedCount}`);

    return {
        success: true,
        timestamp: now.toISOString(),
        claimedCount: claimedPosts.length,
        publishedCount,
        failedCount,
        durationMs,
        details
    };
}

module.exports = {
    processScheduledPosts
};
