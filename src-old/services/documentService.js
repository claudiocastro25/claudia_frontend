import api from './api';

/**
 * Verifica o status de saúde do processador de documentos
 * 
 * @returns {Promise<Object>} - Resposta normalizada com status do processador
 */
export const checkDocumentProcessorHealth = async () => {
  try {
    const response = await api.get('/documents/processor-health');
    
    console.log('Resposta original do health check:', response.data);
    
    // Normalizar a resposta para um formato consistente
    let isAvailable = false;
    let statusMessage = 'Serviço de processamento indisponível';
    
    // Verificar diversas possibilidades na estrutura da resposta
    if (response.data) {
      if (response.data.data?.available === true) {
        // Formato: { data: { available: true } }
        isAvailable = true;
        statusMessage = response.data.data.message || 'Serviço de processamento disponível';
      } else if (response.data.available === true) {
        // Formato: { available: true }
        isAvailable = true;
        statusMessage = response.data.message || 'Serviço de processamento disponível';
      } else if (response.data.status === 'available') {
        // Formato: { status: 'available' }
        isAvailable = true;
        statusMessage = response.data.message || 'Serviço de processamento disponível';
      } else if (response.data.status === 'success') {
        // Formato: { status: 'success' } - verificando informações adicionais
        if (response.data.data?.available === false) {
          isAvailable = false;
          statusMessage = response.data.data.message || 'Serviço de processamento indisponível';
        } else if (response.data.data?.available === true) {
          isAvailable = true;
          statusMessage = response.data.data.message || 'Serviço de processamento disponível';
        } else {
          // Se não tiver indicação clara, assumimos que success significa disponível
          isAvailable = true;
          statusMessage = response.data.message || 'Serviço de processamento disponível';
        }
      }
    }
    
    return {
      status: isAvailable ? 'available' : 'unavailable',
      message: statusMessage,
      available: isAvailable
    };
  } catch (error) {
    console.error('Erro ao verificar saúde do processador:', error);
    return {
      status: 'unavailable',
      message: 'Serviço de processamento indisponível',
      available: false
    };
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
    
    const response = await api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    // Normalizar a resposta para garantir consistência
    const responseData = response.data;
    
    // Extrair o ID do documento de maneira robusta
    let documentId = null;
    if (responseData?.documentId) {
      documentId = responseData.documentId;
    } else if (responseData?.document_id) {
      documentId = responseData.document_id;
    } else if (responseData?.data?.documentId) {
      documentId = responseData.data.documentId;
    } else if (responseData?.data?.document_id) {
      documentId = responseData.data.document_id;
    } else if (responseData?.data?.data?.documentId) {
      documentId = responseData.data.data.documentId;
    } else if (responseData?.data?.data?.document_id) {
      documentId = responseData.data.data.document_id;
    } else if (responseData?.document?.id) {
      documentId = responseData.document.id;
    }
    
    if (!documentId) {
      console.warn('ID do documento não encontrado na resposta:', responseData);
    }
    
    // Retornar resposta normalizada
    return {
      ...responseData,
      documentId,
      status: responseData.status || 'success'
    };
  } catch (error) {
    console.error('Erro ao fazer upload do documento:', error);
    throw error;
  }
};

/**
 * Realiza o upload de um documento sem associá-lo a uma conversa específica.
 * O documento será associado posteriormente quando uma conversa for criada.
 * 
 * @param {File} file - Arquivo a ser enviado
 * @returns {Promise<Object>} - Resposta com dados do documento
 */
export const uploadDocumentWithoutConversation = async (file) => {
  try {
    if (!file) {
      throw new Error('Arquivo não fornecido');
    }
    
    // Criar FormData para o arquivo
    const formData = new FormData();
    formData.append('file', file);
    
    // Upload sem conversationId
    const response = await api.post('/documents/upload-temp', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    // Normalizar a resposta
    const responseData = response.data;
    let documentId = null;
    
    // Extrair ID do documento de forma robusta
    if (responseData?.documentId) {
      documentId = responseData.documentId;
    } else if (responseData?.document_id) {
      documentId = responseData.document_id;
    } else if (responseData?.data?.documentId) {
      documentId = responseData.data.documentId;
    } else if (responseData?.data?.document_id) {
      documentId = responseData.data.document_id;
    }
    
    return {
      ...responseData,
      documentId,
      status: responseData.status || 'success'
    };
  } catch (error) {
    console.error('Erro ao fazer upload temporário:', error);
    throw error;
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
    
    const response = await api.post(`/documents/${documentId}/associate`, {
      conversationId
    });
    
    return response.data;
  } catch (error) {
    console.error('Erro ao associar documento à conversa:', error);
    throw error;
  }
};

/**
 * Lista documentos temporários (ainda não associados a uma conversa)
 * 
 * @returns {Promise<Array>} - Lista de documentos temporários
 */
export const getTemporaryDocuments = async () => {
  try {
    const response = await api.get('/documents/temporary');
    
    // Normalizar a resposta
    let documents = [];
    
    if (Array.isArray(response.data)) {
      documents = response.data;
    } else if (response.data?.documents) {
      documents = response.data.documents;
    } else if (response.data?.data?.documents) {
      documents = response.data.data.documents;
    } else if (Array.isArray(response.data?.data)) {
      documents = response.data.data;
    }
    
    return {
      status: 'success',
      data: {
        documents
      }
    };
  } catch (error) {
    console.error('Erro ao obter documentos temporários:', error);
    throw error;
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
    
    const response = await api.get(`/documents/conversation/${conversationId}`);
    
    // Normalizar a resposta
    let documents = [];
    
    if (Array.isArray(response.data)) {
      documents = response.data;
    } else if (response.data?.documents) {
      documents = response.data.documents;
    } else if (response.data?.data?.documents) {
      documents = response.data.data.documents;
    } else if (Array.isArray(response.data?.data)) {
      documents = response.data.data;
    }
    
    return {
      status: 'success',
      data: {
        documents
      }
    };
  } catch (error) {
    console.error('Erro ao obter documentos da conversa:', error);
    throw error;
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
    
    const response = await api.get(`/documents/${documentId}/content`);
    return response.data;
  } catch (error) {
    console.error('Erro ao obter conteúdo do documento:', error);
    throw error;
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
        const response = await api.get(`/documents/${documentId}/status`);
        console.log(`Resposta de status (tentativa ${attempts+1}):`, response.data);
        
        // Normalizar a extração do status para lidar com diferentes formatos de resposta
        let status = null;
        let progress = 0;
        let documentData = null;
        
        // Extrair status de forma robusta - MELHORADO
        if (response.data?.status) {
          status = response.data.status;
        } else if (response.data?.data?.status) {
          status = response.data.data.status;
        } else if (response.data?.document?.status) {
          status = response.data.document.status;
        }
        
        // Verificação adicional para novos formatos de resposta
        if (!status && response.data) {
          // Procurar campo 'status' em qualquer nível do objeto de resposta
          const searchStatus = (obj) => {
            if (!obj || typeof obj !== 'object') return null;
            if (obj.status) return obj.status;
            for (const key in obj) {
              if (typeof obj[key] === 'object') {
                const foundStatus = searchStatus(obj[key]);
                if (foundStatus) return foundStatus;
              }
            }
            return null;
          };
          
          status = searchStatus(response.data);
        }
        
        // Extrair progresso de forma robusta
        if (response.data?.progress !== undefined) {
          progress = response.data.progress;
        } else if (response.data?.data?.processing_progress !== undefined) {
          progress = response.data.data.processing_progress;
        } else if (response.data?.data?.progress !== undefined) {
          progress = response.data.data.progress;
        }
        
        // Extrair dados do documento
        if (response.data?.document) {
          documentData = response.data.document;
        } else if (response.data?.data) {
          documentData = response.data.data;
        }
        
        console.log(`Status extraído: ${status}, Progresso: ${progress}`);
        
        // CORREÇÃO: Checar mais possíveis valores para status "concluído"
        const completedStatuses = ['completed', 'complete', 'finalizado', 'concluído', 'concluido', 'success'];
        const errorStatuses = ['error', 'failed', 'erro', 'falha'];
        
        if (completedStatuses.includes(status?.toLowerCase())) {
          // Processamento concluído com sucesso
          resolve({ 
            success: true, 
            document: documentData,
            progress: 100,
            status: 'completed'
          });
        } else if (errorStatuses.includes(status?.toLowerCase())) {
          // Extrair mensagem de erro de forma robusta
          let errorMessage = 'Erro ao processar documento';
          
          if (response.data?.message) {
            errorMessage = response.data.message;
          } else if (response.data?.data?.processing_error) {
            errorMessage = response.data.data.processing_error;
          } else if (response.data?.error) {
            errorMessage = response.data.error;
          }
          
          // Erro no processamento
          reject({ 
            success: false, 
            error: errorMessage,
            progress
          });
        } else if (attempts >= maxAttempts) {
          // Limite de tentativas atingido
          console.error(`Timeout após ${maxAttempts} tentativas. Último status: ${status}`);
          reject({ 
            success: false, 
            error: 'Tempo limite excedido para processamento do documento',
            progress
          });
        } else {
          // Continuar esperando
          attempts++;
          
          // Emitir evento de progresso se estiver definido
          if (window.dispatchEvent && typeof CustomEvent === 'function') {
            window.dispatchEvent(new CustomEvent('document-processing-progress', {
              detail: {
                documentId,
                progress,
                status
              }
            }));
          }
          
          setTimeout(() => {
            pollStatus().then(resolve).catch(reject);
          }, interval);
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
    
    const response = await api.delete(`/documents/${documentId}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao excluir documento:', error);
    throw error;
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
    
    const response = await api.get('/documents/search', { params });
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar documentos:', error);
    throw error;
  }
};

/**
 * Obtém metadados de um documento
 * 
 * @param {string} documentId - ID do documento
 * @returns {Promise<Object>} - Resposta com metadados
 */
export const getDocumentMetadata = async (documentId) => {
  try {
    if (!documentId) {
      throw new Error('ID do documento não fornecido');
    }
    
    const response = await api.get(`/documents/${documentId}/metadata`);
    return response.data;
  } catch (error) {
    console.error('Erro ao obter metadados do documento:', error);
    throw error;
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
    
    const response = await api.get(`/documents/${documentId}/status`);
    return response.data;
  } catch (error) {
    console.error('Erro ao obter status do documento:', error);
    throw error;
  }
};

/**
 * Extrai texto de uma página específica de um documento
 * 
 * @param {string} documentId - ID do documento
 * @param {number} pageNumber - Número da página
 * @returns {Promise<Object>} - Resposta com texto extraído
 */
export const getPageText = async (documentId, pageNumber) => {
  try {
    if (!documentId) {
      throw new Error('ID do documento não fornecido');
    }
    
    if (!pageNumber && pageNumber !== 0) {
      throw new Error('Número da página não fornecido');
    }
    
    const response = await api.get(`/documents/${documentId}/pages/${pageNumber}/text`);
    return response.data;
  } catch (error) {
    console.error('Erro ao obter texto da página:', error);
    throw error;
  }
};

/**
 * Obtém uma visualização em miniatura de uma página do documento
 * 
 * @param {string} documentId - ID do documento
 * @param {number} pageNumber - Número da página
 * @param {string} size - Tamanho da miniatura (small, medium, large)
 * @returns {Promise<Object>} - Resposta com URL da miniatura
 */
export const getPageThumbnail = async (documentId, pageNumber, size = 'medium') => {
  try {
    if (!documentId) {
      throw new Error('ID do documento não fornecido');
    }
    
    if (!pageNumber && pageNumber !== 0) {
      throw new Error('Número da página não fornecido');
    }
    
    const response = await api.get(`/documents/${documentId}/pages/${pageNumber}/thumbnail`, {
      params: { size }
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao obter miniatura da página:', error);
    throw error;
  }
};

/**
 * Atualiza metadados de um documento
 * 
 * @param {string} documentId - ID do documento
 * @param {Object} metadata - Novos metadados
 * @returns {Promise<Object>} - Resposta com documento atualizado
 */
export const updateDocumentMetadata = async (documentId, metadata) => {
  try {
    if (!documentId) {
      throw new Error('ID do documento não fornecido');
    }
    
    if (!metadata || Object.keys(metadata).length === 0) {
      throw new Error('Metadados não fornecidos');
    }
    
    const response = await api.patch(`/documents/${documentId}/metadata`, metadata);
    return response.data;
  } catch (error) {
    console.error('Erro ao atualizar metadados do documento:', error);
    throw error;
  }
};

/**
 * Compartilha um documento com outro usuário
 * 
 * @param {string} documentId - ID do documento
 * @param {string} userId - ID do usuário para compartilhar
 * @param {string} permission - Nível de permissão (read, write, admin)
 * @returns {Promise<Object>} - Resposta com resultado do compartilhamento
 */
export const shareDocument = async (documentId, userId, permission = 'read') => {
  try {
    if (!documentId) {
      throw new Error('ID do documento não fornecido');
    }
    
    if (!userId) {
      throw new Error('ID do usuário não fornecido');
    }
    
    const response = await api.post(`/documents/${documentId}/share`, {
      user_id: userId,
      permission
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao compartilhar documento:', error);
    throw error;
  }
};

// Manipulação de eventos de progresso de processamento
export const subscribeToProcessingProgress = (documentId, callback) => {
  const handler = (event) => {
    if (event.detail.documentId === documentId) {
      callback(event.detail);
    }
  };
  
  window.addEventListener('document-processing-progress', handler);
  
  // Retornar função para cancelar inscrição
  return () => {
    window.removeEventListener('document-processing-progress', handler);
  };
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
    
    // CORREÇÃO: URL correta sem o prefixo /api
    const response = await api.get('/documents', { params });
    
    // Normalizar a resposta para um formato consistente
    let documents = [];
    let status = 'success';
    
    if (Array.isArray(response.data)) {
      documents = response.data;
    } else if (response.data?.documents) {
      documents = response.data.documents;
      status = response.data.status || status;
    } else if (response.data?.data?.documents) {
      documents = response.data.data.documents;
      status = response.data.status || status;
    } else if (Array.isArray(response.data?.data)) {
      documents = response.data.data;
      status = response.data.status || status;
    }
    
    return {
      status,
      data: {
        documents
      }
    };
  } catch (error) {
    console.error('Erro ao obter documentos do usuário:', error);
    throw error;
  }
};

const documentService = {
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
  getDocumentMetadata,
  getDocumentStatus,
  getPageText,
  getPageThumbnail,
  updateDocumentMetadata,
  shareDocument,
  subscribeToProcessingProgress,
  getUserDocuments
};

export default documentService;