const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['superadmin', 'admin'],
        default: 'admin'
    },
    status: {
        type: String,
        enum: ['active', 'revoked'],
        default: 'active'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    permissions: {
        canCreateBlog: {
            type: Boolean,
            default: true
        },
        canEditBlog: {
            type: Boolean,
            default: true
        },
        canDeleteBlog: {
            type: Boolean,
            default: true
        },
        canUseAI: {
            type: Boolean,
            default: true
        },
        canScheduleBlog: {
            type: Boolean,
            default: true
        }
    }
}, {
    timestamps: true
});

// Automatically hash password before saving to the database (Updated for modern Mongoose)
adminSchema.pre('save', async function () {
    if (!this.isModified('password')) return;

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Helper method to compare passwords during login
adminSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Admin', adminSchema);