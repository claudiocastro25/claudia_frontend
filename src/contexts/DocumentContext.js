// src/contexts/DocumentContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  checkDocumentProcessorHealth,
  uploadDocument, 
  pollDocumentStatus,
  getUserDocuments,
  getDocumentContent,
  associateDocumentWithConversation,
  deleteDocument
} from '../services/documentService';

const DocumentContext = createContext();

export function DocumentProvider({ children }) {
  // Estado centralizado
  const [documents, setDocuments] = useState([]);
  const [tempDocuments, setTempDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState({
    active: false,
    documentId: null,
    filename: null,
    error: null,
    progress: 0,
    status: null
  });
  const [processorStatus, setProcessorStatus] = useState({
    available: false,
    checked: false,
    message: 'Verificando disponibilidade do processador...'
  });
  const [error, setError] = useState(null);
  const [activeDocument, setActiveDocument] = useState(null);
  const [documentContent, setDocumentContent] = useState(null);

  // Verificar status do processador de documentos
  const checkProcessorHealth = useCallback(async () => {
    try {
      const health = await checkDocumentProcessorHealth();
      setProcessorStatus({
        available: health.available,
        checked: true,
        message: health.message
      });
      return health.available;
    } catch (error) {
      console.error('Erro ao verificar status do processador:', error);
      setProcessorStatus({
        available: false,
        checked: true,
        message: 'Erro ao verificar status do processador'
      });
      return false;
    }
  }, []);

  // Carregar documentos para uma conversa
  const loadDocuments = useCallback(async (conversationId) => {
    if (!conversationId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const response = await getUserDocuments(conversationId);
      
      if (response.status === 'success' && response.data) {
        setDocuments(response.data.documents || []);
        return response.data.documents || [];
      }
      return [];
    } catch (error) {
      console.error('Erro ao carregar documentos:', error);
      setError('Não foi possível carregar os documentos');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Carregar documentos temporários
  const loadTempDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await getUserDocuments();
      
      if (response.status === 'success' && response.data) {
        setTempDocuments(response.data.documents || []);
      }
    } catch (error) {
      console.error('Erro ao carregar documentos temporários:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fazer upload e associar um documento
  const uploadAndAssociateDocument = useCallback(async (file, conversationId) => {
    if (!file || !processorStatus.available) {
      return { success: false, error: 'Processador não disponível ou arquivo inválido' };
    }
    
    if (!conversationId) {
      return { success: false, error: 'ID de conversa não fornecido' };
    }
    
    try {
      // Iniciar upload
      setIsUploading(true);
      setUploadStatus({
        active: true,
        documentId: null,
        filename: file.name,
        error: null,
        progress: 10,
        status: 'uploading'
      });
      
      // Fazer upload
      const response = await uploadDocument(file, conversationId);
      const documentId = response.documentId;
      
      if (!documentId) {
        throw new Error('ID do documento não encontrado na resposta');
      }
      
      setUploadStatus(prev => ({
        ...prev,
        documentId,
        progress: 40,
        status: 'processing'
      }));
      
      // Polling do status
      const pollResult = await pollDocumentStatus(documentId);
      
      if (pollResult.success) {
        // Upload completo
        setUploadStatus(prev => ({
          ...prev,
          progress: 100,
          status: 'completed'
        }));
        
        // Reforçar a associação explicitamente
        await associateDocumentWithConversation(documentId, conversationId);
        
        // Recarregar documentos para atualizar a lista
        await loadDocuments(conversationId);
        
        // Limpar estado após delay
        setTimeout(() => {
          setIsUploading(false);
          setUploadStatus({
            active: false,
            documentId: null,
            filename: null,
            error: null,
            progress: 0,
            status: null
          });
        }, 3000);
        
        return { 
          success: true, 
          documentId, 
          filename: file.name 
        };
      } else {
        throw new Error(pollResult.error || 'Erro ao processar documento');
      }
    } catch (error) {
      console.error('Erro no upload do documento:', error);
      
      setUploadStatus(prev => ({
        ...prev,
        error: error.message || 'Erro desconhecido',
        status: 'error'
      }));
      
      setIsUploading(false);
      
      return { 
        success: false, 
        error: error.message || 'Erro desconhecido' 
      };
    }
  }, [processorStatus.available, loadDocuments]);

  // Visualizar documento
  const viewDocument = useCallback(async (documentId) => {
    if (!documentId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Encontrar documento na lista
      const doc = documents.find(d => d.document_id === documentId) || 
                tempDocuments.find(d => d.document_id === documentId);
      
      if (doc) {
        setActiveDocument(doc);
      }
      
      // Carregar conteúdo
      const response = await getDocumentContent(documentId);
      
      if (response.status === 'success' && response.data) {
        setDocumentContent(response.data);
        return response.data;
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao visualizar documento:', error);
      setError('Erro ao carregar conteúdo do documento');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [documents, tempDocuments]);

  // Excluir documento
  const removeDocument = useCallback(async (documentId) => {
    if (!documentId) return false;
    
    try {
      setIsLoading(true);
      await deleteDocument(documentId);
      
      // Atualizar listas
      setDocuments(prev => prev.filter(doc => doc.document_id !== documentId));
      setTempDocuments(prev => prev.filter(doc => doc.document_id !== documentId));
      
      // Limpar documento ativo se for o mesmo
      if (activeDocument && activeDocument.document_id === documentId) {
        setActiveDocument(null);
        setDocumentContent(null);
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao excluir documento:', error);
      setError('Erro ao excluir documento');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [activeDocument]);

  // Associar documento a uma conversa
  const associateDocument = useCallback(async (documentId, conversationId) => {
    if (!documentId || !conversationId) return false;
    
    try {
      setIsLoading(true);
      const response = await associateDocumentWithConversation(documentId, conversationId);
      
      if (response.status === 'success') {
        // Recarregar documentos para atualizar a lista
        await loadDocuments(conversationId);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Erro ao associar documento:', error);
      setError('Erro ao associar documento à conversa');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadDocuments]);

  // Verificar status do processador ao inicializar
  useEffect(() => {
    checkProcessorHealth();
  }, [checkProcessorHealth]);

  // Valor do contexto
  const contextValue = {
    // Estado
    documents,
    tempDocuments,
    isLoading,
    isUploading,
    uploadStatus,
    processorStatus,
    error,
    activeDocument,
    documentContent,
    
    // Métodos
    checkProcessorHealth,
    loadDocuments,
    loadTempDocuments,
    uploadAndAssociateDocument,
    viewDocument,
    removeDocument,
    associateDocument,
    
    // Limpar
    clearActiveDocument: () => {
      setActiveDocument(null);
      setDocumentContent(null);
    }
  };

  return (
    <DocumentContext.Provider value={contextValue}>
      {children}
    </DocumentContext.Provider>
  );
}

// Hook para usar o contexto
export function useDocuments() {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error('useDocuments deve ser usado dentro de um DocumentProvider');
  }
  return context;
}