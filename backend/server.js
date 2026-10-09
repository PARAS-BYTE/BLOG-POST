require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const blogRoutes = require('./routes/blogRoutes');
const authRoutes = require('./routes/authRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();

// Middleware
app.use(express.json());
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