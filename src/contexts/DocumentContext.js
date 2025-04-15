import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useDocumentProcessor } from '../hooks/useDocumentProcessor';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { 
  getUserDocuments,
  getDocumentContent,
  deleteDocument,
  associateDocumentWithConversation
} from '../services/documentService';
import { isCompleted } from '../constants/documentStatus';

// Criar contexto
const DocumentContext = createContext({});

/**
 * Provider para gerenciamento de documentos
 * Expandido para centralizar funcionalidades de documentos
 */
export const DocumentProvider = ({ children }) => {
  const [allDocuments, setAllDocuments] = useState([]);
  const [conversationDocuments, setConversationDocuments] = useState({});
  const [activeDocument, setActiveDocument] = useState(null);
  const [activeContent, setActiveContent] = useState(null);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const {
    processorStatus,
    checkProcessorHealth,
    uploadStatus,
    processDocument
  } = useDocumentProcessor(activeConversationId);
  
  const { error, handleError, clearError } = useErrorHandler();

  // Carregar todos os documentos do usuário
  const loadAllDocuments = useCallback(async () => {
    setIsLoading(true);
    clearError();
    
    try {
      const response = await getUserDocuments();
      
      if (response.status === 'success' && response.data) {
        setAllDocuments(response.data.documents || []);
      }
    } catch (error) {
      handleError(error, 'Erro ao carregar documentos do usuário');
    } finally {
      setIsLoading(false);
    }
  }, [handleError, clearError]);

  // Carregar documentos para uma conversa específica
  const loadConversationDocuments = useCallback(async (conversationId) => {
    if (!conversationId) return;
    
    setIsLoading(true);
    clearError();
    
    try {
      const response = await getUserDocuments(conversationId);
      
      if (response.status === 'success' && response.data) {
        setConversationDocuments(prev => ({
          ...prev,
          [conversationId]: response.data.documents || []
        }));
      }
    } catch (error) {
      handleError(error, 'Erro ao carregar documentos da conversa');
    } finally {
      setIsLoading(false);
    }
  }, [handleError, clearError]);

  // Definir a conversa ativa
  const setConversation = useCallback((conversationId) => {
    setActiveConversationId(conversationId);
    
    // Carregar documentos se conversationId for fornecido
    if (conversationId) {
      loadConversationDocuments(conversationId);
    }
  }, [loadConversationDocuments]);

  // Upload de documento
  const uploadDocument = useCallback(async (file) => {
    if (!file || !activeConversationId) {
      handleError(new Error('Arquivo ou ID da conversa não fornecido'));
      return { success: false };
    }
    
    const result = await processDocument(file);
    
    if (result.success) {
      // Recarregar documentos da conversa após upload bem-sucedido
      await loadConversationDocuments(activeConversationId);
    }
    
    return result;
  }, [activeConversationId, processDocument, loadConversationDocuments, handleError]);

  // Visualizar documento
  const viewDocument = useCallback(async (document) => {
    if (!document || !document.document_id) {
      handleError(new Error('Documento inválido'));
      return;
    }
    
    setActiveDocument(document);
    setActiveContent(null);
    setIsLoading(true);
    
    try {
      const response = await getDocumentContent(document.document_id);
      
      if (response.status === 'success' && response.data) {
        setActiveContent(response.data);
      }
    } catch (error) {
      handleError(error, 'Erro ao obter conteúdo do documento');
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  // Excluir documento
  const deleteDocumentById = useCallback(async (documentId) => {
    if (!documentId) {
      handleError(new Error('ID do documento não fornecido'));
      return { success: false };
    }
    
    setIsLoading(true);
    
    try {
      await deleteDocument(documentId);
      
      // Atualizar listas de documentos
      setAllDocuments(prev => prev.filter(doc => doc.document_id !== documentId));
      
      // Atualizar documentos de conversas
      setConversationDocuments(prev => {
        const updated = { ...prev };
        
        // Remover o documento de todas as conversas
        for (const convId in updated) {
          updated[convId] = updated[convId].filter(doc => doc.document_id !== documentId);
        }
        
        return updated;
      });
      
      // Limpar documento ativo se necessário
      if (activeDocument?.document_id === documentId) {
        setActiveDocument(null);
        setActiveContent(null);
      }
      
      return { success: true };
    } catch (error) {
      handleError(error, 'Erro ao excluir documento');
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  }, [activeDocument, handleError]);

  // Associar documento com conversa
  const associateWithConversation = useCallback(async (documentId, conversationId) => {
    if (!documentId || !conversationId) {
      handleError(new Error('ID do documento e da conversa são obrigatórios'));
      return { success: false };
    }
    
    setIsLoading(true);
    
    try {
      await associateDocumentWithConversation(documentId, conversationId);
      
      // Recarregar documentos se for a conversa ativa
      if (conversationId === activeConversationId) {
        await loadConversationDocuments(conversationId);
      }
      
      return { success: true };
    } catch (error) {
      handleError(error, 'Erro ao associar documento à conversa');
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  }, [activeConversationId, loadConversationDocuments, handleError]);

  // Verificar se um documento pode ser visualizado
  const canViewDocument = useCallback((document) => {
    if (!document) return false;
    return isCompleted(document.status);
  }, []);

  // Obter documentos para a conversa ativa
  const getActiveConversationDocuments = useCallback(() => {
    if (!activeConversationId) return [];
    return conversationDocuments[activeConversationId] || [];
  }, [activeConversationId, conversationDocuments]);

  // Context value
  const value = {
    // Estado
    allDocuments,
    conversationDocuments,
    activeDocument,
    activeContent,
    activeConversationId,
    isLoading,
    error,
    uploadStatus,
    processorStatus,
    
    // Métodos
    loadAllDocuments,
    loadConversationDocuments,
    setConversation,
    uploadDocument,
    viewDocument,
    deleteDocument: deleteDocumentById,
    associateWithConversation,
    canViewDocument,
    getActiveConversationDocuments,
    checkProcessorHealth
  };

  return (
    <DocumentContext.Provider value={value}>
      {children}
    </DocumentContext.Provider>
  );
};

// Hook personalizado para usar o contexto
export const useDocumentContext = () => {
  const context = useContext(DocumentContext);
  
  if (!context) {
    throw new Error('useDocumentContext deve ser usado dentro de um DocumentProvider');
  }
  
  return context;
};

export default DocumentContext;