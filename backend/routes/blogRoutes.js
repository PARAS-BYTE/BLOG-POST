const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');
const { protect, checkPermission } = require('../middleware/authMiddleware');
const Groq = require('groq-sdk');

// Generate Blog Content with AI using Groq (Protected)
// Note: This endpoint does NOT save the blog to MongoDB; it only provides
// pre-filled draft values (title, content, tags, conclusion) for the user to review.
router.post('/ai-generate', protect, checkPermission('canUseAI'), async (req, res) => {
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
            images: [selectedDummyImage],
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

// Get published blogs (supports search, tag filtering, pagination, and sorting: latest, oldest, popular)
router.get('/', async (req, res) => {
    try {
        const { search, tag, page, limit, all, sort } = req.query;
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

        // Sort configuration: latest (default), oldest, popular (views & likes)
        let sortOption = { publishedAt: -1, createdAt: -1 };
        if (sort === 'oldest') {
            sortOption = { publishedAt: 1, createdAt: 1 };
        } else if (sort === 'popular') {
            sortOption = { views: -1, likes: -1, publishedAt: -1 };
        }

        // If client explicitly requests all blogs without pagination
        if (all === 'true') {
            const blogs = await Blog.find(query).sort(sortOption);
            return res.json(blogs);
        }

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 6));
        const skip = (pageNum - 1) * limitNum;

        const totalBlogs = await Blog.countDocuments(query);
        const totalPages = Math.max(1, Math.ceil(totalBlogs / limitNum));

        const blogs = await Blog.find(query)
            .sort(sortOption)
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

// Get popular posts sorted by views & likes (Feature 7)
router.get('/popular', async (req, res) => {
    try {
        const limitNum = Math.max(1, Math.min(20, parseInt(req.query.limit, 10) || 5));
        const blogs = await Blog.find({ status: 'Published' })
            .sort({ views: -1, likes: -1, publishedAt: -1 })
            .limit(limitNum);
        res.json(blogs);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving popular blogs', error: error.message });
    }
});

// Get recent published posts (Feature 8)
router.get('/recent', async (req, res) => {
    try {
        const limitNum = Math.max(1, Math.min(20, parseInt(req.query.limit, 10) || 5));
        const blogs = await Blog.find({ status: 'Published' })
            .sort({ publishedAt: -1, createdAt: -1 })
            .limit(limitNum);
        res.json(blogs);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving recent blogs', error: error.message });
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

// Create new blog (Protected)
router.post('/', protect, checkPermission('canCreateBlog'), async (req, res) => {
    try {
        const { title, content, imageUrl, images, tags, conclusion, status } = req.body;

        if (!title || !content || !conclusion) {
            return res.status(400).json({ message: 'Please fill in all required fields' });
        }

        const blogStatus = status === 'Published' ? 'Published' : 'Draft';
        const publishedAt = blogStatus === 'Published' ? new Date() : null;

        const formattedTags = Array.isArray(tags)
            ? tags
            : typeof tags === 'string'
                ? tags.split(',').map((t) => t.trim()).filter(Boolean)
                : [];

        let formattedImages = [];
        if (Array.isArray(images)) {
            formattedImages = images.map(img => typeof img === 'string' ? img.trim() : (img?.url || '')).filter(Boolean);
        } else if (typeof images === 'string' && images.trim()) {
            formattedImages = images.split(',').map((t) => t.trim()).filter(Boolean);
        }
        if (imageUrl && imageUrl.trim() && !formattedImages.includes(imageUrl.trim())) {
            formattedImages.unshift(imageUrl.trim());
        }
        const primaryImage = imageUrl ? imageUrl.trim() : (formattedImages[0] || '');

        const newBlog = new Blog({
            title: title.trim(),
            content: content.trim(),
            imageUrl: primaryImage,
            images: formattedImages,
            tags: formattedTags,
            conclusion: conclusion.trim(),
            status: blogStatus,
            publishedAt
        });

        const savedBlog = await newBlog.save();
        res.status(201).json(savedBlog);
    } catch (error) {
        res.status(500).json({ message: 'Error creating blog', error: error.message });
    }
});

// Update blog (Protected)
router.put('/:id', protect, checkPermission('canEditBlog'), async (req, res) => {
    try {
        const { title, content, imageUrl, images, tags, conclusion, status } = req.body;

        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        if (title !== undefined) blog.title = title.trim();
        if (content !== undefined) blog.content = content.trim();
        if (conclusion !== undefined) blog.conclusion = conclusion.trim();

        if (images !== undefined) {
            let formattedImages = [];
            if (Array.isArray(images)) {
                formattedImages = images.map(img => typeof img === 'string' ? img.trim() : (img?.url || '')).filter(Boolean);
            } else if (typeof images === 'string' && images.trim()) {
                formattedImages = images.split(',').map((t) => t.trim()).filter(Boolean);
            }
            if (imageUrl && imageUrl.trim() && !formattedImages.includes(imageUrl.trim())) {
                formattedImages.unshift(imageUrl.trim());
            }
            blog.images = formattedImages;
            if (!imageUrl && formattedImages.length > 0) {
                blog.imageUrl = formattedImages[0];
            }
        }

        if (imageUrl !== undefined) {
            blog.imageUrl = imageUrl.trim();
            if (blog.imageUrl && (!blog.images || blog.images.length === 0)) {
                blog.images = [blog.imageUrl];
            }
        }

        if (tags !== undefined) {
            blog.tags = Array.isArray(tags)
                ? tags
                : typeof tags === 'string'
                    ? tags.split(',').map((t) => t.trim()).filter(Boolean)
                    : [];
        }

        if (status !== undefined) {
            blog.status = status === 'Published' ? 'Published' : 'Draft';
            if (blog.status === 'Published' && !blog.publishedAt) {
                blog.publishedAt = new Date();
            }
        }

        const updatedBlog = await blog.save();
        res.json(updatedBlog);
    } catch (error) {
        res.status(500).json({ message: 'Error updating blog', error: error.message });
    }
});

// Delete blog (Protected)
router.delete('/:id', protect, checkPermission('canDeleteBlog'), async (req, res) => {
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

// Like / Unlike blog post (Feature 1)
// POST /api/blogs/:id/like
router.post('/:id/like', async (req, res) => {
    try {
        const { clientId } = req.body;
        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        const identifier = (clientId && String(clientId).trim()) || req.ip || 'anonymous';
        const likedBy = Array.isArray(blog.likedBy) ? blog.likedBy : [];
        const hasLiked = likedBy.includes(identifier);

        if (hasLiked) {
            // Unlike post
            blog.likedBy = likedBy.filter((id) => id !== identifier);
            blog.likes = Math.max(0, (blog.likes || 1) - 1);
        } else {
            // Like post
            blog.likedBy = [...likedBy, identifier];
            blog.likes = (blog.likes || 0) + 1;
        }

        await blog.save();
        res.json({
            likes: blog.likes,
            isLiked: !hasLiked,
            message: hasLiked ? 'Post unliked' : 'Post liked'
        });
    } catch (error) {
        res.status(500).json({ message: 'Error updating like status', error: error.message });
    }
});

// Add comment to blog post (Feature 2)
// POST /api/blogs/:id/comments
router.post('/:id/comments', async (req, res) => {
    try {
        const { name, content } = req.body;

        if (!name || !name.trim() || !content || !content.trim()) {
            return res.status(400).json({ message: 'Both your name and comment content are required.' });
        }

        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        const newComment = {
            name: name.trim(),
            content: content.trim(),
            createdAt: new Date()
        };

        if (!Array.isArray(blog.comments)) {
            blog.comments = [];
        }

        blog.comments.unshift(newComment);
        await blog.save();

        res.status(201).json({
            message: 'Comment posted successfully',
            comments: blog.comments,
            comment: newComment
        });
    } catch (error) {
        res.status(500).json({ message: 'Error adding comment', error: error.message });
    }
});

// Explicit view counter increment (Feature 3)
// POST /api/blogs/:id/view
router.post('/:id/view', async (req, res) => {
    try {
        const blog = await Blog.findByIdAndUpdate(
            req.params.id,
            { $inc: { views: 1 } },
            { returnDocument: 'after', select: 'views' }
        );
        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }
        res.json({ views: blog.views });
    } catch (error) {
        res.status(500).json({ message: 'Error updating view count', error: error.message });
    }
});

// Get related published posts for current blog (Feature 6)
// GET /api/blogs/:id/related
router.get('/:id/related', async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        const currentTags = Array.isArray(blog.tags) ? blog.tags : [];
        let relatedBlogs = [];

        // 1. Find published posts that share any tags
        if (currentTags.length > 0) {
            relatedBlogs = await Blog.find({
                _id: { $ne: blog._id },
                status: 'Published',
                tags: { $in: currentTags }
            })
            .sort({ publishedAt: -1, createdAt: -1 })
            .limit(3);
        }

        // 2. If fewer than 3, backfill with newest published posts
        if (relatedBlogs.length < 3) {
            const excludeIds = [blog._id, ...relatedBlogs.map((b) => b._id)];
            const backfill = await Blog.find({
                _id: { $nin: excludeIds },
                status: 'Published'
            })
            .sort({ publishedAt: -1, createdAt: -1 })
            .limit(3 - relatedBlogs.length);

            relatedBlogs = [...relatedBlogs, ...backfill];
        }

        res.json(relatedBlogs);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving related blogs', error: error.message });
    }
});

// Get single blog by ID (Public with preview support + auto view counter)
router.get('/:id', async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        // If published, anyone can view it; increment views
        if (blog.status === 'Published') {
            Blog.findByIdAndUpdate(blog._id, { $inc: { views: 1 } }).exec().catch(() => {});
            blog.views = (blog.views || 0) + 1;
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
