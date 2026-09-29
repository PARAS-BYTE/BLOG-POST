const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const blogRoutes = require('./routes/blogRoutes');
const authRoutes = require('./routes/authRoutes');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch((err) => console.log('DB Connection Error:', err));

const path = require('path');
const fs = require('fs');

// Health Check Route
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Utsanova Blog API is running...' });
});

// API Routes
app.use('/api/blogs', blogRoutes);
app.use('/api/auth', authRoutes);

// Static frontend serving (for single-container production / Docker)
const publicDistPath = path.join(__dirname, 'public');
const localDistPath = path.join(__dirname, '../frontend/dist');
const staticPath = fs.existsSync(publicDistPath) ? publicDistPath : (fs.existsSync(localDistPath) ? localDistPath : null);

if (staticPath) {
    app.use(express.static(staticPath));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) {
            return next();
        }
        res.sendFile(path.join(staticPath, 'index.html'));
    });
} else {
    app.get('/', (req, res) => {
        res.send('Utsanova Blog API is running...');
    });
}
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));