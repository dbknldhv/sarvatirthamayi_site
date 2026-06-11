// src/utils/config.js

// This detects if you are in development or production based on the URL
const isProduction = window.location.hostname !== 'localhost';

export const API_BASE_URL = isProduction 
  ? 'https://sarvatirthamayi.com/api' 
  : 'http://localhost:5000/api';

export const IMAGE_BASE_URL = isProduction 
  ? 'https://sarvatirthamayi.com' 
  : 'http://localhost:5000';

export const getFullImageUrl = (imagePath) => {
  if (!imagePath) return 'https://via.placeholder.com/400x300?text=No+Image';
  if (imagePath.startsWith('http')) return imagePath;

  const cleanBase = IMAGE_BASE_URL.replace(/\/$/, ""); 
  const cleanPath = imagePath.replace(/^\//, "");
  return `${cleanBase}/${cleanPath}`;
};