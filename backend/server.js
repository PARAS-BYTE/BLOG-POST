require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const blogRoutes = require('./routes/blogRoutes');
const authRoutes = require('./routes/authRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();

// Middleware - Allow up to 10MB JSON and URL-encoded payloads for rich articles & attachments
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Error handling middleware for payload too large and malformed request bodies
app.use((err, req, res, next) => {
    if (err && (err.status === 413 || err.type === 'entity.too.large')) {
        return res.status(413).json({
            message: 'Request payload too large (413). Attached pictures or content exceed the upload size limit. Please compress images or configure Cloudinary on Vercel.'
        });
    }
    next(err);
});

app.use(cors());

const { connectDB } = require('./config/db');

// Database Connection
connectDB();

const path = require('path');
const fs = require('fs');

// Health Check Route
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Utsanova Blog API is running...' });
});

// API Routes
app.use('/api/blogs', blogRoutes);
app.use('/api/posts', blogRoutes); // Alias for spec route consistency
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);

// Static frontend serving (for single-container production / Docker)
const publicDistPath = path.join(__dirname, 'public');
const localDistPath = path.join(__dirname, '../frontend/dist');
const staticPath = fs.existsSync(publicDistPath) ? publicDistPath : (fs.existsSync(localDistPath) ? localDistPath : null);

if (staticPath) {
    app.use(express.static(staticPath));
    // SPA catch-all (Express 5 compatible)
    app.use((req, res, next) => {
        if (req.method === 'GET' && !req.path.startsWith('/api')) {
            return res.sendFile(path.join(staticPath, 'index.html'));
        }
        next();
    });
} else {
    app.get('/', (req, res) => {
        res.send('Utsanova Blog API is running...');
    });
}

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;