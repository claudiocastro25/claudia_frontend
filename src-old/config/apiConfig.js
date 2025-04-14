/**
 * API configuration settings
 */

// Detect development environment and set appropriate API URL
const isDevelopment = process.env.NODE_ENV === 'development';

// Get API URL from environment or use default
const API_URL = process.env.REACT_APP_API_URL || (isDevelopment 
  ? 'http://localhost:5002' 
  : window.location.origin);

const API_CONFIG = {
  // Base URL for API requests - não adicionar /api aqui para evitar duplicação
  BASE_URL: API_URL,
  
  // Default API timeout (in milliseconds)
  TIMEOUT: 30000,
  
  // Default headers for all requests
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  
  // HTTP Error codes for error handling
  ERROR_CODES: {
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    TIMEOUT: 408,
    SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
  },
  
  // API endpoints - Estes endpoints não incluem o prefixo /api
  // O prefixo será adicionado pelo interceptor do axios
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
      REFRESH: '/auth/refresh',
      LOGOUT: '/auth/logout',
      VERIFY: '/auth/verify'
    },
    DOCUMENTS: {
      UPLOAD: '/documents/upload',
      LIST: '/documents',
      GET: (id) => `/documents/${id}`,
      STATUS: (id) => `/documents/${id}/status`,
      CONTENT: (id) => `/documents/${id}/content`,
      ASSOCIATE: (id) => `/documents/${id}/associate`,
      DELETE: (id) => `/documents/${id}`,
      SEARCH: '/documents/search',
      PROCESSOR_HEALTH: '/documents/processor-health',
      USER: '/documents/user'
    },
    CHAT: {
      CONVERSATIONS: '/chat/conversations',
      MESSAGES: (conversationId) => `/chat/conversations/${conversationId}/messages`,
      SEND: (conversationId) => `/chat/conversations/${conversationId}/messages`
    },
    RAG: {
      SEARCH: '/rag/search',
      CONTEXT: (conversationId) => `/rag/context/${conversationId}`
    }
  },
  
  // Upload configuration
  UPLOAD: {
    MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB em bytes
    ALLOWED_TYPES: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
      'application/msword', // doc
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
      'application/vnd.ms-excel', // xls
      'text/csv',
      'application/json',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/tiff'
    ],
    ALLOWED_EXTENSIONS: ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'csv', 'json', 'txt', 'jpg', 'jpeg', 'png', 'tiff', 'tif']
  },
  
  // Retry configuration
  RETRY: {
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000, // 1 segundo de delay inicial
    MAX_RETRY_DELAY: 15000, // 15 segundos de delay máximo
    TIMEOUT_RETRY: true, // Retentar em caso de timeout
    NETWORK_ERROR_RETRY: true, // Retentar em caso de erro de rede
    STATUS_CODES_TO_RETRY: [408, 429, 500, 502, 503, 504] // Códigos HTTP para retry
  }
};

export default API_CONFIG;