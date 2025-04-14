// Arquivo: src/services/chatService.js
import api from './api';
import { adaptApiResponse, parseApiError } from './serviceAdapter';

/**
 * Cria uma nova conversa
 * @param {string} title - Título da conversa
 * @returns {Promise} - Promessa com a resposta
 */
export const createConversation = async (title = 'Nova Conversa') => {
  try {
    console.log(`Criando nova conversa com título: "${title}"`);
    const response = await api.post('/api/chat/conversations', { title });
    
    const result = adaptApiResponse(response);
    console.log('Conversa criada com sucesso:', result);
    return result;
  } catch (error) {
    console.error('Chat service error:', error);
    throw parseApiError(error, 'Erro ao criar conversa');
  }
};

/**
 * Obtém todas as conversas do usuário
 * @returns {Promise} - Promessa com a resposta
 */
export const getConversations = async () => {
  try {
    const response = await api.get('/api/chat/conversations');
    return adaptApiResponse(response);
  } catch (error) {
    console.error('Chat service error:', error);
    throw parseApiError(error, 'Erro ao obter conversas');
  }
};

/**
 * Obtém uma conversa específica por ID
 * @param {string} conversationId - ID da conversa
 * @returns {Promise} - Promessa com a resposta
 */
export const getConversation = async (conversationId) => {
  if (!conversationId) {
    throw new Error('ID da conversa é obrigatório');
  }
  
  try {
    console.log(`Obtendo conversa: ${conversationId}`);
    const response = await api.get(`/api/chat/conversations/${conversationId}`);
    
    const result = adaptApiResponse(response);
    console.log(`Conversa obtida com sucesso, ${result.data?.messages?.length || 0} mensagens`);
    return result;
  } catch (error) {
    console.error('Chat service error:', error);
    
    // Tratamento específico para conversas não encontradas
    if (error.response && error.response.status === 404) {
      // Limpar referências locais à conversa
      try {
        if (localStorage.getItem('currentConversationId') === conversationId) {
          localStorage.removeItem('currentConversationId');
        }
      } catch (e) {
        // Ignorar erros de localStorage
      }
      
      throw {
        status: 'error',
        message: 'Conversa não encontrada ou foi excluída',
        notFound: true,
        code: 404
      };
    }
    
    throw parseApiError(error, 'Erro ao obter conversa');
  }
};

/**
 * Envia uma mensagem para uma conversa
 * @param {string} conversationId - ID da conversa
 * @param {string} content - Conteúdo da mensagem
 * @param {string} documentContext - Contexto de documentos (opcional)
 * @returns {Promise} - Promessa com a resposta
 */
export const sendMessage = async (conversationId, content, documentContext = null) => {
  if (!conversationId) {
    throw new Error('ID da conversa é obrigatório');
  }
  
  if (!content || typeof content !== 'string' || !content.trim()) {
    throw new Error('Conteúdo da mensagem é obrigatório');
  }
  
  try {
    console.log(`Enviando mensagem para conversa ${conversationId}${documentContext ? ' com contexto de documentos' : ''}`);
    
    // Montar o payload com o campo correto (message)
    const payload = {
      message: content
    };
    
    // Adicionar contexto de documentos se fornecido
    if (documentContext) {
      payload.document_context = documentContext;
      console.log(`Contexto de documentos fornecido: ${documentContext.length} caracteres`);
    }
    
    const response = await api.post(`/api/chat/conversations/${conversationId}/messages`, payload);
    
    const result = adaptApiResponse(response);
    console.log('Mensagem enviada com sucesso:', 
      result.data?.assistantMessage?.message_id || 'ID não encontrado');
    return result;
  } catch (error) {
    console.error('Chat service error:', error);
    
    // Tratamento específico para conversas não encontradas
    if (error.response && error.response.status === 404) {
      throw {
        status: 'error',
        message: 'Conversa não encontrada ou foi excluída',
        notFound: true,
        code: 404
      };
    }
    
    throw parseApiError(error, 'Erro ao enviar mensagem');
  }
};

/**
 * Exclui uma conversa
 * @param {string} conversationId - ID da conversa
 * @returns {Promise} - Promessa com a resposta
 */
export const deleteConversation = async (conversationId) => {
  if (!conversationId) {
    throw new Error('ID da conversa é obrigatório');
  }
  
  try {
    const response = await api.delete(`/api/chat/conversations/${conversationId}`);
    return adaptApiResponse(response);
  } catch (error) {
    console.error('Chat service error:', error);
    throw parseApiError(error, 'Erro ao excluir conversa');
  }
};

/**
 * Atualiza o título de uma conversa
 * @param {string} conversationId - ID da conversa
 * @param {string} title - Novo título
 * @returns {Promise} - Promessa com a resposta
 */
export const updateConversationTitle = async (conversationId, title) => {
  if (!conversationId) {
    throw new Error('ID da conversa é obrigatório');
  }
  
  if (!title || typeof title !== 'string' || !title.trim()) {
    throw new Error('Título válido é obrigatório');
  }
  
  try {
    const response = await api.patch(`/api/chat/conversations/${conversationId}`, { title });
    return adaptApiResponse(response);
  } catch (error) {
    console.error('Chat service error:', error);
    
    // Tratamento específico para conversas não encontradas
    if (error.response && error.response.status === 404) {
      throw {
        status: 'error',
        message: 'Conversa não encontrada ou foi excluída',
        notFound: true,
        code: 404
      };
    }
    
    throw parseApiError(error, 'Erro ao atualizar título da conversa');
  }
};

/**
 * Obtem sugestões de prompts
 * @param {string} category - Categoria de prompts
 * @returns {Promise} - Promessa com a resposta
 */
export const getPromptSuggestions = async (category = 'general') => {
  try {
    const response = await api.get(`/api/chat/prompts/suggestions?category=${category}`);
    return adaptApiResponse(response);
  } catch (error) {
    console.error('Chat service error:', error);
    throw parseApiError(error, 'Erro ao obter sugestões de prompts');
  }
};

/**
 * Verifica se uma conversa existe
 * @param {string} conversationId - ID da conversa a verificar
 * @returns {Promise<boolean>} - Promessa com resultado booleano
 */
export const checkConversationExists = async (conversationId) => {
  if (!conversationId) return false;
  
  try {
    // Usa HEAD para verificar existência sem baixar dados
    await api.head(`/api/chat/conversations/${conversationId}`);
    return true; // Se não lançar erro, a conversa existe
  } catch (error) {
    return false; // Se lançar erro, a conversa não existe
  }
};

/**
 * Gera feedback de contexto sobre o uso de RAG na resposta
 * @param {Object} ragInfo - Informações do RAG
 * @returns {string} - Feedback formatado para o usuário
 */
export const generateRagFeedback = (ragInfo) => {
  if (!ragInfo || !ragInfo.hasDocuments || !ragInfo.usedDocuments || ragInfo.usedDocuments.length === 0) {
    return '';
  }
  
  const docCount = ragInfo.usedDocuments.length;
  const docNames = ragInfo.usedDocuments
    .map(doc => doc.filename || doc.original_filename || 'Documento')
    .slice(0, 3)
    .join(', ');
  
  return `A resposta foi baseada em ${docCount} ${docCount === 1 ? 'documento' : 'documentos'}${docCount <= 3 ? `: ${docNames}` : ''}.`;
};

export default {
  createConversation,
  getConversations,
  getConversation,
  sendMessage,
  deleteConversation,
  updateConversationTitle,
  getPromptSuggestions,
  checkConversationExists,
  generateRagFeedback
};