import { useState, useCallback, useEffect } from 'react';
import { useErrorHandler } from './useErrorHandler';
import { useDocumentProcessor } from './useDocumentProcessor';
import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { isCompleted } from '../constants/documentStatus';
import { 
  getUserDocuments, 
  getDocumentContent,
  deleteDocument,
  associateDocumentWithConversation
} from '../services/documentService';

/**
 * Hook para gerenciamento de documentos
 * Refatorado para remover duplicação com useRAG e usar o DocumentProcessor
 */
const useDocuments = (conversationId) => {
  const [documents, setDocuments] = useState([]);
  const [activeDocument, setActiveDocument] = useState(null);
  const [documentContent, setDocumentContent] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const { error, handleError, clearError } = useErrorHandler();
  const { 
    processorStatus,
    uploadStatus, 
    processDocument,
    checkProcessorHealth
  } = useDocumentProcessor(conversationId);

  // Verificar status do processador ao inicializar
  useEffect(() => {
    checkProcessorHealth();
  }, [checkProcessorHealth]);

  // Carregar documentos quando a conversa muda
  useEffect(() => {
    if (conversationId) {
      loadDocuments();
    } else {
      setDocuments([]);
    }
  }, [conversationId]);

  // Carregar documentos da conversa atual
  const loadDocuments = useCallback(async () => {
    if (!conversationId) return;
    
    setLoading(true);
    clearError();
    
    try {
      const response = await getUserDocuments(conversationId);
      
      if (response.status === 'success' && response.data) {
        setDocuments(response.data.documents || []);
      }
    } catch (error) {
      handleError(error, 'Erro ao carregar documentos');
    } finally {
      setLoading(false);
    }
  }, [conversationId, handleError, clearError]);

  // Upload de documento - Agora usa o processDocument centralizado
  const uploadDocument = useCallback(async (file) => {
    if (!file || !conversationId) {
      handleError(new Error('ID da conversa ou arquivo não fornecido'));
      return { success: false };
    }
    
    const result = await processDocument(file);
    
    if (result.success) {
      // Recarregar documentos após um upload bem-sucedido
      await loadDocuments();
    }
    
    return result;
  }, [conversationId, processDocument, loadDocuments, handleError]);

  // Visualizar um documento
  const viewDocument = useCallback(async (document) => {
    if (!document || !document.document_id) {
      handleError(new Error('Documento inválido'));
      return;
    }
    
    setActiveDocument(document);
    setDocumentContent(null);
    setLoading(true);
    
    try {
      const response = await getDocumentContent(document.document_id);
      
      if (response.status === 'success' && response.data) {
        setDocumentContent(response.data);
      }
    } catch (error) {
      handleError(error, 'Erro ao obter conteúdo do documento');
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Excluir um documento
  const deleteDocumentById = useCallback(async (documentId) => {
    if (!documentId) {
      handleError(new Error('ID do documento não fornecido'));
      return { success: false };
    }
    
    setLoading(true);
    
    try {
      await deleteDocument(documentId);
      
      // Atualizar lista removendo o documento excluído
      setDocuments(prev => prev.filter(doc => doc.document_id !== documentId));
      
      // Se for o documento ativo, limpar
      if (activeDocument?.document_id === documentId) {
        setActiveDocument(null);
        setDocumentContent(null);
      }
      
      return { success: true };
    } catch (error) {
      handleError(error, 'Erro ao excluir documento');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [handleError, activeDocument]);

  // Associar documento com conversa
  const associateWithConversation = useCallback(async (documentId, targetConversationId) => {
    if (!documentId || !targetConversationId) {
      handleError(new Error('ID do documento e da conversa são obrigatórios'));
      return { success: false };
    }
    
    setLoading(true);
    
    try {
      await associateDocumentWithConversation(documentId, targetConversationId);
      
      // Recarregar documentos se a associação for para a conversa atual
      if (targetConversationId === conversationId) {
        await loadDocuments();
      }
      
      return { success: true };
    } catch (error) {
      handleError(error, 'Erro ao associar documento à conversa');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [conversationId, loadDocuments, handleError]);

  // Verificar se um documento pode ser visualizado
  const canViewDocument = useCallback((document) => {
    if (!document) return false;
    return isCompleted(document.status);
  }, []);

  return {
    // Estado
    documents,
    activeDocument,
    documentContent,
    uploadStatus,
    loading,
    error,
    processorStatus,
    
    // Métodos
    loadDocuments,
    uploadDocument,
    viewDocument,
    deleteDocument: deleteDocumentById,
    associateWithConversation,
    canViewDocument,
  };
};

export { useDocuments };
export default useDocuments;