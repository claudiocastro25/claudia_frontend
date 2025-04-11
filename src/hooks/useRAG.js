import { useState, useCallback, useEffect } from 'react';
import ragService from '../services/ragService';

/**
 * Hook para gerenciamento de funcionalidades RAG
 * (Retrieval Augmented Generation)
 */
const useRAG = (conversationId) => {
  const [relevantChunks, setRelevantChunks] = useState([]);
  const [documentContext, setDocumentContext] = useState('');
  const [referenceInfo, setReferenceInfo] = useState([]);
  const [sourceDocuments, setSourceDocuments] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);

  // Limpar dados quando a conversa muda
  useEffect(() => {
    if (conversationId) {
      setRelevantChunks([]);
      setDocumentContext('');
      setReferenceInfo([]);
      setSourceDocuments([]);
    }
  }, [conversationId]);

  /**
   * Busca chunks relevantes para uma consulta
   */
  const searchRelevantContext = useCallback(async (query) => {
    if (!conversationId || !query) return null;

    setIsSearching(true);
    setError(null);

    try {
      const chunks = await ragService.searchRelevantChunks(query, conversationId);
      setRelevantChunks(chunks);

      // Formatar chunks como contexto
      const context = ragService.formatChunksAsContext(chunks);
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
      console.error('Erro na busca RAG:', err);
      setError(err.message || 'Erro ao buscar contexto relevante');
      setIsSearching(false);
      return null;
    }
  }, [conversationId]);

  /**
   * Processa uma mensagem do assistente para detectar referências
   */
  const processAssistantResponse = useCallback((messageContent) => {
    if (!messageContent) return { hasReferences: false };

    try {
      const result = ragService.processAssistantMessage(messageContent);
      return {
        hasReferences: result.hasDocumentReferences,
        documentReferences: result.documentReferences,
        relevantChunks,
        sourceDocuments
      };
    } catch (err) {
      console.error('Erro ao processar resposta do assistente:', err);
      return { hasReferences: false };
    }
  }, [relevantChunks, sourceDocuments]);

  /**
   * Verifica o status dos documentos na conversa
   */
  const checkDocumentsStatus = useCallback(async () => {
    if (!conversationId) return { hasDocuments: false };

    try {
      return await ragService.checkDocumentsStatus(conversationId);
    } catch (err) {
      console.error('Erro ao verificar status dos documentos:', err);
      return { hasDocuments: false, error: err.message };
    }
  }, [conversationId]);

  /**
   * Obtém mensagens amigáveis para mostrar durante o processamento de documentos
   */
  const getProcessingMessage = useCallback((status, progress) => {
    return ragService.getProcessingMessage(status, progress);
  }, []);

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
    checkDocumentsStatus,
    getProcessingMessage
  };
};

export { useRAG };
export default useRAG;