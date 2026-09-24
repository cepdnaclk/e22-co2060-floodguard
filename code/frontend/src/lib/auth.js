/**
 * Authentication and authorization utilities for FloodGuard API routes.
 *
 * Provides reusable JWT verification, session extraction, and role-based
 * access control for Next.js route handlers.
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Authentication will fail.');
}

/**
 * Verify the session cookie and extract the authenticated user.
 * Returns { authenticated: true, user: {...} } or { authenticated: false, error: '...' }.
 */
export function verifySession(request) {
  if (!JWT_SECRET) {
    return { authenticated: false, error: 'Server misconfiguration: JWT_SECRET not set' };
  }

  const sessionCookie = request.cookies.get('session');
  if (!sessionCookie || !sessionCookie.value) {
    return { authenticated: false, error: 'No session token provided' };
  }

  try {
    const decoded = jwt.verify(sessionCookie.value, JWT_SECRET);
    return {
      authenticated: true,
      user: {
        engineer_id: decoded.engineer_id,
        name: decoded.name,
        role: decoded.role,
        assigned_dam_id: decoded.assigned_dam_id,
      },
    };
  } catch (err) {
    return { authenticated: false, error: 'Session expired or invalid' };
  }
}

/**
 * Check if a user has one of the allowed roles.
 */
export function hasRole(user, allowedRoles) {
  if (!user || !user.role) return false;
  return allowedRoles.includes(user.role);
}

/**
 * Check if a user is assigned to a specific dam (or is a global admin).
 */
export function canAccessDam(user, damId) {
  if (!user) return false;
  // System administrators have global access
  if (user.role === 'System Administrator') return true;
  // Other roles must be assigned to the specific dam
  if (!user.assigned_dam_id) return true; // NULL = global access
  return String(user.assigned_dam_id) === String(damId);
}

/**
 * Create a secure session cookie configuration.
 */
export function createSessionCookie(token) {
  return {
    name: 'session',
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 1 day
  };
}

/**
 * Generate a JWT token for an authenticated engineer.
 */
export function generateToken(engineer) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }

  return jwt.sign(
    {
      engineer_id: engineer.engineer_id,
      name: engineer.name,
      role: engineer.role,
      assigned_dam_id: engineer.assigned_dam_id,
    },
    JWT_SECRET,
    { expiresIn: '1d' }
  );
}
