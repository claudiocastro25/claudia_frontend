import { useState, useEffect } from 'react';
import { useErrorHandler } from './useErrorHandler';
import { 
  uploadDocument, 
  pollDocumentStatus, 
  checkDocumentProcessorHealth 
} from '../services/documentService';
import { DOCUMENT_STATUS } from '../constants/documentStatus';

/**
 * Hook centralizado para processamento de documentos
 * Elimina código duplicado em diferentes partes da aplicação
 */
export const useDocumentProcessor = (conversationId) => {
  const [uploadStatus, setUploadStatus] = useState({
    active: false,
    documentId: null,
    filename: null,
    progress: 0,
    error: null,
    status: null
  });
  
  const [processorStatus, setProcessorStatus] = useState({
    available: false,
    checked: false,
    message: 'Verificando disponibilidade...'
  });
  
  const { handleError, showErrorMessage } = useErrorHandler();
  
  // Verificar status do processador ao inicializar
  useEffect(() => {
    checkProcessorHealth();
  }, []);
  
  // Verificação de saúde do processador
  const checkProcessorHealth = async () => {
    try {
      setProcessorStatus({
        ...processorStatus,
        message: 'Verificando disponibilidade do processador...'
      });
      
      const health = await checkDocumentProcessorHealth();
      
      setProcessorStatus({
        available: health.available,
        checked: true,
        message: health.message || (health.available 
          ? 'Serviço de processamento disponível' 
          : 'Serviço de processamento indisponível')
      });
    } catch (error) {
      handleError(error, 'Erro ao verificar disponibilidade do processador');
      setProcessorStatus({
        available: false,
        checked: true,
        message: 'Erro ao verificar status do processador'
      });
    }
  };
  
  // Upload de documento
  const processDocument = async (file) => {
    if (!file || !processorStatus.available || !conversationId) {
      showErrorMessage(
        !processorStatus.available 
          ? 'Serviço de processamento indisponível' 
          : !conversationId 
            ? 'Selecione ou crie uma conversa primeiro' 
            : 'Nenhum arquivo selecionado'
      );
      return { success: false };
    }
    
    try {
      // Atualizar estado para mostrar progresso inicial
      setUploadStatus({
        active: true,
        documentId: null,
        filename: file.name,
        progress: 10,
        error: null,
        status: DOCUMENT_STATUS.UPLOADING
      });
      
      // Fazer upload do documento
      const response = await uploadDocument(file, conversationId);
      
      // Atualizar progresso após upload
      setUploadStatus(prev => ({
        ...prev,
        progress: 40,
        status: DOCUMENT_STATUS.PROCESSING
      }));
      
      // Obter ID do documento
      const documentId = response.documentId || response.document_id || 
        (response.data && (response.data.documentId || response.data.document_id));
      
      if (!documentId) {
        throw new Error('Não foi possível obter o ID do documento');
      }
      
      // Atualizar estado com ID do documento
      setUploadStatus(prev => ({
        ...prev,
        documentId,
        progress: 60,
        status: DOCUMENT_STATUS.ANALYZING
      }));
      
      // Iniciar polling para verificar status
      const pollResult = await pollDocumentStatus(documentId);
      
      if (pollResult.success) {
        // Upload concluído com sucesso
        setUploadStatus(prev => ({
          ...prev,
          active: false,
          progress: 100,
          status: DOCUMENT_STATUS.COMPLETED
        }));
        
        // Limpar estado após um delay para permitir que a mensagem seja vista
        setTimeout(() => {
          setUploadStatus({
            active: false,
            documentId: null,
            filename: null,
            progress: 0,
            error: null,
            status: null
          });
        }, 5000);
        
        return { 
          success: true, 
          documentId, 
          filename: file.name
        };
      } else {
        throw new Error(pollResult.error || 'Erro durante o processamento do documento');
      }
    } catch (error) {
      const errorMessage = error.message || 'Erro desconhecido';
      
      // Atualizar estado com erro
      setUploadStatus(prev => ({
        ...prev,
        active: false,
        progress: 0,
        error: errorMessage,
        status: DOCUMENT_STATUS.ERROR
      }));
      
      handleError(error, `Erro ao processar "${file.name}"`);
      
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  };
  
  // Cancelar processamento atual
  const cancelProcessing = () => {
    setUploadStatus({
      active: false,
      documentId: null,
      filename: null,
      progress: 0,
      error: null,
      status: null
    });
  };
  
  return {
    processorStatus,
    checkProcessorHealth,
    uploadStatus,
    processDocument,
    cancelProcessing
  };
};