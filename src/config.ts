export const IS_DEV = true; // Toggle this to false for live

export const API_BASE_URL = IS_DEV
  ? '/api/proxy' // Local/proxy endpoint
  : 'https://24live.com/api'; // Live endpoint
