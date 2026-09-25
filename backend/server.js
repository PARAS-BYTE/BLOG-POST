const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const blogRoutes = require('./routes/blogRoutes');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch((err) => console.log('DB Connection Error:', err));

// Test Route
app.get('/', (req, res) => {
    res.send('Utsanova Blog API is running...');
});

app.use('/api/blogs', blogRoutes);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));