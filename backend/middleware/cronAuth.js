const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

/**
 * Middleware to authenticate Vercel Cron and manual testing requests.
 * 
 * Authentication hierarchy:
 * 1. Matches process.env.CRON_SECRET via:
 *    - Authorization: Bearer <CRON_SECRET> (Vercel Cron standard)
 *    - x-cron-secret: <CRON_SECRET>
 *    - ?secret=<CRON_SECRET> query parameter (for manual browser/curl testing)
 * 2. Alternatively, valid Admin JWT token in Authorization header (allows logged-in admins to test from dashboard)
 * 3. In non-production environments with no CRON_SECRET configured, allows test executions with a warning.
 */
const verifyCronAuth = async (req, res, next) => {
    const configuredSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.authorization;
    const xCronSecret = req.headers['x-cron-secret'];
    const querySecret = req.query.secret || req.query.key;

    // 1. Check if provided Bearer or direct secret matches CRON_SECRET
    if (configuredSecret) {
        if (xCronSecret && xCronSecret === configuredSecret) {
            return next();
        }
        if (querySecret && querySecret === configuredSecret) {
            return next();
        }
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            if (token === configuredSecret) {
                return next();
            }

            // Also check if Bearer token is a valid logged-in Admin JWT
            if (process.env.JWT_SECRET) {
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    const admin = await Admin.findById(decoded.id).select('-password');
                    if (admin && admin.status !== 'revoked' && admin.isActive !== false) {
                        req.admin = admin;
                        return next();
                    }
                } catch (jwtErr) {
                    // Not a valid JWT, continue to rejection
                }
            }
        }

        console.warn('[CronAuth] Unauthorized attempt to access cron endpoint.');
        return res.status(401).json({
            message: 'Unauthorized: Invalid or missing cron secret/token.'
        });
    }

    // 2. If CRON_SECRET is not configured in environment
    if (process.env.NODE_ENV === 'production') {
        console.error('[CronAuth] CRON_SECRET environment variable is missing in production!');
        return res.status(500).json({
            message: 'Server configuration error: CRON_SECRET is not set.'
        });
    }

    // Development mode fallback
    console.warn('[CronAuth] Warning: CRON_SECRET is not set. Allowing request because NODE_ENV != production.');
    return next();
};

module.exports = { verifyCronAuth };
