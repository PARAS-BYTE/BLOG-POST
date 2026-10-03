const express = require('express');
const router = express.Router();
const { verifyCronAuth } = require('../middleware/cronAuth');
const { processScheduledPosts } = require('../services/schedulerService');
const Blog = require('../models/Blog');

/**
 * @desc    Process and publish due scheduled blog posts
 * @route   GET /api/cron/publish-scheduled-posts
 * @route   POST /api/cron/publish-scheduled-posts
 * @access  Protected via CRON_SECRET or Admin Token
 */
const handlePublishCron = async (req, res) => {
    try {
        const batchLimit = parseInt(req.query.limit, 10) || 50;
        const result = await processScheduledPosts({ batchLimit });
        return res.status(200).json(result);
    } catch (error) {
        console.error('[CronRoutes] Execution error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to process scheduled blog posts',
            error: error.message
        });
    }
};

router.get('/publish-scheduled-posts', verifyCronAuth, handlePublishCron);
router.post('/publish-scheduled-posts', verifyCronAuth, handlePublishCron);

/**
 * @desc    Get queue inspection and stats for scheduled blog posts
 * @route   GET /api/cron/queue-status
 * @access  Protected via CRON_SECRET or Admin Token
 */
router.get('/queue-status', verifyCronAuth, async (req, res) => {
    try {
        const now = new Date();
        const [scheduledCount, dueCount, processingCount, failedCount, publishedCount] = await Promise.all([
            Blog.countDocuments({ status: 'Scheduled' }),
            Blog.countDocuments({ status: 'Scheduled', scheduledAt: { $lte: now } }),
            Blog.countDocuments({ status: 'Processing' }),
            Blog.countDocuments({ status: 'Failed' }),
            Blog.countDocuments({ status: 'Published' })
        ]);

        const nextDuePost = await Blog.findOne({ status: 'Scheduled' })
            .sort({ scheduledAt: 1 })
            .select('title scheduledAt status');

        res.json({
            serverTimeUTC: now.toISOString(),
            stats: {
                totalScheduled: scheduledCount,
                currentlyDue: dueCount,
                processing: processingCount,
                failed: failedCount,
                published: publishedCount
            },
            nextDuePost
        });
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving queue status', error: error.message });
    }
});

module.exports = router;
