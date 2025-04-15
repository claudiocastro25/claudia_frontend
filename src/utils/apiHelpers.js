/**
 * Funções utilitárias para trabalhar com a API
 * Normaliza e simplifica o tratamento de respostas
 */

// Extrair dados de diferentes formatos de resposta
export const extractDataFromResponse = (response) => {
  if (!response) return null;
  
  // Verificar caminhos possíveis para dados
  if (response.data?.data) return response.data.data;
  if (response.data) return response.data;
  return response;
};

// Extrair ID de documento de diferentes formatos de resposta
export const extractDocumentId = (response) => {
  if (!response) return null;
  
  // Verificar em todas as localizações possíveis
  if (response.documentId) return response.documentId;
  if (response.document_id) return response.document_id;
  if (response.data?.documentId) return response.data.documentId;
  if (response.data?.document_id) return response.data.document_id;
  if (response.data?.data?.documentId) return response.data.data.documentId;
  if (response.data?.data?.document_id) return response.data.data.document_id;
  
  // Verificar em qualquer campo que contenha "id" e "document"
  const searchDocument = (obj) => {
    if (!obj || typeof obj !== 'object') return null;
    
    // Verificar campos diretos
    for (const key in obj) {
      if ((key === 'documentId' || key === 'document_id' || key === 'id') && 
          typeof obj[key] === 'string') {
        return obj[key];
      }
    }
    
    // Busca recursiva em objetos aninhados
    for (const key in obj) {
      if (typeof obj[key] === 'object') {
        const foundId = searchDocument(obj[key]);
        if (foundId) return foundId;
      }
    }
    
    return null;
  };
  
  return searchDocument(response);
};

// Extrair status de documento de diferentes formatos de resposta
export const extractDocumentStatus = (response) => {
  if (!response) return null;
  
  // Verificar em todas as localizações possíveis
  if (response.status) return response.status;
  if (response.data?.status) return response.data.status;
  if (response.data?.data?.status) return response.data.data.status;
  if (response.document?.status) return response.document.status;
  if (response.data?.document?.status) return response.data.document.status;
  
  return null;
};

// Extrair conversas de diferentes formatos de resposta
export const extractConversationsFromResponse = (response) => {
  if (!response) return [];
  
  // Verificar em todas as localizações possíveis
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.data)) return response.data;
  if (response.data?.conversations) return response.data.conversations;
  if (response.data?.data?.conversations) return response.data.data.conversations;
  if (response.conversations) return response.conversations;
  
  return [];
};

// Extrair mensagens de diferentes formatos de resposta
export const extractMessagesFromResponse = (response) => {
  if (!response) return [];
  
  // Verificar em todas as localizações possíveis
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.data)) return response.data;
  if (response.data?.messages) return response.data.messages;
  if (response.data?.data?.messages) return response.data.data.messages;
  if (response.messages) return response.messages;
  
  return [];
};

// Verificar se uma resposta indica sucesso
export const isSuccessResponse = (response) => {
  if (!response) return false;
  
  // Verificar estruturas comuns
  if (response.status === 'success') return true;
  if (response.data?.status === 'success') return true;
  if (response.success === true) return true;
  if (response.data?.success === true) return true;
  
  // Verificar código de status HTTP
  if (response.status >= 200 && response.status < 300) return true;
  
  return false;
};