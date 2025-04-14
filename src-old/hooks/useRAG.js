// Arquivo: src/hooks/useRAG.js
// Implementar hook personalizado para gerenciar o contexto RAG

import { useState, useEffect, useCallback } from 'react';
import { searchRelevantChunks, formatChunksAsContext, processAssistantMessage } from '../services/ragService';
import { getUserDocuments } from '../services/documentService';

export const useRAG = (conversationId) => {
  const [documentContext, setDocumentContext] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [sourceDocuments, setSourceDocuments] = useState([]);
  const [referenceInfo, setReferenceInfo] = useState([]);
  const [activeDocuments, setActiveDocuments] = useState([]);

  // Carregar documentos ativos quando a conversa mudar
  useEffect(() => {
    const loadActiveDocuments = async () => {
      if (!conversationId) return;
      
      try {
        const response = await getUserDocuments(conversationId);
        if (response.status === 'success' && response.data) {
          // Filtrar apenas documentos processados com sucesso
          const completed = response.data.documents.filter(
            doc => doc.status === 'completed'
          );
          setActiveDocuments(completed);
          console.log(`Documentos ativos carregados: ${completed.length}`);
        }
      } catch (error) {
        console.error('Erro ao carregar documentos ativos:', error);
      }
    };
    
    loadActiveDocuments();
  }, [conversationId]);

  // Função para buscar contexto relevante com base na consulta
  const searchRelevantContext = useCallback(async (query) => {
    if (!conversationId || activeDocuments.length === 0) {
      return null;
    }
    
    setIsSearching(true);
    
    try {
      console.log(`Buscando chunks relevantes para: "${query}"`);
      const chunks = await searchRelevantChunks(query, conversationId);
      
      if (!chunks || chunks.length === 0) {
        console.log('Nenhum chunk relevante encontrado');
        setIsSearching(false);
        return null;
      }
      
      console.log(`Encontrados ${chunks.length} chunks relevantes`);
      
      // Formatar chunks para contexto
      const context = formatChunksAsContext(chunks);
      
      // Armazenar documentos de origem para referência
      const sources = chunks.map(chunk => ({
        documentId: chunk.document_id,
        filename: chunk.filename || chunk.original_filename,
        chunkIndex: chunk.chunk_index,
        fileType: chunk.file_type
      }));
      
      setSourceDocuments(sources);
      setDocumentContext(context);
      setIsSearching(false);
      
      return {
        context,
        sourceDocuments: sources
      };
    } catch (error) {
      console.error('Erro ao buscar contexto relevante:', error);
      setIsSearching(false);
      return null;
    }
  }, [conversationId, activeDocuments]);

  // Processar a resposta do assistente para extrair referências de documentos
  const processAssistantResponse = useCallback((responseContent) => {
    if (!responseContent) return;
    
    const { documentReferences } = processAssistantMessage(responseContent);
    setReferenceInfo(documentReferences);
  }, []);

  return {
    documentContext,
    isSearching,
    sourceDocuments,
    referenceInfo,
    activeDocuments,
    searchRelevantContext,
    processAssistantResponse
  };
};