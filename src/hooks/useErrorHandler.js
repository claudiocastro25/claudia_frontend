import { useCallback, useState } from 'react';

/**
 * Hook para gerenciamento centralizado de erros
 * Padroniza o tratamento de erros em toda a aplicação
 */
export const useErrorHandler = () => {
  const [error, setError] = useState(null);
  
  // Função para extrair mensagem amigável do erro
  const getErrorMessage = useCallback((error, defaultMessage = 'Ocorreu um erro inesperado') => {
    if (!error) return defaultMessage;
    
    // Se já é uma string, retornar diretamente
    if (typeof error === 'string') return error;
    
    // Extrair mensagem do objeto de erro
    if (error.message) return error.message;
    
    // Tentar extrair da resposta da API
    if (error.response) {
      // Se há uma mensagem de erro na resposta
      if (error.response.data?.message) return error.response.data.message;
      if (error.response.data?.error) return error.response.data.error;
      
      // Mensagem com base no status HTTP
      if (error.response.status === 404) return 'Recurso não encontrado';
      if (error.response.status === 401 || error.response.status === 403) return 'Não autorizado';
      if (error.response.status === 500) return 'Erro interno do servidor';
      
      // Mensagem genérica com código
      return `Erro ${error.response.status}: ${error.response.statusText || 'Erro na requisição'}`;
    }
    
    // Retornar mensagem padrão se nada for encontrado
    return defaultMessage;
  }, []);
  
  // Função principal para tratar erros
  const handleError = useCallback((error, context = '') => {
    // Extrair mensagem amigável
    const message = getErrorMessage(error);
    
    // Formatar mensagem com contexto, se fornecido
    const formattedMessage = context ? `${context}: ${message}` : message;
    
    // Registrar no console para depuração
    console.error(formattedMessage, error);
    
    // Atualizar estado de erro
    setError(formattedMessage);
    
    // Retornar mensagem formatada
    return formattedMessage;
  }, [getErrorMessage]);
  
  // Exibir mensagem de erro (sem precisar de um erro real)
  const showErrorMessage = useCallback((message) => {
    setError(message);
    return message;
  }, []);
  
  // Limpar erro atual
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  return {
    error,
    handleError,
    getErrorMessage,
    showErrorMessage,
    clearError
  };
};