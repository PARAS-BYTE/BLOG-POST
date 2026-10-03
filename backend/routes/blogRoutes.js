const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');
const { protect } = require('../middleware/authMiddleware');
const Groq = require('groq-sdk');

// Generate Blog Content with AI using Groq (Protected)
// Note: This endpoint does NOT save the blog to MongoDB; it only provides
// pre-filled draft values (title, content, tags, conclusion) for the user to review.
router.post('/ai-generate', protect, async (req, res) => {
    try {
        const { topic } = req.body;

        if (!topic || !topic.trim()) {
            return res.status(400).json({ message: 'Please provide a topic or prompt for AI generation.' });
        }

        if (!process.env.GROQ_API_KEY) {
            return res.status(500).json({ message: 'GROQ_API_KEY is not configured in backend/.env' });
        }

        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

        const systemPrompt = `You are an expert technical blog writer for UTSANOVA Technologies.
Generate an engaging, educational, and well-structured blog post draft based on the user's prompt.
Format the "content" field using rich Markdown:
- Use clean section headers (## Section Title, ### Subsections)
- Use **bold** for key concepts and emphasis
- Use bullet points (- or *) for lists and key takeaways
- Include clean code snippets (\`\`\`language) if discussing code or architecture
- Write detailed, informative paragraphs with smooth transitions.

Respond with ONLY a valid JSON object containing these exact fields:
{
  "title": "A compelling, professional blog title",
  "content": "Comprehensive, multi-paragraph blog body formatted in rich Markdown",
  "tags": ["Array", "Of", "3-5", "Keywords"],
  "conclusion": "A concise summary highlighting key takeaways (can include bullet points or bold text in Markdown)"
}`;

        const completion = await groq.chat.completions.create({
            model: 'openai/gpt-oss-120b',
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Please create a blog post on the following topic: ${topic.trim()}` }
            ],
            temperature: 0.7
        });

        const rawJson = completion.choices[0]?.message?.content;
        const aiResult = JSON.parse(rawJson);

        // Curated dummy images for AI generated tech blogs
        const dummyTechImages = [
            "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=1200&q=80"
        ];
        const selectedDummyImage = dummyTechImages[Math.floor(Math.random() * dummyTechImages.length)];

        res.json({
            title: aiResult.title || '',
            content: aiResult.content || '',
            imageUrl: selectedDummyImage,
            tags: Array.isArray(aiResult.tags) ? aiResult.tags : [],
            conclusion: aiResult.conclusion || ''
        });
    } catch (error) {
        console.error('Groq AI Generation Error:', error);
        res.status(500).json({
            message: 'Failed to generate blog content with AI',
            error: error.message
        });
    }
});

// Get published blogs (supports search, tag filtering, and pagination)
router.get('/', async (req, res) => {
    try {
        const { search, tag, page, limit, all } = req.query;
        let query = { status: 'Published' };

        // Filter by exact tag if clicked by user (case-insensitive)
        if (tag && tag.trim()) {
            query.tags = { $regex: new RegExp(`^${tag.trim()}$`, 'i') };
        }

        // Search across Title, Body Content keywords, and Tags
        if (search && search.trim()) {
            const searchRegex = { $regex: search.trim(), $options: 'i' };
            query.$or = [
                { title: searchRegex },
                { content: searchRegex },
                { tags: searchRegex }
            ];
        }

        // If client explicitly requests all blogs without pagination
        if (all === 'true') {
            const blogs = await Blog.find(query).sort({ publishedAt: -1, createdAt: -1 });
            return res.json(blogs);
        }

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 6));
        const skip = (pageNum - 1) * limitNum;

        const totalBlogs = await Blog.countDocuments(query);
        const totalPages = Math.max(1, Math.ceil(totalBlogs / limitNum));

        const blogs = await Blog.find(query)
            .sort({ publishedAt: -1, createdAt: -1 })
            .skip(skip)
            .limit(limitNum);

        // Fetch distinct tags across all published blogs for filter bar
        const allPublishedTags = await Blog.distinct('tags', { status: 'Published' });

        res.json({
            blogs,
            totalBlogs,
            totalPages,
            currentPage: pageNum,
            limit: limitNum,
            hasMore: pageNum < totalPages,
            tags: allPublishedTags.filter(Boolean)
        });
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving blogs', error: error.message });
    }
});

// Get all blogs for admin dashboard (Draft + Scheduled + Published + Failed, with search & filtering)
// NOTE: Must be defined before /:id route
router.get('/admin/all', protect, async (req, res) => {
    try {
        const { search, page, limit, status } = req.query;
        let query = {};

        // Filter by status if provided (and not ALL)
        if (status && status !== 'ALL') {
            query.status = status;
        }

        if (search && search.trim()) {
            const searchRegex = { $regex: search.trim(), $options: 'i' };
            query.$or = [
                { title: searchRegex },
                { content: searchRegex },
                { tags: searchRegex }
            ];
        }

        if (page || limit) {
            const pageNum = Math.max(1, parseInt(page, 10) || 1);
            const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
            const skip = (pageNum - 1) * limitNum;

            const totalBlogs = await Blog.countDocuments(query);
            const totalPages = Math.max(1, Math.ceil(totalBlogs / limitNum));

            const blogs = await Blog.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum);

            return res.json({
                blogs,
                totalBlogs,
                totalPages,
                currentPage: pageNum,
                limit: limitNum
            });
        }

        const blogs = await Blog.find(query).sort({ createdAt: -1 });
        res.json(blogs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Schedule a blog post (Protected)
// POST /api/blogs/:id/schedule
router.post('/:id/schedule', protect, async (req, res) => {
    try {
        const { scheduledAt } = req.body;

        if (!scheduledAt) {
            return res.status(400).json({ message: 'scheduledAt date and time is required.' });
        }

        const scheduledDate = new Date(scheduledAt);
        if (isNaN(scheduledDate.getTime())) {
            return res.status(400).json({ message: 'Invalid scheduledAt date format. Must be a valid date/time.' });
        }

        const now = new Date();
        if (scheduledDate <= now) {
            return res.status(400).json({ message: 'Scheduled publishing time must be in the future.' });
        }

        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        if (blog.status === 'Processing') {
            return res.status(409).json({ message: 'Post is currently being processed and cannot be scheduled.' });
        }

        if (blog.status === 'Published') {
            return res.status(400).json({ message: 'This post is already published.' });
        }

        blog.status = 'Scheduled';
        blog.scheduledAt = scheduledDate;
        blog.failureReason = '';
        blog.claimedAt = null;
        blog.processingStartedAt = null;

        const updatedBlog = await blog.save();
        console.log(`[BlogRoutes] Blog "${blog.title}" scheduled for ${scheduledDate.toISOString()}`);
        res.json(updatedBlog);
    } catch (error) {
        res.status(500).json({ message: 'Error scheduling blog', error: error.message });
    }
});

// Cancel scheduling and revert to Draft (Protected)
// POST /api/blogs/:id/cancel-schedule
router.post('/:id/cancel-schedule', protect, async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        if (blog.status === 'Processing') {
            return res.status(409).json({ message: 'Post is currently being processed and cannot be cancelled.' });
        }

        if (blog.status === 'Published') {
            return res.status(400).json({ message: 'Cannot cancel schedule for an already published post.' });
        }

        blog.status = 'Draft';
        blog.scheduledAt = null;
        blog.failureReason = '';
        blog.claimedAt = null;
        blog.processingStartedAt = null;

        const updatedBlog = await blog.save();
        console.log(`[BlogRoutes] Schedule cancelled for "${blog.title}". Reverted to Draft.`);
        res.json(updatedBlog);
    } catch (error) {
        res.status(500).json({ message: 'Error cancelling schedule', error: error.message });
    }
});

// Create new blog (Protected)
router.post('/', protect, async (req, res) => {
    try {
        const { title, content, imageUrl, tags, conclusion, status, scheduledAt } = req.body;

        if (!title || !content || !conclusion) {
            return res.status(400).json({ message: 'Please fill in all required fields' });
        }

        let blogStatus = status || 'Draft';
        let parsedScheduledAt = null;
        let publishedAt = null;

        if (blogStatus === 'Scheduled') {
            if (!scheduledAt) {
                return res.status(400).json({ message: 'scheduledAt is required when creating a scheduled post.' });
            }
            parsedScheduledAt = new Date(scheduledAt);
            if (isNaN(parsedScheduledAt.getTime())) {
                return res.status(400).json({ message: 'Invalid scheduledAt format.' });
            }
            if (parsedScheduledAt <= new Date()) {
                return res.status(400).json({ message: 'Scheduled time must be in the future.' });
            }
        } else if (blogStatus === 'Published') {
            publishedAt = new Date();
        }

        const formattedTags = Array.isArray(tags)
            ? tags
            : typeof tags === 'string'
                ? tags.split(',').map((t) => t.trim()).filter(Boolean)
                : [];

        const newBlog = new Blog({
            title: title.trim(),
            content: content.trim(),
            imageUrl: imageUrl ? imageUrl.trim() : '',
            tags: formattedTags,
            conclusion: conclusion.trim(),
            status: blogStatus,
            scheduledAt: parsedScheduledAt,
            publishedAt,
            failureReason: ''
        });

        const savedBlog = await newBlog.save();
        res.status(201).json(savedBlog);
    } catch (error) {
        res.status(500).json({ message: 'Error creating blog', error: error.message });
    }
});

// Update blog (Protected)
// Safe editing for scheduled, draft, and published blogs
router.put('/:id', protect, async (req, res) => {
    try {
        const { title, content, imageUrl, tags, conclusion, status, scheduledAt } = req.body;

        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        if (blog.status === 'Processing') {
            return res.status(409).json({ message: 'Post is currently being processed and cannot be edited.' });
        }

        if (title !== undefined) blog.title = title.trim();
        if (content !== undefined) blog.content = content.trim();
        if (imageUrl !== undefined) blog.imageUrl = imageUrl.trim();
        if (conclusion !== undefined) blog.conclusion = conclusion.trim();
        if (tags !== undefined) {
            blog.tags = Array.isArray(tags)
                ? tags
                : typeof tags === 'string'
                    ? tags.split(',').map((t) => t.trim()).filter(Boolean)
                    : [];
        }

        // Handle publication status transitions
        if (status !== undefined) {
            blog.status = status;
            if (status === 'Published') {
                if (!blog.publishedAt) {
                    blog.publishedAt = new Date();
                }
                blog.scheduledAt = null;
                blog.failureReason = '';
                blog.claimedAt = null;
                blog.processingStartedAt = null;
            } else if (status === 'Draft') {
                blog.scheduledAt = null;
                blog.failureReason = '';
                blog.claimedAt = null;
                blog.processingStartedAt = null;
            }
        }

        // Handle explicit scheduledAt updates
        if (scheduledAt !== undefined) {
            if (scheduledAt === null || scheduledAt === '') {
                blog.scheduledAt = null;
                if (blog.status === 'Scheduled') {
                    blog.status = 'Draft';
                }
            } else {
                const parsedDate = new Date(scheduledAt);
                if (isNaN(parsedDate.getTime())) {
                    return res.status(400).json({ message: 'Invalid scheduledAt format.' });
                }
                if (parsedDate <= new Date()) {
                    return res.status(400).json({ message: 'Scheduled time must be in the future.' });
                }
                blog.scheduledAt = parsedDate;
                blog.status = 'Scheduled';
                blog.failureReason = '';
            }
        }

        const updatedBlog = await blog.save();
        res.json(updatedBlog);
    } catch (error) {
        res.status(500).json({ message: 'Error updating blog', error: error.message });
    }
});

// Delete blog (Protected)
router.delete('/:id', protect, async (req, res) => {
    try {
        const deletedBlog = await Blog.findByIdAndDelete(req.params.id);
        if (!deletedBlog) {
            return res.status(404).json({ message: 'Blog not found' });
        }
        res.json({ message: 'Blog deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting blog', error: error.message });
    }
});

// Get single blog by ID (Public with preview support)
router.get('/:id', async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        // If published, anyone can view it
        if (blog.status === 'Published') {
            return res.json(blog);
        }

        // If not published (Draft, Scheduled, Failed), check for admin authorization
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const jwt = require('jsonwebtoken');
                const token = authHeader.split(' ')[1];
                jwt.verify(token, process.env.JWT_SECRET);
                // Valid admin token, allow viewing draft/scheduled post preview
                return res.json(blog);
            } catch (err) {
                // Invalid token
            }
        }

        return res.status(404).json({ message: 'This article is not publicly available.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
