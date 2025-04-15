/**
 * Arquivo de adaptador de serviço
 * Contém funções utilitárias para padronizar respostas e erros da API
 */

/**
 * Adapta a resposta da API para um formato padronizado
 * @param {Object} response - Resposta da API
 * @returns {Object} - Resposta adaptada
 */
export const adaptApiResponse = (response) => {
  // Se não houver resposta, retornar objeto vazio
  if (!response) {
    return {
      status: 'error',
      message: 'Resposta da API não disponível',
      data: null
    };
  }

  // Se a resposta já estiver no formato esperado, retornar como está
  if (response.status && (response.data !== undefined || response.message)) {
    return response;
  }

  // Adaptar para o formato padrão
  return {
    status: response.status >= 200 && response.status < 300 ? 'success' : 'error',
    message: response.statusText || '',
    data: response.data || null,
    headers: response.headers,
    originalResponse: response
  };
};

/**
 * Analisa erros da API e retorna um formato padronizado
 * @param {Object} error - Erro da API
 * @param {string} defaultMessage - Mensagem padrão se não houver mensagem específica
 * @returns {Object} - Erro padronizado
 */
export const parseApiError = (error, defaultMessage = 'Ocorreu um erro desconhecido') => {
  // Se já for um objeto de erro formatado, retornar como está
  if (error && error.status === 'error' && error.message) {
    return error;
  }

  // Tentar extrair informações específicas do erro
  let errorMessage = defaultMessage;
  let statusCode = 500;
  let errorData = null;

  // Verificar se há uma resposta do servidor
  if (error.response) {
    statusCode = error.response.status;
    
    // Tentar extrair mensagem do corpo da resposta
    if (error.response.data) {
      if (error.response.data.message) {
        errorMessage = error.response.data.message;
      } else if (typeof error.response.data === 'string') {
        errorMessage = error.response.data;
      } else if (error.response.data.error) {
        errorMessage = error.response.data.error;
      }
      
      errorData = error.response.data;
    }
    
    // Mensagens específicas por código de status
    if (statusCode === 401) {
      errorMessage = 'Não autorizado. Faça login novamente.';
    } else if (statusCode === 403) {
      errorMessage = 'Acesso proibido a este recurso.';
    } else if (statusCode === 404) {
      errorMessage = 'Recurso não encontrado.';
    }
  } else if (error.request) {
    // Houve uma requisição, mas não houve resposta
    errorMessage = 'Não foi possível conectar ao servidor. Verifique sua conexão.';
    statusCode = 0;
  } else if (error.message) {
    // Erro de configuração da requisição
    errorMessage = error.message;
  }

  // Construir objeto de erro padronizado
  return {
    status: 'error',
    message: errorMessage,
    code: statusCode,
    data: errorData,
    originalError: error
  };
};

export default {
  adaptApiResponse,
  parseApiError
};