/**
 * Document Service aprimorado - Com tratamento de erros robusto para problemas de conexão
 */

import api from './api'; // Importar o cliente axios configurado com interceptores de autenticação

// Configurações
const CONFIG = {
  // API do backend
  backendUrl: process.env.REACT_APP_API_URL || 'http://localhost:5002',
  // URL direta para o processador Python (usado apenas para verificação de saúde)
  processorUrl: process.env.REACT_APP_DOCUMENT_PROCESSOR_URL || 'http://127.0.0.1:8000',
  // Tempos de espera e tentativas
  timeout: 30000, // 30 segundos
  pollingInterval: 3000, // 3 segundos
  maxPollingAttempts: 60, // 3 minutos no total
  // Configurações de retry
  maxRetries: 3,
  retryDelay: 1000, // 1 segundo
  // Código de erro conhecido
  knownErrors: {
    CONNECTION_POOL: "trying to put unkeyed connection",
    RATE_LIMIT: "rate limit exceeded",
    PROCESSOR_OVERLOAD: "processor overloaded"
  }
};

// Função para construir URLs de API corretamente
const buildApiUrl = (path) => {
  // Verificar se backendUrl já termina com /api
  if (CONFIG.backendUrl.endsWith('/api')) {
    // Remover a / inicial do path se existir
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${CONFIG.backendUrl}/${cleanPath}`;
  } else {
    // Adicionar /api ao path
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${CONFIG.backendUrl}/api${cleanPath}`;
  }
};

// Implementação de função de retry
const withRetry = async (asyncFn, options = {}) => {
  const maxRetries = options.maxRetries || CONFIG.maxRetries;
  const initialDelay = options.initialDelay || CONFIG.retryDelay;
  const retryCondition = options.retryCondition || (() => true);
  
  let lastError = null;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      return await asyncFn();
    } catch (error) {
      lastError = error;
      
      // Verificar se devemos tentar novamente
      const shouldRetry = retryCondition(error);
      if (!shouldRetry) {
        throw error;
      }
      
      // Incrementar contador e calcular próximo delay (backoff exponencial)
      retryCount++;
      if (retryCount >= maxRetries) break;
      
      const delay = initialDelay * Math.pow(2, retryCount - 1);
      console.log(`Tentativa ${retryCount}/${maxRetries} após ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

// Verificar se o microserviço Python está disponível
export const checkDocumentProcessorHealth = async () => {
  try {
    // Usar o cliente axios configurado para incluir automaticamente o token de autenticação
    const response = await api.get('/documents/processor-health');
    
    // Processando resposta do axios
    const data = response.data;
    
    // Verificar se o processador está disponível
    if (data?.data?.available) {
      return {
        status: 'available',
        message: 'Serviço de processamento de documentos está online',
        details: data.data.details
      };
    } else {
      return {
        status: 'warning',
        message: data?.data?.message || 'Serviço de processamento de documentos não está disponível',
        details: data?.data
      };
    }
  } catch (error) {
    console.error('Erro ao verificar saúde do processador de documentos:', error);
    return {
      status: 'unavailable',
      message: 'Serviço de processamento de documentos não está disponível',
      error: error?.response?.data?.message || error?.message || 'Erro de conexão'
    };
  }
};

// Upload de documento com retry automático
export const uploadDocument = async (file, conversationId = null) => {
  // Função para executar o upload
  const executeUpload = async () => {
    try {
      // Preparar FormData para envio
      const formData = new FormData();
      formData.append('file', file);
      
      // Adicionar conversation_id se fornecido
      if (conversationId) {
        formData.append('conversationId', conversationId);
      }
      
      console.log(`Enviando arquivo para upload com ID de conversa: ${conversationId}`);
      
      // Usar cliente axios para upload com autenticação automática
      const response = await api.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: CONFIG.timeout
      });
      
      const data = response.data;
      
      if (data.status !== 'success') {
        throw new Error(data.message || 'Erro desconhecido no upload');
      }
      
      console.log('Resposta do upload:', data);
      
      return data.data;
    } catch (error) {
      console.error('Erro de upload:', error);
      
      // Verificar se é o erro específico de conexão ao pool
      if (error.response?.data?.details && 
          typeof error.response.data.details === 'string' &&
          error.response.data.details.includes(CONFIG.knownErrors.CONNECTION_POOL)) {
        
        console.warn('Erro de conexão ao pool detectado. Documento provavelmente foi carregado, mas não associado à conversa.');
        
        // Verificar se temos um document_id na resposta mesmo com erro
        const documentId = error.response?.data?.document_id || 
                          (error.response?.data?.data && error.response?.data?.data.document_id);
        
        if (documentId) {
          console.log('ID do documento encontrado na resposta de erro:', documentId);
          
          // Se temos um documentId, tentar associar manualmente à conversa
          if (conversationId) {
            try {
              await associateWithConversation(documentId, conversationId);
              console.log('Documento associado manualmente à conversa após erro de pool');
            } catch (associationError) {
              console.error('Erro ao tentar associar manualmente:', associationError);
              // Continuar mesmo com erro de associação, pois o documento foi carregado
            }
          }
          
          // Retornar dados parciais para continuar o fluxo
          return {
            documentId: documentId,
            filename: file.name,
            status: 'pending',
            message: 'Documento enviado, mas pode não estar associado à conversa corretamente'
          };
        }
      }
      
      // Propagar outros erros
      throw error.response?.data || error;
    }
  };
  
  // Verificar saúde do processador antes de iniciar upload
  const health = await checkDocumentProcessorHealth();
  if (health.status === 'unavailable') {
    throw new Error('O serviço de processamento de documentos não está disponível no momento. Tente novamente mais tarde.');
  }
  
  // Executar o upload com retry para erros específicos
  return withRetry(executeUpload, {
    maxRetries: 3,
    initialDelay: 1000,
    retryCondition: (error) => {
      // Verificar se é um erro de conexão ou erro de rede
      const isNetworkError = !error.response && error.request;
      
      // Verificar se é um erro de timeout
      const isTimeoutError = error.code === 'ECONNABORTED';
      
      // Verificar se é um erro de pool ou outro erro conhecido que deve ser tentado novamente
      const isPoolError = error.response?.data?.details && 
                          typeof error.response?.data?.details === 'string' &&
                          error.response.data.details.includes(CONFIG.knownErrors.CONNECTION_POOL);
      
      return isNetworkError || isTimeoutError || isPoolError;
    }
  });
};

// Obter status do documento (com retry para erros transitórios)
export const getDocumentStatus = async (documentId) => {
  if (!documentId) {
    throw new Error('ID do documento é obrigatório');
  }
  
  // Função para executar a verificação de status
  const executeStatusCheck = async () => {
    try {
      // Usar cliente axios
      const response = await api.get(`/documents/${documentId}/status`);
      
      const data = response.data;
      
      if (data.status !== 'success') {
        throw new Error(data.message || 'Erro ao obter status do documento');
      }
      
      return {
        status: 'success',
        data: data.data
      };
    } catch (error) {
      console.error('Erro ao obter status do documento:', error);
      
      // Se for 404, retornar aviso em vez de erro
      if (error.response?.status === 404) {
        return {
          status: 'warning',
          message: 'Documento não encontrado'
        };
      }
      
      throw {
        message: error.response?.data?.message || error.message || 'Erro de rede',
        status: 'error'
      };
    }
  };
  
  // Executar com retry para erros de rede
  return withRetry(executeStatusCheck, {
    maxRetries: 2,
    initialDelay: 500,
    retryCondition: (error) => {
      // Retentar apenas para erros de rede, não para erros de API (como 404)
      return !error.response && error.request;
    }
  });
};

// Polling do status do documento com tratamento de erros aprimorado
export const pollDocumentStatus = async (documentId, maxAttempts = CONFIG.maxPollingAttempts, intervalMs = CONFIG.pollingInterval) => {
  if (!documentId) {
    throw new Error('ID do documento é obrigatório');
  }
  
  let attempts = 0;
  let retryCount = 0;
  const maxRetries = 3; // Máximo de tentativas para erros temporários
  
  while (attempts < maxAttempts) {
    attempts++;
    
    try {
      // Verificar status atual
      const response = await getDocumentStatus(documentId);
      const status = response?.data?.status;
      
      console.log(`Status do documento ${documentId} (tentativa ${attempts}/${maxAttempts}): ${status}`);
      
      if (status === 'completed') {
        return { success: true, data: response.data };
      }
      
      if (status === 'error') {
        return { 
          success: false, 
          error: response.data?.processing_error || 'Erro ao processar o documento' 
        };
      }
      
      // Se ainda estiver em processamento, aguardar e tentar novamente
      await new Promise(resolve => setTimeout(resolve, intervalMs));
      
      // Reset contador de retries quando tiver uma resposta válida
      retryCount = 0;
    } catch (error) {
      console.error(`Erro ao verificar status do documento (tentativa ${attempts}):`, error);
      
      // Para erros, incrementar contagem de retries
      retryCount++;
      
      // Se exceder o máximo de retries consecutivos, falhar
      if (retryCount > maxRetries) {
        return { 
          success: false, 
          error: error.message || 'Falha ao obter status do documento após múltiplas tentativas.'
        };
      }
      
      // Caso contrário, tentar novamente após um intervalo maior
      await new Promise(resolve => setTimeout(resolve, intervalMs * 2));
    }
  }
  
  // Se chegou aqui, excedeu o número máximo de tentativas
  return { 
    success: false, 
    error: `Processamento do documento expirou após ${maxAttempts} tentativas. O documento pode ser muito grande ou complexo.` 
  };
};

// Associar documento a uma conversa com retry automático
export const associateWithConversation = async (documentId, conversationId) => {
  if (!documentId || !conversationId) {
    throw new Error('ID do documento e ID da conversa são obrigatórios');
  }
  
  // Função para executar a associação
  const executeAssociation = async () => {
    try {
      // Usar cliente axios
      const response = await api.post(`/documents/${documentId}/associate`, {
        conversationId
      });
      
      const data = response.data;
      
      if (data.status !== 'success') {
        throw new Error(data.message || 'Erro ao associar documento à conversa');
      }
      
      return {
        status: 'success',
        data: data.data
      };
    } catch (error) {
      console.error('Erro ao associar documento com conversa:', error);
      
      // Verificar se é o erro específico de conexão ao pool
      if (error.response?.data?.details && 
          typeof error.response.data.details === 'string' &&
          error.response.data.details.includes(CONFIG.knownErrors.CONNECTION_POOL)) {
        
        // Lançar erro específico para tratamento pelo retry
        throw new Error('connection_pool_error');
      }
      
      throw {
        message: error.response?.data?.message || error.message || 'Erro de rede',
        status: 'error'
      };
    }
  };
  
  // Executar com retry específico para este tipo de operação
  return withRetry(executeAssociation, {
    maxRetries: 5, // Mais tentativas para esta operação crítica
    initialDelay: 1000,
    retryCondition: (error) => {
      // Retentar para erros de rede ou o erro específico de pool
      const isNetworkError = !error.response && error.request;
      const isPoolError = error.message === 'connection_pool_error';
      
      return isNetworkError || isPoolError;
    }
  });
};

// Restante das funções do serviço...
export const getDocumentContent = async (documentId) => {
  if (!documentId) {
    throw new Error('ID do documento é obrigatório');
  }
  
  try {
    // Usar cliente axios
    const response = await api.get(`/documents/${documentId}/content`);
    
    const data = response.data;
    
    if (data.status !== 'success') {
      throw new Error(data.message || 'Erro ao obter conteúdo do documento');
    }
    
    return {
      status: 'success',
      data: data.data
    };
  } catch (error) {
    console.error('Erro ao obter conteúdo do documento:', error);
    throw { 
      message: error.response?.data?.message || error.message || 'Erro de rede',
      status: 'error'
    };
  }
};

export const getUserDocuments = async (conversationId = null) => {
  try {
    // Construir URL de consulta
    let url = '/documents';
    if (conversationId) {
      url += `?conversationId=${conversationId}`;
    }
    
    // Usar cliente axios
    const response = await api.get(url);
    
    const data = response.data;
    
    if (data.status !== 'success') {
      throw new Error(data.message || 'Erro ao obter documentos');
    }
    
    return {
      status: 'success',
      data: data.data
    };
  } catch (error) {
    console.error('Erro ao obter documentos do usuário:', error);
    throw {
      message: error.response?.data?.message || error.message || 'Erro de rede',
      status: 'error'
    };
  }
};

export const deleteDocument = async (documentId) => {
  if (!documentId) {
    throw new Error('ID do documento é obrigatório');
  }
  
  try {
    // Usar cliente axios
    const response = await api.delete(`/documents/${documentId}`);
    
    const data = response.data;
    
    if (data.status !== 'success') {
      throw new Error(data.message || 'Erro ao excluir documento');
    }
    
    return {
      status: 'success',
      data: data.data
    };
  } catch (error) {
    console.error('Erro ao excluir documento:', error);
    throw {
      message: error.response?.data?.message || error.message || 'Erro de rede',
      status: 'error'
    };
  }
};

export const searchDocuments = async (query, conversationId = null, limit = 5) => {
  if (!query) {
    throw new Error('Uma consulta de busca é obrigatória');
  }
  
  try {
    // Construir parâmetros de consulta
    const params = {
      query,
      limit
    };
    
    if (conversationId) {
      params.conversationId = conversationId;
    }
    
    // Usar cliente axios
    const response = await api.get('/documents/search', { params });
    
    const data = response.data;
    
    if (data.status !== 'success') {
      throw new Error(data.message || 'Erro ao buscar documentos');
    }
    
    return {
      status: 'success',
      data: data.data
    };
  } catch (error) {
    console.error('Erro ao buscar documentos:', error);
    throw {
      message: error.response?.data?.message || error.message || 'Erro de rede',
      status: 'error'
    };
  }
};

// Exportar todas as funções
export default {
  uploadDocument,
  getDocumentStatus,
  getDocumentContent,
  getUserDocuments,
  associateWithConversation,
  deleteDocument,
  pollDocumentStatus,
  searchDocuments,
  checkDocumentProcessorHealth
};