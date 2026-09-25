const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        required: true
    },
    imageUrl: {
        type: String,
        default: ''
    },
    tags: {
        type: [String],
        default: []
    },
    conclusion: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Draft', 'Published'],
        default: 'Draft'
    }
}, {
    timestamps: true // Automatically manages createdAt and updatedAt
});

module.exports = mongoose.model('Blog', blogSchema);