import axios from 'axios';

// Determine the API base URL
// In development (Vite dev server), the proxy handles /api -> localhost:3001
// In production (Electron), we need to use the full URL
const getApiBaseUrl = (): string => {
  // Check if we're in Electron production mode
  if (window.electronAPI) {
    // In Electron, always use the full localhost URL
    return 'http://localhost:3001';
  }
  
  // In development with Vite, use relative URLs (proxy handles it)
  if (import.meta.env.DEV) {
    return '';
  }
  
  // Fallback to localhost
  return 'http://localhost:3001';
};

// Create axios instance with the correct base URL
export const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 60000,
});

// Export individual API functions for cleaner usage
export const chatApi = {
  sendMessage: (message: string, server: any, llmConfig: any) => 
    api.post('/api/chat', { message, server, llmConfig }),
  
  sendOrchestratedMessage: (message: string, servers: any[], llmConfig: any) =>
    api.post('/api/orchestrated-chat', { message, servers, llmConfig }),
  
  testServer: (server: any) =>
    api.post('/api/test-server', { server }),
  
  clearContext: (serverId?: string) =>
    api.post('/api/clear-context', { serverId }),
  
  healthCheck: () =>
    api.get('/api/health'),
};

export default api;
