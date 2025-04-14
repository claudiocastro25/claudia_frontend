/**
 * Este adaptador converte as respostas da API para um formato padronizado
 * que funciona com o componente Chat.js
 * 
 * Ele deve ser importado nos arquivos de serviço (chatService.js, documentService.js)
 * para garantir respostas consistentes.
 */

/**
 * Adapta a resposta da API para o formato esperado pelo frontend
 * 
 * @param {Object} apiResponse - Resposta original da API
 * @return {Object} - Resposta formatada
 */
export const adaptApiResponse = (apiResponse) => {
  // Verificar se a resposta existe
  if (!apiResponse) {
    return {
      status: 'error',
      message: 'Resposta vazia da API',
      data: null
    };
  }
  
  // Se a resposta já for um objeto de erro personalizado
  if (apiResponse.notFound || apiResponse.code) {
    return apiResponse;
  }

  // Se a resposta já estiver no formato esperado, retorne-a como está
  if (!apiResponse.data) {
    return apiResponse;
  }

  // Se a resposta da API estiver no formato {data: {status: 'success', data: {...}}}
  if (apiResponse.data.status && apiResponse.data.data) {
    return {
      status: apiResponse.data.status,
      data: apiResponse.data.data,
      originalResponse: apiResponse
    };
  }
  
  // Se a resposta da API estiver no formato {data: {status: 'success', message: '...', ...}}
  if (apiResponse.data.status) {
    return {
      status: apiResponse.data.status,
      message: apiResponse.data.message,
      data: Object.keys(apiResponse.data)
        .filter(key => !['status', 'message'].includes(key))
        .reduce((obj, key) => ({ ...obj, [key]: apiResponse.data[key] }), {}),
      originalResponse: apiResponse
    };
  }

  // Caso não reconheça o formato, retorne a resposta original
  console.warn('Formato de resposta não reconhecido:', apiResponse);
  return apiResponse;
};

/**
 * Função de utilidade para analisar o erro de API e retornar informações úteis
 * 
 * @param {Error} error - Objeto de erro da API
 * @param {string} defaultMessage - Mensagem padrão para exibição
 * @return {Object} - Objeto padronizado com informações sobre o erro
 */
export const parseApiError = (error, defaultMessage = 'Erro ao processar solicitação') => {
  // Se já for um objeto de erro com nosso formato
  if (error && (error.status === 'error' || error.notFound)) {
    return error;
  }
  
  // Se for um erro de resposta do Axios
  if (error && error.response) {
    // Verificar se é um erro 404 (não encontrado)
    if (error.response.status === 404) {
      return {
        status: 'error',
        message: 'Recurso não encontrado',
        notFound: true,
        code: 404,
        originalError: error
      };
    }
    
    // Extrair a mensagem de erro da resposta da API
    const apiError = error.response.data;
    
    return {
      status: 'error',
      message: apiError?.message || defaultMessage,
      code: error.response.status,
      details: apiError,
      originalError: error
    };
  }
  
  // Para outros tipos de erro
  return {
    status: 'error',
    message: error?.message || defaultMessage,
    originalError: error
  };
};

export default { adaptApiResponse, parseApiError };