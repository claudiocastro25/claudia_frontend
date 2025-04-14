import axios from 'axios';
import API_CONFIG from '../config/apiConfig';

// Create axios instance with improved error handling
const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,  // Não adicionar /api aqui para evitar duplicação
  timeout: API_CONFIG.TIMEOUT,
  headers: API_CONFIG.HEADERS
});

// Add interceptor to add auth token and add /api prefix to URLs
api.interceptors.request.use(
  (config) => {
    // Adicionar prefixo /api à URL se ainda não estiver presente
    // e se não for uma URL absoluta (considerando http e https)
    if (!config.url.startsWith('/api') && !(/^https?:\/\//i).test(config.url)) {
      config.url = `/api${config.url}`;
    }
    
    // Log request for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log(`API Request: ${config.method.toUpperCase()} ${config.url}`, config);
    }
    
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add interceptor to handle auth errors and log responses
api.interceptors.response.use(
  (response) => {
    // Log response for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log(`API Response: ${response.status} ${response.config.url}`, response.data);
    }
    return response;
  },
  (error) => {
    console.error('API Response Error:', error);
    
    // Check if we have a response
    if (error.response) {
      // Handle authentication errors
      if (error.response.status === API_CONFIG.ERROR_CODES.UNAUTHORIZED || 
          error.response.status === API_CONFIG.ERROR_CODES.FORBIDDEN) {
        // Clear auth data on 401/403 errors
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Redirect to login if not already there
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
      
      // Enhanced error information
      return Promise.reject({
        originalError: error,
        status: error.response.status,
        data: error.response.data,
        message: error.response.data?.message || error.message || 'Network error'
      });
    }
    
    // Network errors (no response received)
    if (error.request) {
      return Promise.reject({
        originalError: error,
        message: 'Não foi possível conectar ao servidor. Verifique sua conexão de internet.',
        networkError: true
      });
    }
    
    // Something happened in setting up the request
    return Promise.reject({
      originalError: error,
      message: error.message || 'Erro desconhecido ao configurar a requisição.'
    });
  }
);

// Função utilitária para tratar erros de API com suporte a objeto de erro aprimorado
export const handleApiError = (error, defaultMessage = 'Ocorreu um erro na operação.') => {
  console.error('API Error handled:', error);
  
  // Verificar se é um erro com estrutura própria já tratada pelo interceptor
  if (error.message && error.originalError) {
    return error.message;
  }
  
  // Verificar se é um erro com resposta do servidor
  if (error.response && error.response.data) {
    return error.response.data.message || defaultMessage;
  }
  
  // Verificar se é um erro de rede
  if (error.request) {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão.';
  }
  
  // Se for um erro com mensagem tratada
  if (error.message) {
    return error.message;
  }
  
  // Fallback para mensagem padrão
  return defaultMessage;
};

// Função para verificar se o token atual está expirado
export const isTokenExpired = () => {
  const token = localStorage.getItem('token');
  if (!token) return true;
  
  try {
    // Se o token for JWT, podemos verificar a expiração
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expTime = payload.exp * 1000; // JWT exp é em segundos
    return Date.now() >= expTime;
  } catch (error) {
    console.error('Erro ao verificar expiração do token:', error);
    return false; // Em caso de erro, não considera expirado
  }
};

export default api;