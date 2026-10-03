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
        enum: ['Draft', 'Scheduled', 'Processing', 'Published', 'Failed'],
        default: 'Draft'
    },
    scheduledAt: {
        type: Date,
        default: null
    },
    publishedAt: {
        type: Date,
        default: null
    },
    claimedAt: {
        type: Date,
        default: null
    },
    processingStartedAt: {
        type: Date,
        default: null
    },
    failureReason: {
        type: String,
        default: ''
    }
}, {
    timestamps: true // Automatically manages createdAt and updatedAt
});

// Compound index for optimal scheduler queries
blogSchema.index({ status: 1, scheduledAt: 1 });

module.exports = mongoose.model('Blog', blogSchema);