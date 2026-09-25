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
Respond with ONLY a valid JSON object containing these exact fields:
{
  "title": "A compelling, professional blog title",
  "content": "Comprehensive, multi-paragraph blog body explaining key concepts, architectures, and practical tips",
  "tags": ["Array", "Of", "3-5", "Keywords"],
  "conclusion": "A concise summary paragraph highlighting key takeaways"
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

        res.json({
            title: aiResult.title || '',
            content: aiResult.content || '',
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

// Get published blogs (supports search by title/keywords/tags and tag filtering)
router.get('/', async (req, res) => {
    try {
        const { search, tag } = req.query;
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

        const blogs = await Blog.find(query).sort({ createdAt: -1 });
        res.json(blogs);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving blogs', error: error.message });
    }
});

// Get all blogs for admin dashboard (Draft + Published)
// NOTE: Must be defined before /:id route
router.get('/admin/all', protect, async (req, res) => {
    try {
        const blogs = await Blog.find().sort({ createdAt: -1 });
        res.json(blogs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create new blog (Protected)
router.post('/', protect, async (req, res) => {
    try {
        const { title, content, tags, conclusion, status } = req.body;

        if (!title || !content || !conclusion) {
            return res.status(400).json({ message: 'Please fill in all required fields' });
        }

        const formattedTags = Array.isArray(tags)
            ? tags
            : typeof tags === 'string'
                ? tags.split(',').map((t) => t.trim()).filter(Boolean)
                : [];

        const newBlog = new Blog({
            title,
            content,
            tags: formattedTags,
            conclusion,
            status: status || 'Draft'
        });

        const savedBlog = await newBlog.save();
        res.status(201).json(savedBlog);
    } catch (error) {
        res.status(500).json({ message: 'Error creating blog', error: error.message });
    }
});

// Update blog (Protected)
router.put('/:id', protect, async (req, res) => {
    try {
        const { title, content, tags, conclusion, status } = req.body;

        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (content !== undefined) updateData.content = content;
        if (conclusion !== undefined) updateData.conclusion = conclusion;
        if (status !== undefined) updateData.status = status;
        if (tags !== undefined) {
            updateData.tags = Array.isArray(tags)
                ? tags
                : typeof tags === 'string'
                    ? tags.split(',').map((t) => t.trim()).filter(Boolean)
                    : [];
        }

        const updatedBlog = await Blog.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedBlog) {
            return res.status(404).json({ message: 'Blog not found' });
        }

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

// Get single blog by ID (Public)
router.get('/:id', async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }
        res.json(blog);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
