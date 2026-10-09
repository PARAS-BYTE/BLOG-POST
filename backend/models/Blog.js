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
    images: {
        type: [String],
        default: []
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
    },
    publishedAt: {
        type: Date,
        default: null
    },
    likes: {
        type: Number,
        default: 0
    },
    likedBy: {
        type: [String],
        default: []
    },
    views: {
        type: Number,
        default: 0
    },
    comments: [
        {
            name: {
                type: String,
                required: true,
                trim: true
            },
            content: {
                type: String,
                required: true,
                trim: true
            },
            createdAt: {
                type: Date,
                default: Date.now
            }
        }
    ]
}, {
    timestamps: true
});

module.exports = mongoose.model('Blog', blogSchema);