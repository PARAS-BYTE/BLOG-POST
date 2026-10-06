const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');
const { protect, requireSuperAdmin } = require('../middleware/authMiddleware');

// Helper function to generate JWT token (expires in 1 day)
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1d' });
};

// @desc    Admin / SuperAdmin login
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        const admin = await Admin.findOne({ email: email.toLowerCase().trim() });

        if (admin && (await admin.matchPassword(password))) {
            // Check if account has been revoked by SuperAdmin
            if (admin.status === 'revoked' || admin.isActive === false) {
                return res.status(403).json({
                    message: 'Account access has been revoked by the SuperAdmin. Please contact your SuperAdministrator.',
                    isRevoked: true
                });
            }

            res.json({
                _id: admin._id,
                email: admin.email,
                role: admin.role || 'admin',
                status: admin.status || 'active',
                isActive: admin.isActive !== false,
                permissions: admin.permissions || {
                    canCreateBlog: true,
                    canEditBlog: true,
                    canDeleteBlog: true,
                    canUseAI: true,
                    canScheduleBlog: true
                },
                token: generateToken(admin._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error during login', error: error.message });
    }
});

// @desc    Get current logged in admin profile
// @route   GET /api/auth/me
// @access  Protected
router.get('/me', protect, async (req, res) => {
    try {
        res.json({
            _id: req.admin._id,
            email: req.admin.email,
            role: req.admin.role || 'admin',
            status: req.admin.status || 'active',
            isActive: req.admin.isActive !== false,
            permissions: req.admin.permissions || {
                canCreateBlog: true,
                canEditBlog: true,
                canDeleteBlog: true,
                canUseAI: true,
                canScheduleBlog: true
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Create a new admin account (Restricted to SuperAdmin only, unless zero accounts exist)
// @route   POST /api/auth/register
// @access  SuperAdmin Only (Bootstrap allowed if 0 accounts exist)
router.post('/register', async (req, res) => {
    try {
        const { email, password, role, permissions } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide both email and password' });
        }

        const adminCount = await Admin.countDocuments();

        // If at least one admin already exists, enforce SuperAdmin authentication
        if (adminCount > 0) {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({
                    message: 'Not authorized. Only SuperAdmin can create new administrator accounts.'
                });
            }

            try {
                const token = authHeader.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const requestingUser = await Admin.findById(decoded.id);

                if (!requestingUser || requestingUser.role !== 'superadmin') {
                    return res.status(403).json({
                        message: 'Access forbidden: Only the SuperAdmin can create new admin accounts.'
                    });
                }
            } catch (err) {
                return res.status(401).json({ message: 'Invalid authentication token.' });
            }
        }

        const normalizedEmail = email.toLowerCase().trim();
        const adminExists = await Admin.findOne({ email: normalizedEmail });
        if (adminExists) {
            return res.status(400).json({ message: 'An account with this email already exists' });
        }

        // Determine assigned role: if first account in system, default to superadmin
        const assignedRole = adminCount === 0 ? 'superadmin' : (role === 'superadmin' ? 'superadmin' : 'admin');

        const initialPermissions = {
            canCreateBlog: permissions?.canCreateBlog !== undefined ? !!permissions.canCreateBlog : true,
            canEditBlog: permissions?.canEditBlog !== undefined ? !!permissions.canEditBlog : true,
            canDeleteBlog: permissions?.canDeleteBlog !== undefined ? !!permissions.canDeleteBlog : true,
            canUseAI: permissions?.canUseAI !== undefined ? !!permissions.canUseAI : true,
            canScheduleBlog: permissions?.canScheduleBlog !== undefined ? !!permissions.canScheduleBlog : true,
        };

        const newAdmin = await Admin.create({
            email: normalizedEmail,
            password,
            role: assignedRole,
            status: 'active',
            isActive: true,
            permissions: initialPermissions
        });

        res.status(201).json({
            _id: newAdmin._id,
            email: newAdmin.email,
            role: newAdmin.role,
            status: newAdmin.status,
            isActive: newAdmin.isActive,
            permissions: newAdmin.permissions,
            message: `Administrator account (${newAdmin.role}) created successfully!`
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error during registration', error: error.message });
    }
});

// @desc    List all admin accounts
// @route   GET /api/auth/admins
// @access  SuperAdmin Only
router.get('/admins', protect, requireSuperAdmin, async (req, res) => {
    try {
        const admins = await Admin.find().select('-password').sort({ createdAt: -1 });
        res.json(admins);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update admin granular permissions
// @route   PUT /api/auth/admins/:id/permissions
// @access  SuperAdmin Only
router.put('/admins/:id/permissions', protect, requireSuperAdmin, async (req, res) => {
    try {
        const targetAdmin = await Admin.findById(req.params.id);

        if (!targetAdmin) {
            return res.status(404).json({ message: 'Admin account not found' });
        }

        if (targetAdmin.role === 'superadmin') {
            return res.status(400).json({ message: 'SuperAdmin possesses full access and cannot be restricted.' });
        }

        const newPermissions = req.body.permissions || {};

        targetAdmin.permissions = {
            canCreateBlog: newPermissions.canCreateBlog !== undefined ? !!newPermissions.canCreateBlog : (targetAdmin.permissions?.canCreateBlog ?? true),
            canEditBlog: newPermissions.canEditBlog !== undefined ? !!newPermissions.canEditBlog : (targetAdmin.permissions?.canEditBlog ?? true),
            canDeleteBlog: newPermissions.canDeleteBlog !== undefined ? !!newPermissions.canDeleteBlog : (targetAdmin.permissions?.canDeleteBlog ?? true),
            canUseAI: newPermissions.canUseAI !== undefined ? !!newPermissions.canUseAI : (targetAdmin.permissions?.canUseAI ?? true),
            canScheduleBlog: newPermissions.canScheduleBlog !== undefined ? !!newPermissions.canScheduleBlog : (targetAdmin.permissions?.canScheduleBlog ?? true)
        };

        const updated = await targetAdmin.save();

        res.json({
            _id: updated._id,
            email: updated.email,
            role: updated.role,
            status: updated.status,
            isActive: updated.isActive,
            permissions: updated.permissions,
            message: `Permissions updated successfully for ${updated.email}`
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Toggle or update admin active/revoked status
// @route   PUT /api/auth/admins/:id/status
// @access  SuperAdmin Only
router.put('/admins/:id/status', protect, requireSuperAdmin, async (req, res) => {
    try {
        const targetAdmin = await Admin.findById(req.params.id);

        if (!targetAdmin) {
            return res.status(404).json({ message: 'Admin account not found' });
        }

        if (targetAdmin.role === 'superadmin') {
            return res.status(400).json({ message: 'SuperAdmin account status cannot be revoked.' });
        }

        if (String(targetAdmin._id) === String(req.admin._id)) {
            return res.status(400).json({ message: 'You cannot revoke your own account.' });
        }

        let newStatus;
        if (req.body.status) {
            newStatus = req.body.status === 'revoked' ? 'revoked' : 'active';
        } else if (req.body.isActive !== undefined) {
            newStatus = req.body.isActive ? 'active' : 'revoked';
        } else {
            // Toggle
            newStatus = targetAdmin.status === 'active' ? 'revoked' : 'active';
        }

        targetAdmin.status = newStatus;
        targetAdmin.isActive = newStatus === 'active';

        const updated = await targetAdmin.save();

        res.json({
            _id: updated._id,
            email: updated.email,
            role: updated.role,
            status: updated.status,
            isActive: updated.isActive,
            permissions: updated.permissions,
            message: `Account status for ${updated.email} changed to ${updated.status}.`
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Delete an admin account
// @route   DELETE /api/auth/admins/:id
// @access  SuperAdmin Only
router.delete('/admins/:id', protect, requireSuperAdmin, async (req, res) => {
    try {
        const targetAdmin = await Admin.findById(req.params.id);

        if (!targetAdmin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        // Prevent SuperAdmin from deleting themselves
        if (String(targetAdmin._id) === String(req.admin._id)) {
            return res.status(400).json({ message: 'You cannot delete your own SuperAdmin account.' });
        }

        // Prevent deleting other SuperAdmins
        if (targetAdmin.role === 'superadmin') {
            return res.status(400).json({ message: 'SuperAdmin accounts cannot be deleted.' });
        }

        await Admin.findByIdAndDelete(req.params.id);
        res.json({ message: `Admin ${targetAdmin.email} has been deleted successfully.` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;