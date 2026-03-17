// src/utils/config.js

/** * Vite uses import.meta.env instead of process.env 
 * Variables must start with VITE_ in your .env file
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL || 'http://localhost:5000';

/**
 * Ensures images load correctly regardless of whether the path 
 * is a relative string from the DB or a full external URL.
 */
export const getFullImageUrl = (imagePath) => {
  if (!imagePath) return 'https://via.placeholder.com/400x300?text=No+Image';
  
  // If the path is already a full URL (like a placeholder), return it
  if (imagePath.startsWith('http')) return imagePath;

  // Clean up potential double slashes
  const cleanBase = IMAGE_BASE_URL.replace(/\/$/, ""); 
  const cleanPath = imagePath.replace(/^\//, "");

  return `${cleanBase}/${cleanPath}`;
};