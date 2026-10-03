const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const blogRoutes = require('./routes/blogRoutes');
const authRoutes = require('./routes/authRoutes');
const cronRoutes = require('./routes/cronRoutes');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Database Connection
if (process.env.MONGO_URI) {
    mongoose.connect(process.env.MONGO_URI)
        .then(() => console.log('MongoDB Connected'))
        .catch((err) => console.log('DB Connection Error:', err));
}

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
app.use('/api/cron', cronRoutes);

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
const { processScheduledPosts } = require('./services/schedulerService');

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

    // Automated background scheduler for local dev, Docker, and standalone server environments.
    // Publishes due scheduled posts automatically with ZERO manual intervention.
    const SCHEDULER_INTERVAL_MS = 30 * 1000; // Check every 30 seconds
    setInterval(async () => {
        try {
            await processScheduledPosts({ batchLimit: 50 });
        } catch (autoErr) {
            console.error('[AutoScheduler] Error during automatic tick:', autoErr.message);
        }
    }, SCHEDULER_INTERVAL_MS);
    console.log('[AutoScheduler] Automated background publisher started (checking every 30s)');
}

module.exports = app;