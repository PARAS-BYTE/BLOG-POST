const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');
const { protect } = require('../middleware/authMiddleware');

// Get published blogs (with search and tag filter)
router.get('/', async (req, res) => {
    try {
        const { search, tag } = req.query;
        let query = { status: 'Published' };

        if (tag) {
            query.tags = tag;
        }

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } }
            ];
        }

        const blogs = await Blog.find(query).sort({ createdAt: -1 });
        res.json(blogs);
    } catch (error) {
        res.status(500).json({ message: error.message });
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
