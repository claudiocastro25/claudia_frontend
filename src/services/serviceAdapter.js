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
    // Se a resposta já estiver no formato esperado, retorne-a como está
    if (!apiResponse?.data) {
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
  
  export default adaptApiResponse;