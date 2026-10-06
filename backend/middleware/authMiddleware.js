const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.admin = await Admin.findById(decoded.id).select('-password');

            if (!req.admin) {
                return res.status(401).json({ message: 'Admin not found' });
            }

            // Check if account has been revoked by SuperAdmin
            if (req.admin.status === 'revoked' || req.admin.isActive === false) {
                return res.status(403).json({
                    message: 'Your administrator account access has been revoked by the SuperAdmin. Please contact your SuperAdministrator.',
                    isRevoked: true
                });
            }

            next();
        } catch (error) {
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token provided' });
    }
};

const requireSuperAdmin = (req, res, next) => {
    if (req.admin && req.admin.role === 'superadmin') {
        return next();
    }
    return res.status(403).json({
        message: 'Access forbidden: Only SuperAdmin accounts can perform this action.'
    });
};

const checkPermission = (permissionName) => {
    return (req, res, next) => {
        if (!req.admin) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        // SuperAdmin possesses all permissions inherently
        if (req.admin.role === 'superadmin') {
            return next();
        }

        // Check if admin has the explicit permission
        if (req.admin.permissions && req.admin.permissions[permissionName] === true) {
            return next();
        }

        const permissionLabels = {
            canCreateBlog: 'create new blog posts',
            canEditBlog: 'edit blog posts',
            canDeleteBlog: 'delete blog posts',
            canUseAI: 'generate blogs using AI',
            canScheduleBlog: 'schedule or cancel scheduled blog posts'
        };

        const readableLabel = permissionLabels[permissionName] || permissionName;

        return res.status(403).json({
            message: `Permission Denied: You do not have permission to ${readableLabel}. Contact the SuperAdmin to request access.`,
            requiredPermission: permissionName
        });
    };
};

module.exports = { protect, requireSuperAdmin, checkPermission };


