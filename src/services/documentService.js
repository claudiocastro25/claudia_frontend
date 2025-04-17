import api from './api';
import { adaptApiResponse, parseApiError } from './serviceAdapter';
import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { extractDocumentId, extractDocumentStatus } from '../utils/apiHelpers';

// URL direta para o processador de documentos
const DOCUMENT_PROCESSOR_URL = 'http://localhost:8000';

/**
 * Verifica o status de saúde do processador de documentos
 * Corrigido para usar a URL direta do processador
 * 
 * @returns {Promise<Object>} - Resposta normalizada com status do processador
 */
export const checkDocumentProcessorHealth = async () => {
  try {
    // Tentar diretamente no processador Python primeiro (URL correta)
    const response = await fetch(`${DOCUMENT_PROCESSOR_URL}/health`);
    const data = await response.json();
    
    console.log('Resposta direta do processador de documentos:', data);
    
    // Verificar se o processador está saudável diretamente
    if (data.status === 'healthy') {
      return {
        status: 'available',
        message: 'Serviço de processamento disponível',
        available: true,
        details: data
      };
    }
    
    // Caso a resposta não contenha status healthy
    return {
      status: 'unavailable',
      message: 'Serviço de processamento indisponível ou com problemas',
      available: false
    };
  } catch (directError) {
    console.warn('Erro ao acessar diretamente o processador:', directError);
    
    // Tentar pelo API Gateway (método antigo) como fallback
    try {
      const response = await api.get(API_ENDPOINTS.DOCUMENTS.PROCESSOR_HEALTH);
      const adaptedResponse = adaptApiResponse(response);
      
      // Extrair e normalizar a resposta
      let isAvailable = false;
      let statusMessage = 'Serviço de processamento indisponível';
      
      if (adaptedResponse.data) {
        // Verificar diretamente no payload principal
        if (adaptedResponse.data.available === true) {
          isAvailable = true;
          statusMessage = adaptedResponse.data.message || 'Serviço de processamento disponível';
        } 
        // Verificar no nível extra adicionado pelo controller
        else if (adaptedResponse.data.data && adaptedResponse.data.data.available === true) {
          isAvailable = true;
          statusMessage = adaptedResponse.data.data.message || 'Serviço de processamento disponível';
        } 
        // Verificação alternativa para 'status' = 'healthy' no backend
        else if (adaptedResponse.data.status === 'healthy' || adaptedResponse.data.status === 'available') {
          isAvailable = true;
          statusMessage = adaptedResponse.data.message || 'Serviço de processamento disponível';
        }
        // Verificação para quando status está aninhado dentro de data.data
        else if (adaptedResponse.data.data && 
                (adaptedResponse.data.data.status === 'healthy' || 
                 adaptedResponse.data.data.status === 'available')) {
          isAvailable = true;
          statusMessage = adaptedResponse.data.data.message || 'Serviço de processamento disponível';
        }
        // Verificar se há detalhes aninhados com status
        else if (adaptedResponse.data.data && adaptedResponse.data.data.details && 
                 adaptedResponse.data.data.details.status === 'healthy') {
          isAvailable = true;
          statusMessage = adaptedResponse.data.data.message || 'Serviço de processamento disponível';
        }
      }
      
      return {
        status: isAvailable ? 'available' : 'unavailable',
        message: statusMessage,
        available: isAvailable
      };
    } catch (apiError) {
      console.error('Erro ao verificar saúde do processador via API:', apiError);
      return {
        status: 'unavailable',
        message: 'Serviço de processamento indisponível',
        available: false
      };
    }
  }
};

/**
 * Faz upload de um documento e o associa a uma conversa
 * 
 * @param {File} file - Arquivo a ser enviado
 * @param {string} conversationId - ID da conversa para associar o documento
 * @returns {Promise<Object>} - Resposta com dados do documento
 */
export const uploadDocument = async (file, conversationId) => {
  try {
    if (!file) {
      throw new Error('Arquivo não fornecido');
    }
    
    if (!conversationId) {
      throw new Error('ID da conversa não fornecido');
    }
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('conversationId', conversationId);
    
    const response = await api.post(API_ENDPOINTS.DOCUMENTS.UPLOAD, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    const adaptedResponse = adaptApiResponse(response);
    
    // Extrair ID do documento
    const documentId = extractDocumentId(adaptedResponse);
    
    if (!documentId) {
      console.warn('ID do documento não encontrado na resposta:', adaptedResponse);
    }
    
    // Normalizar resposta
    return {
      ...adaptedResponse,
      documentId,
      status: adaptedResponse.status || 'success'
    };
  } catch (error) {
    console.error('Erro ao fazer upload do documento:', error);
    return {
      status: 'error',
      message: error.message || 'Falha ao fazer upload do documento',
      error: error
    };
  }
};

/**
 * Realiza o upload de um documento sem associá-lo a uma conversa específica.
 * 
 * @param {File} file - Arquivo a ser enviado
 * @returns {Promise<Object>} - Resposta com dados do documento
 */
export const uploadDocumentWithoutConversation = async (file) => {
  try {
    if (!file) {
      throw new Error('Arquivo não fornecido');
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post(API_ENDPOINTS.DOCUMENTS.TEMP_UPLOAD, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    const adaptedResponse = adaptApiResponse(response);
    
    // Extrair ID do documento
    const documentId = extractDocumentId(adaptedResponse);
    
    return {
      ...adaptedResponse,
      documentId,
      status: adaptedResponse.status || 'success'
    };
  } catch (error) {
    console.error('Erro ao fazer upload temporário:', error);
    return {
      status: 'error',
      message: error.message || 'Falha ao fazer upload temporário do documento',
      error: error
    };
  }
};

/**
 * Associa um documento previamente carregado a uma conversa
 * 
 * @param {string} documentId - ID do documento a ser associado
 * @param {string} conversationId - ID da conversa para associar
 * @returns {Promise<Object>} - Resposta da API
 */
export const associateDocumentWithConversation = async (documentId, conversationId) => {
  try {
    if (!documentId) {
      throw new Error('ID do documento não fornecido');
    }
    
    if (!conversationId) {
      throw new Error('ID da conversa não fornecido');
    }
    
    const response = await api.post(API_ENDPOINTS.DOCUMENTS.ASSOCIATE(documentId), {
      conversationId
    });
    
    return adaptApiResponse(response);
  } catch (error) {
    console.error('Erro ao associar documento à conversa:', error);
    return {
      status: 'error',
      message: error.message || 'Falha ao associar documento à conversa',
      error: error
    };
  }
};

/**
 * Lista documentos temporários (ainda não associados a uma conversa)
 * 
 * @returns {Promise<Array>} - Lista de documentos temporários
 */
export const getTemporaryDocuments = async () => {
  try {
    const response = await api.get(API_ENDPOINTS.DOCUMENTS.TEMPORARY);
    const adaptedResponse = adaptApiResponse(response);
    
    let documents = [];
    
    if (adaptedResponse.data?.documents) {
      documents = adaptedResponse.data.documents;
    } else if (Array.isArray(adaptedResponse.data)) {
      documents = adaptedResponse.data;
    }
    
    return {
      status: 'success',
      data: {
        documents
      }
    };
  } catch (error) {
    console.error('Erro ao obter documentos temporários:', error);
    return {
      status: 'error',
      message: error.message || 'Falha ao obter documentos temporários',
      error: error
    };
  }
};

/**
 * Busca documentos associados a uma conversa
 * 
 * @param {string} conversationId - ID da conversa
 * @returns {Promise<Object>} - Resposta com documentos
 */
export const getConversationDocuments = async (conversationId) => {
  try {
    if (!conversationId) {
      return { status: 'error', message: 'ID da conversa não fornecido' };
    }
    
    const response = await api.get(API_ENDPOINTS.DOCUMENTS.BY_CONVERSATION(conversationId));
    const adaptedResponse = adaptApiResponse(response);
    
    let documents = [];
    
    if (adaptedResponse.data?.documents) {
      documents = adaptedResponse.data.documents;
    } else if (Array.isArray(adaptedResponse.data)) {
      documents = adaptedResponse.data;
    }
    
    return {
      status: 'success',
      data: {
        documents,
        count: documents.length
      }
    };
  } catch (error) {
    console.error('Erro ao obter documentos da conversa:', error);
    return {
      status: 'error',
      message: error.message || 'Falha ao obter documentos da conversa',
      error: error
    };
  }
};

/**
 * Obtém conteúdo de um documento específico
 * 
 * @param {string} documentId - ID do documento
 * @returns {Promise<Object>} - Resposta com conteúdo do documento
 */
export const getDocumentContent = async (documentId) => {
  try {
    if (!documentId) {
      return { status: 'error', message: 'ID do documento não fornecido' };
    }
    
    const response = await api.get(API_ENDPOINTS.DOCUMENTS.CONTENT(documentId));
    return adaptApiResponse(response);
  } catch (error) {
    console.error('Erro ao obter conteúdo do documento:', error);
    return {
      status: 'error',
      message: error.message || 'Falha ao obter conteúdo do documento',
      error: error
    };
  }
};

/**
 * Realiza polling do status de processamento de um documento
 * 
 * @param {string} documentId - ID do documento
 * @param {number} maxAttempts - Número máximo de tentativas (default: 60)
 * @param {number} interval - Intervalo entre tentativas em ms (default: 2000)
 * @returns {Promise<Object>} - Resultado do polling
 */
export const pollDocumentStatus = async (documentId, maxAttempts = 60, interval = 2000) => {
  if (!documentId) {
    return { success: false, error: 'ID do documento não fornecido' };
  }
  
  let attempts = 0;
  
  const pollStatus = () => {
    return new Promise(async (resolve, reject) => {
      try {
        // Verificar status do documento
        const response = await api.get(API_ENDPOINTS.DOCUMENTS.STATUS(documentId));
        const adaptedResponse = adaptApiResponse(response);
        
        // Extrair status e progresso
        const status = extractDocumentStatus(adaptedResponse);
        const progress = adaptedResponse.data?.processing_progress || 0;
        
        // Listas de status completados e com erro
        const completedStatuses = ['completed', 'complete', 'finalizado', 'concluído', 'concluido', 'success', 'disponível', 'available'];
        const errorStatuses = ['error', 'failed', 'erro', 'falha', 'unavailable'];
        
        // Normalizar status para comparação
        const statusLower = status ? status.toLowerCase() : '';
        
        if (completedStatuses.includes(statusLower)) {
          // Processamento concluído com sucesso
          resolve({ 
            success: true, 
            document: adaptedResponse.data,
            progress: 100,
            status: 'completed'
          });
        } else if (errorStatuses.includes(statusLower)) {
          // Extrair mensagem de erro
          let errorMessage = 'Erro ao processar documento';
          
          if (adaptedResponse.message) {
            errorMessage = adaptedResponse.message;
          } else if (adaptedResponse.data?.processing_error) {
            errorMessage = adaptedResponse.data.processing_error;
          } else if (adaptedResponse.error) {
            errorMessage = adaptedResponse.error;
          }
          
          // Erro no processamento
          reject({ 
            success: false, 
            error: errorMessage,
            progress
          });
        } else if (attempts >= maxAttempts) {
          // Limite de tentativas atingido
          reject({ 
            success: false, 
            error: 'Tempo limite excedido para processamento do documento',
            progress
          });
        } else {
          // Continuar esperando
          attempts++;
          
          // Ajustar intervalo para documentos pequenos processados rapidamente
          const adjustedInterval = (progress > 80 && statusLower === 'processing') ? 
            Math.max(500, interval / 2) : interval;
          
          setTimeout(() => {
            pollStatus().then(resolve).catch(reject);
          }, adjustedInterval);
        }
      } catch (error) {
        console.error(`Erro ao verificar status (tentativa ${attempts+1}):`, error);
        
        // Erro ao verificar status, mas continuamos tentando
        attempts++;
        if (attempts >= maxAttempts) {
          reject({ 
            success: false, 
            error: 'Tempo limite excedido para processamento do documento',
            progress: 0
          });
        } else {
          setTimeout(() => {
            pollStatus().then(resolve).catch(reject);
          }, interval);
        }
      }
    });
  };
  
  try {
    return await pollStatus();
  } catch (error) {
    return error; // Já está no formato esperado
  }
};

/**
 * Exclui um documento
 * 
 * @param {string} documentId - ID do documento a ser excluído
 * @returns {Promise<Object>} - Resposta da API
 */
export const deleteDocument = async (documentId) => {
  try {
    if (!documentId) {
      throw new Error('ID do documento não fornecido');
    }
    
    const response = await api.delete(API_ENDPOINTS.DOCUMENTS.DOCUMENT(documentId));
    return adaptApiResponse(response);
  } catch (error) {
    console.error('Erro ao excluir documento:', error);
    return {
      status: 'error',
      message: error.message || 'Falha ao excluir documento',
      error: error
    };
  }
};

/**
 * Busca documentos por consulta
 * 
 * @param {string} query - Consulta de busca
 * @param {string} conversationId - ID da conversa (opcional)
 * @returns {Promise<Object>} - Resposta com resultados
 */
export const searchDocuments = async (query, conversationId = null) => {
  try {
    const params = { query };
    if (conversationId) {
      params.conversationId = conversationId;
    }
    
    const response = await api.get(API_ENDPOINTS.DOCUMENTS.SEARCH, { params });
    return adaptApiResponse(response);
  } catch (error) {
    console.error('Erro ao buscar documentos:', error);
    return {
      status: 'error',
      message: error.message || 'Falha ao buscar documentos',
      error: error
    };
  }
};

/**
 * Obtém o status atual de um documento
 * 
 * @param {string} documentId - ID do documento
 * @returns {Promise<Object>} - Resposta com status
 */
export const getDocumentStatus = async (documentId) => {
  try {
    if (!documentId) {
      throw new Error('ID do documento não fornecido');
    }
    
    const response = await api.get(API_ENDPOINTS.DOCUMENTS.STATUS(documentId));
    return adaptApiResponse(response);
  } catch (error) {
    console.error('Erro ao obter status do documento:', error);
    return {
      status: 'error',
      message: error.message || 'Falha ao obter status do documento',
      error: error
    };
  }
};

/**
 * Busca documentos do usuário, opcionalmente filtrando por conversa
 * 
 * @param {string} conversationId - ID da conversa (opcional)
 * @returns {Promise<Object>} - Resposta com documentos do usuário
 */
export const getUserDocuments = async (conversationId = null) => {
  try {
    const params = {};
    if (conversationId) {
      params.conversationId = conversationId;
    }
    
    const response = await api.get(API_ENDPOINTS.DOCUMENTS.LIST, { params });
    const adaptedResponse = adaptApiResponse(response);
    
    let documents = [];
    
    if (adaptedResponse.data?.documents) {
      documents = adaptedResponse.data.documents;
    } else if (Array.isArray(adaptedResponse.data)) {
      documents = adaptedResponse.data;
    }
    
    return {
      status: 'success',
      data: {
        documents,
        count: documents.length
      }
    };
  } catch (error) {
    console.error('Erro ao obter documentos do usuário:', error);
    return {
      status: 'error',
      message: error.message || 'Falha ao obter documentos do usuário',
      error: error
    };
  }
};

// Exportar todas as funções
export default {
  checkDocumentProcessorHealth,
  uploadDocument,
  uploadDocumentWithoutConversation,
  associateDocumentWithConversation,
  getTemporaryDocuments,
  getConversationDocuments,
  getDocumentContent,
  pollDocumentStatus,
  deleteDocument,
  searchDocuments,
  getDocumentStatus,
  getUserDocuments
};