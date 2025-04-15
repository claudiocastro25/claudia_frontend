import { useState, useCallback, useEffect } from 'react';
import { useErrorHandler } from './useErrorHandler';
import { 
  searchRelevantChunks, 
  formatChunksAsContext,
  processAssistantMessage,
  checkDocumentsStatus
} from '../services/unifiedDataService';

/**
 * Hook para gerenciamento de funcionalidades RAG
 * Refatorado para remover duplicação com useDocuments
 */
const useRAG = (conversationId) => {
  const [relevantChunks, setRelevantChunks] = useState([]);
  const [documentContext, setDocumentContext] = useState('');
  const [referenceInfo, setReferenceInfo] = useState([]);
  const [sourceDocuments, setSourceDocuments] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const { error, handleError, clearError } = useErrorHandler();

  // Limpar dados quando a conversa muda
  useEffect(() => {
    if (conversationId) {
      setRelevantChunks([]);
      setDocumentContext('');
      setReferenceInfo([]);
      setSourceDocuments([]);
    }
  }, [conversationId]);

  // Buscar contexto relevante para uma consulta
  const searchRelevantContext = useCallback(async (query) => {
    if (!conversationId || !query) return null;

    setIsSearching(true);
    clearError();

    try {
      const chunks = await searchRelevantChunks(query, conversationId);
      setRelevantChunks(chunks);

      // Formatar chunks como contexto
      const context = formatChunksAsContext(chunks);
      setDocumentContext(context);

      // Extrair informações de referência para uso posterior
      setReferenceInfo(chunks.map(chunk => ({
        documentId: chunk.document_id,
        documentName: chunk.original_filename || chunk.filename,
        pageNumber: chunk.metadata?.page,
        chunkIndex: chunk.chunk_index,
        matchType: chunk.match_type
      })));

      // Coletar documentos únicos
      const uniqueDocs = Array.from(
        new Set(chunks.map(chunk => chunk.document_id))
      ).map(docId => {
        const chunk = chunks.find(c => c.document_id === docId);
        return {
          documentId: docId,
          filename: chunk.original_filename || chunk.filename,
          fileType: chunk.file_type
        };
      });
      setSourceDocuments(uniqueDocs);

      setIsSearching(false);
      return { context, sourceInfo: referenceInfo };
    } catch (err) {
      handleError(err, 'Erro na busca RAG');
      setIsSearching(false);
      return null;
    }
  }, [conversationId, handleError, clearError]);

  // Processar resposta do assistente para detectar referências
  const processAssistantResponse = useCallback((messageContent) => {
    if (!messageContent) return { hasReferences: false };

    try {
      const result = processAssistantMessage(messageContent);
      return {
        ...result,
        relevantChunks,
        sourceDocuments
      };
    } catch (err) {
      handleError(err, 'Erro ao processar resposta do assistente');
      return { hasReferences: false };
    }
  }, [relevantChunks, sourceDocuments, handleError]);

  // Verificar status dos documentos na conversa
  const checkDocumentsAvailability = useCallback(async () => {
    if (!conversationId) return { hasDocuments: false };

    try {
      return await checkDocumentsStatus(conversationId);
    } catch (err) {
      handleError(err, 'Erro ao verificar status dos documentos');
      return { hasDocuments: false, error: err.message };
    }
  }, [conversationId, handleError]);

  return {
    // Estado
    relevantChunks,
    documentContext,
    referenceInfo,
    sourceDocuments,
    isSearching,
    error,
    
    // Métodos
    searchRelevantContext,
    processAssistantResponse,
    checkDocumentsStatus: checkDocumentsAvailability,
  };
};

export { useRAG };
export default useRAG;