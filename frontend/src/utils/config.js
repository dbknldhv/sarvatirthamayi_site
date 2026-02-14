/** * Vite uses import.meta.env instead of process.env.
 * On Hostinger, ensure your .env.production has VITE_API_URL set to https://api.sarvatirthamayi.com/api
 */

// 1. BASE URL CONFIGURATION
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Fallback to API_BASE_URL (minus the /api) if IMAGE_BASE_URL isn't explicitly set
export const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL || API_BASE_URL.replace('/api', '');

/**
 * Ensures images load correctly regardless of whether the path 
 * is a relative string from the DB or a full external URL.
 */
export const getFullImageUrl = (imagePath) => {
  // Placeholder for missing images
  const placeholder = 'https://via.placeholder.com/400x300?text=No+Image';
  
  if (!imagePath || typeof imagePath !== 'string') return placeholder;
  
  // 1. If the path is already a full URL (Firebase, S3, or Placeholder), return it as is
  if (imagePath.startsWith('http')) return imagePath;

  // 2. Clean up Base and Path to prevent double slashes (//)
  // Remove trailing slash from base and leading slash from path
  const cleanBase = IMAGE_BASE_URL.replace(/\/$/, ""); 
  const cleanPath = imagePath.replace(/^\//, "");

  // 3. Return formatted URL
  return `${cleanBase}/${cleanPath}`;
};

/**
 * LOGOUT HELPER
 * Useful for clearing state and redirecting based on the current context (User vs Admin)
 */
export const handleLogoutRedirect = () => {
  const isInsideAdmin = window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/temple-admin');
  localStorage.clear(); // Clears all tokens and user data
  window.location.href = isInsideAdmin ? '/admin/login' : '/user/login';
};