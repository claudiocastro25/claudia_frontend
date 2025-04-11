import api from './api';

// Simula um erro específico para desenvolvimento
const simulateAuthError = false; 

/**
 * Função de login - envia credenciais para a API e salva token
 * @param {string} email - Email do usuário
 * @param {string} password - Senha do usuário
 * @returns {Promise<boolean>} - Retorna true se o login for bem-sucedido
 */
export const login = async (email, password) => {
  try {
    // Para teste: simular erro de autenticação
    if (simulateAuthError) {
      throw new Error('Falha de autenticação simulada');
    }

    const response = await api.post('/api/auth/login', { email, password });
    
    if (response.data && response.data.data && response.data.data.token) {
      // Salvar o token no localStorage
      localStorage.setItem('token', response.data.data.token);
      
      // Se a API retornar dados do usuário, salvar também
      if (response.data.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Erro de login:', error);
    
    // Verifica se há uma mensagem de erro específica da API
    if (error.response && error.response.data && error.response.data.message) {
      throw new Error(error.response.data.message);
    }
    
    throw new Error('Falha ao fazer login. Verifique sua conexão e credenciais.');
  }
};

/**
 * Função de registro - cria nova conta e salva token
 * @param {object} userData - Dados do usuário (nome, email, senha)
 * @returns {Promise<boolean>} - Retorna true se o registro for bem-sucedido
 */
export const register = async (userData) => {
  try {
    const response = await api.post('/api/auth/register', userData);
    
    if (response.data && response.data.data && response.data.data.token) {
      // Salvar o token no localStorage
      localStorage.setItem('token', response.data.data.token);
      
      // Se a API retornar dados do usuário, salvar também
      if (response.data.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Erro de registro:', error);
    
    // Verifica se há uma mensagem de erro específica da API
    if (error.response && error.response.data && error.response.data.message) {
      throw new Error(error.response.data.message);
    }
    
    throw new Error('Falha ao criar conta. Verifique sua conexão ou tente outro email.');
  }
};

/**
 * Função de logout - remove token e informações do usuário
 */
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  
  // Redirecionar para a página de login - opcional
  window.location.href = '/login';
};

/**
 * Verificar se o usuário está autenticado
 * @returns {boolean} - True se o usuário estiver autenticado
 */
export const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  return !!token; // Retorna true se o token existir
};

/**
 * Obter informações do usuário atual
 * @returns {object|null} - Dados do usuário ou null se não estiver autenticado
 */
export const getCurrentUser = () => {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  } catch (error) {
    console.error('Erro ao obter dados do usuário:', error);
    return null;
  }
};

export default {
  login,
  register,
  logout,
  isAuthenticated,
  getCurrentUser
};