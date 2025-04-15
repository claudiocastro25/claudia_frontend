/**
 * Constantes para os endpoints da API
 * Centraliza as URLs para facilitar manutenção
 */

export const API_ENDPOINTS = {
    // Endpoints de autenticação
    AUTH: {
      LOGIN: '/api/auth/login',
      REGISTER: '/api/auth/register',
      PROFILE: '/api/auth/profile',
    },
    
    // Endpoints de chat
    CHAT: {
      CONVERSATIONS: '/api/chat/conversations',
      CONVERSATION: (id) => `/api/chat/conversations/${id}`,
      MESSAGES: (conversationId) => `/api/chat/conversations/${conversationId}/messages`,
      MESSAGE: (conversationId, messageId) => `/api/chat/conversations/${conversationId}/messages/${messageId}`,
      PROMPTS: '/api/chat/prompts',
      PROMPT_SUGGESTIONS: '/api/chat/prompts/suggestions'
    },
    
    // Endpoints de documentos
    DOCUMENTS: {
      LIST: '/api/documents',
      CONVERSATION_DOCUMENTS: (conversationId) => `/api/documents/conversation/${conversationId}`,
      DOCUMENT: (id) => `/api/documents/${id}`,
      UPLOAD: '/api/documents/upload',
      PROCESSOR_HEALTH: '/api/documents/processor/health'
    },
    
    // Endpoints de visualizações
    VISUALIZATIONS: {
      LIST: '/api/visualizations',
      CONVERSATION_VISUALIZATIONS: (conversationId) => `/api/visualizations/conversation/${conversationId}`,
      VISUALIZATION: (id) => `/api/visualizations/${id}`,
      SAVE: '/api/visualizations/save',
      EXPORT: (format) => `/api/visualizations/export/${format}`
    },
    
    // Endpoint de saúde da API
    HEALTH: '/health'
  };
  
  export default API_ENDPOINTS;