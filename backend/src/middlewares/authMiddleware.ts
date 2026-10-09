import { Request, Response, NextFunction } from 'express';
import { AuthService, UserTokenPayload } from '../services/authService';
import { config } from '../config';

const authService = new AuthService();

declare global {
  namespace Express {
    interface Request {
      user?: UserTokenPayload | null;
      sessionId?: string;
    }
  }
}

/**
 * Optional authentication middleware.
 * Attaches user if valid Bearer token provided; allows guest/demo access otherwise.
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  req.sessionId = (req.headers['x-session-id'] as string) || undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    const payload = authService.verifyToken(token);
    if (payload) {
      req.user = payload;
    } else {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
}

/**
 * Enforce authentication: requires valid Bearer token.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please provide a valid Bearer token.'
    });
  }

  const token = authHeader.substring(7).trim();
  const payload = authService.verifyToken(token);
  if (!payload) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired session token.'
    });
  }

  req.user = payload;
  next();
}

/**
 * Enforce specific role-based authorization.
 */
export function requireRole(role: 'public_user' | 'researcher' | 'admin_maintainer') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.'
      });
    }

    if (req.user.role !== role && req.user.role !== 'admin_maintainer') {
      return res.status(403).json({
        success: false,
        error: `Forbidden: role '${role}' or higher required for this action.`
      });
    }

    next();
  };
}

/**
 * Protect administrative functions with role-based access or Admin API key.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // Check admin key header first
  const adminKey = req.headers['x-admin-key'] as string;
  if (adminKey && config.security.adminApiKey && adminKey === config.security.adminApiKey) {
    req.user = {
      userId: 'system-admin',
      email: 'admin@gonax.internal',
      role: 'admin_maintainer',
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    return next();
  }

  // Check Bearer token with admin_maintainer role
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    const payload = authService.verifyToken(token);
    if (payload && payload.role === 'admin_maintainer') {
      req.user = payload;
      return next();
    }
  }

  return res.status(403).json({
    success: false,
    error: 'Access denied: administrative permissions (admin_maintainer role or valid X-Admin-Key) required.'
  });
}
