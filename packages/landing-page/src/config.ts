export const CITIZEN_APP_URL = import.meta.env.VITE_CITIZEN_APP_URL ?? 'http://localhost:5173';
export const AUTHORITY_APP_URL = import.meta.env.VITE_AUTHORITY_APP_URL ?? 'http://localhost:5174';
export const ADMIN_APP_URL = import.meta.env.VITE_ADMIN_CONSOLE_URL ?? 'http://localhost:5175';
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL 
  ? `${import.meta.env.VITE_API_BASE_URL}/api/v1`
  : 'http://localhost:4000/api/v1';
