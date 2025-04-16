// Arquivo: src/services/chatService.js
import api from './api';
import { adaptApiResponse, parseApiError } from './serviceAdapter';

// Sistema de cache para evitar chamadas repetidas
const conversationCache = {};
const CACHE_DURATION = 2000; // 2 segundos

/**
 * Cria uma nova conversa
 * @param {string} title - Título da conversa
 * @returns {Promise} - Promessa com a resposta
 */
export const createConversation = async (title = 'Nova Conversa') => {
  try {
    console.log(`Criando nova conversa com título: "${title}"`);
    const response = await api.post('/api/chat/conversations', { title });
    
    // Log da resposta bruta para depuração
    console.log('Resposta bruta da API:', response?.data);
    
    // Antes de adaptar, verificar se a resposta tem a estrutura esperada
    if (response && response.data && response.data.data && response.data.data.conversation) {
      console.log('Conversa criada com sucesso:', response.data.data.conversation.conversation_id);
      return response.data;
    }
    
    // Se não tem a estrutura esperada, tentar adaptar
    const result = adaptApiResponse(response);
    
    // Verificar estrutura após adaptação
    if (result.data && !result.data.conversation) {
      const actualResponse = response?.data;
      // Verificar se conversation está em algum lugar inesperado
      if (actualResponse && typeof actualResponse === 'object') {
        // Procurar conversation_id diretamente na resposta
        if (actualResponse.conversation_id) {
          // Transformar em um formato compatível
          result.data = {
            conversation: {
              conversation_id: actualResponse.conversation_id,
              title: actualResponse.title || title,
              ...actualResponse
            }
          };
          console.log('Encontrado conversation_id diretamente na resposta:', actualResponse.conversation_id);
        } 
        // Ver se a estrutura está um nível mais profundo
        else if (actualResponse.data && actualResponse.data.conversation_id) {
          result.data = {
            conversation: {
              conversation_id: actualResponse.data.conversation_id,
              title: actualResponse.data.title || title,
              ...actualResponse.data
            }
          };
          console.log('Encontrado conversation_id um nível mais profundo:', actualResponse.data.conversation_id);
        }
        // Ver se conversation está diretamente no resultado da consulta SQL
        else if (result.data.conversation_id) {
          result.data = {
            conversation: {
              ...result.data
            }
          };
          console.log('Encontrado conversation_id no resultado adaptado:', result.data.conversation.conversation_id);
        }
        // Verificar se a resposta tem uma linha de conversação
        else if (actualResponse.rows && actualResponse.rows[0] && actualResponse.rows[0].conversation_id) {
          result.data = {
            conversation: actualResponse.rows[0]
          };
          console.log('Encontrado conversation_id nas linhas da resposta:', actualResponse.rows[0].conversation_id);
        }
        // Verificar o formato exato retornado pelo controlador e construir resposta correspondente
        else if (actualResponse.status === 'success' && actualResponse.data && actualResponse.data.conversation) {
          // Já está no formato certo, só garantir que está em result.data
          result.data = actualResponse.data;
          console.log('Formato correto já está na resposta:', actualResponse.data.conversation.conversation_id);
        }
      }
    }
    
    // Verificação final da estrutura
    if (!result.data || !result.data.conversation || !result.data.conversation.conversation_id) {
      console.error("Resposta da API em formato incorreto:", result);
      
      // Resposta exata do chatController.js com formato esperado
      // Vamos tentar uma última vez com a estrutura exata que o controlador retorna
      if (response.data && response.data.status === 'success' && 
          response.data.data && response.data.data.conversation) {
        console.log("Usando formato original da API");
        return response.data;
      }
      
      throw new Error('Falha ao criar nova conversa - ID da conversa não encontrado');
    }
    
    console.log('Conversa criada com sucesso:', result.data.conversation.conversation_id);
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
  
  // Verificar se há uma versão em cache válida
  const cached = conversationCache[conversationId];
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`Usando cache para conversa: ${conversationId}`);
    return cached.data;
  }
  
  try {
    console.log(`Obtendo conversa: ${conversationId}`);
    const response = await api.get(`/api/chat/conversations/${conversationId}`);
    
    const result = adaptApiResponse(response);
    console.log(`Conversa obtida com sucesso, ${result.data?.messages?.length || 0} mensagens`);
    
    // Atualizar cache
    conversationCache[conversationId] = {
      data: result,
      timestamp: Date.now()
    };
    
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
      
    // Invalidar o cache da conversa após nova mensagem
    if (conversationCache[conversationId]) {
      delete conversationCache[conversationId];
    }
    
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
    
    // Remover da cache se existir
    if (conversationCache[conversationId]) {
      delete conversationCache[conversationId];
    }
    
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
    
    // Invalidar o cache após atualização
    if (conversationCache[conversationId]) {
      delete conversationCache[conversationId];
    }
    
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
  
  // Verificar cache primeiro
  if (conversationCache[conversationId]) {
    return true;
  }
  
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

/**
 * Limpa o cache de uma conversa específica ou de todas
 * @param {string} conversationId - ID da conversa (opcional)
 */
export const clearConversationCache = (conversationId = null) => {
  if (conversationId) {
    if (conversationCache[conversationId]) {
      delete conversationCache[conversationId];
      console.log(`Cache limpo para conversa: ${conversationId}`);
    }
  } else {
    // Limpar todo o cache
    Object.keys(conversationCache).forEach(key => delete conversationCache[key]);
    console.log('Cache de conversas completamente limpo');
  }
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
  generateRagFeedback,
  clearConversationCache
};