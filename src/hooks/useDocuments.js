import { useState, useCallback, useEffect } from 'react';
import documentService from '../services/documentService';

/**
 * Hook para gerenciamento de documentos
 */
const useDocuments = (conversationId) => {
  const [documents, setDocuments] = useState([]);
  const [activeDocument, setActiveDocument] = useState(null);
  const [documentContent, setDocumentContent] = useState(null);
  const [uploadStatus, setUploadStatus] = useState({
    active: false,
    documentId: null,
    filename: null,
    progress: 0,
    error: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [processorStatus, setProcessorStatus] = useState({
    available: false,
    checked: false,
    message: 'Verificando status do processador...'
  });

  // Verificar status do processador de documentos
  useEffect(() => {
    const checkProcessor = async () => {
      try {
        const health = await documentService.checkDocumentProcessorHealth();
        setProcessorStatus({
          available: health.status === 'available',
          checked: true,
          message: health.message || 'Serviço de processamento disponível'
        });
      } catch (err) {
        console.error('Erro ao verificar status do processador:', err);
        setProcessorStatus({
          available: false,
          checked: true,
          message: 'Serviço de processamento indisponível'
        });
      }
    };
    
    checkProcessor();
  }, []);

  // Carregar documentos quando a conversa muda
  useEffect(() => {
    if (conversationId) {
      loadDocuments();
    } else {
      setDocuments([]);
    }
  }, [conversationId]);

  /**
   * Carrega documentos associados à conversa
   */
  const loadDocuments = useCallback(async () => {
    if (!conversationId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await documentService.getUserDocuments(conversationId);
      if (response.status === 'success' && response.data) {
        setDocuments(response.data.documents || []);
      }
      setLoading(false);
    } catch (err) {
      console.error('Erro ao carregar documentos:', err);
      setError('Erro ao carregar documentos');
      setLoading(false);
    }
  }, [conversationId]);

  /**
   * Faz upload de um documento
   */
  const uploadDocument = useCallback(async (file) => {
    if (!file || !conversationId || !processorStatus.available) {
      setError('Não é possível fazer upload agora');
      return;
    }
    
    setUploadStatus({
      active: true,
      documentId: null,
      filename: file.name,
      progress: 10,
      error: null
    });
    
    try {
      // Upload do documento
      const uploadResponse = await documentService.uploadDocument(file, conversationId);
      
      // Update progress
      setUploadStatus(prev => ({
        ...prev,
        progress: 40
      }));
      
      // Get document ID
      const documentId = uploadResponse?.documentId || uploadResponse?.document_id;
      if (!documentId) {
        throw new Error('Não foi possível obter o ID do documento');
      }
      
      // Update status with document ID
      setUploadStatus(prev => ({
        ...prev,
        documentId,
        progress: 60
      }));
      
      // Poll for document status
      const pollResult = await documentService.pollDocumentStatus(documentId);
      
      if (pollResult.success) {
        // Upload complete
        setUploadStatus(prev => ({
          ...prev,
          active: false,
          progress: 100
        }));
        
        // Reload documents
        await loadDocuments();
        
        // Return success
        return {
          success: true,
          documentId,
          filename: file.name
        };
      } else {
        // Error in processing
        throw new Error(pollResult.error || 'Erro durante o processamento do documento');
      }
    } catch (err) {
      console.error('Erro no upload do documento:', err);
      
      // Update state with error
      setUploadStatus({
        active: false,
        documentId: null,
        filename: file.name,
        progress: 0,
        error: err.message || 'Erro desconhecido'
      });
      
      setError(`Erro ao processar "${file.name}": ${err.message || 'Erro desconhecido'}`);
      return {
        success: false,
        error: err.message
      };
    }
  }, [conversationId, processorStatus.available, loadDocuments]);

  /**
   * Visualiza um documento
   */
  const viewDocument = useCallback(async (document) => {
    if (!document || !document.document_id) {
      setError('Documento inválido');
      return;
    }
    
    setActiveDocument(document);
    setDocumentContent(null);
    setLoading(true);
    
    try {
      const response = await documentService.getDocumentContent(document.document_id);
      if (response.status === 'success' && response.data) {
        setDocumentContent(response.data);
      }
      setLoading(false);
    } catch (err) {
      console.error('Erro ao obter conteúdo do documento:', err);
      setError('Erro ao obter conteúdo do documento');
      setLoading(false);
    }
  }, []);

  /**
   * Exclui um documento
   */
  const deleteDocument = useCallback(async (documentId) => {
    if (!documentId) {
      setError('ID do documento não fornecido');
      return;
    }
    
    setLoading(true);
    
    try {
      await documentService.deleteDocument(documentId);
      
      // Atualiza lista removendo o documento excluído
      setDocuments(prev => prev.filter(doc => doc.document_id !== documentId));
      
      // Se for o documento ativo, limpar
      if (activeDocument?.document_id === documentId) {
        setActiveDocument(null);
        setDocumentContent(null);
      }
      
      setLoading(false);
      return { success: true };
    } catch (err) {
      console.error('Erro ao excluir documento:', err);
      setError('Erro ao excluir documento');
      setLoading(false);
      return { success: false, error: err.message };
    }
  }, [activeDocument]);

  /**
   * Associa um documento a uma conversa
   */
  const associateDocumentWithConversation = useCallback(async (documentId, targetConversationId) => {
    if (!documentId || !targetConversationId) {
      setError('ID do documento e da conversa são obrigatórios');
      return;
    }
    
    setLoading(true);
    
    try {
      await documentService.associateWithConversation(documentId, targetConversationId);
      setLoading(false);
      return { success: true };
    } catch (err) {
      console.error('Erro ao associar documento:', err);
      setError('Erro ao associar documento à conversa');
      setLoading(false);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Procura documentos por conteúdo
   */
  const searchDocuments = useCallback(async (query) => {
    if (!query || !conversationId) {
      return [];
    }
    
    setLoading(true);
    
    try {
      const response = await documentService.searchDocuments(query, conversationId);
      setLoading(false);
      
      if (response.status === 'success' && response.data) {
        return response.data.results || [];
      }
      
      return [];
    } catch (err) {
      console.error('Erro ao buscar documentos:', err);
      setError('Erro ao buscar documentos');
      setLoading(false);
      return [];
    }
  }, [conversationId]);

  /**
   * Verifica o status de um documento específico
   */
  const checkDocumentStatus = useCallback(async (documentId) => {
    if (!documentId) return null;
    
    try {
      const response = await documentService.getDocumentStatus(documentId);
      if (response.status === 'success' && response.data) {
        return response.data;
      }
      return null;
    } catch (err) {
      console.error('Erro ao verificar status do documento:', err);
      return null;
    }
  }, []);

  /**
   * Atualiza o status de um documento na lista
   */
  const updateDocumentStatus = useCallback((documentId, newStatus) => {
    setDocuments(prevDocs => 
      prevDocs.map(doc => 
        doc.document_id === documentId 
          ? { ...doc, status: newStatus } 
          : doc
      )
    );
  }, []);

  /**
   * Retorna mensagens amigáveis para o status de processamento
   */
  const getProcessingMessage = useCallback((status, progress) => {
    const messages = {
      uploading: [
        "Preparando documento para upload...",
        "Enviando documento...",
        "Transferindo arquivo...",
        "Quase lá! Finalizando envio..."
      ],
      processing: [
        "Iniciando processamento...",
        "Analisando estrutura do documento...",
        "Extraindo conteúdo relevante...",
        "Processando texto e dados..."
      ],
      analyzing: [
        "Aplicando IA para compreender o documento...",
        "Identificando conceitos importantes...",
        "Conectando informações...",
        "Preparando material para consulta..."
      ],
      finishing: [
        "Finalizando o processamento...",
        "Organizando os dados extraídos...",
        "Pronto para responder suas perguntas!",
        "Tudo certo! Documento pronto para uso."
      ]
    };
    
    // Determinar a fase atual
    let phase = "uploading";
    if (progress >= 25 && progress < 50) phase = "processing";
    else if (progress >= 50 && progress < 75) phase = "analyzing";
    else if (progress >= 75) phase = "finishing";
    
    // Escolher uma mensagem adequada da fase
    const phaseMessages = messages[phase];
    const index = Math.min(
      Math.floor((progress % 25) / 6.25),
      phaseMessages.length - 1
    );
    
    return phaseMessages[index];
  }, []);

  /**
   * Verifica se um documento pode ser visualizado
   */
  const canViewDocument = useCallback((document) => {
    if (!document) return false;
    return document.status === 'completed';
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
    deleteDocument,
    associateDocumentWithConversation,
    searchDocuments,
    checkDocumentStatus,
    updateDocumentStatus,
    getProcessingMessage,
    canViewDocument
  };
};

export { useDocuments };
export default useDocuments;