import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { 
  extractVisualizationFromMessage, 
  saveVisualization 
} from '../services/unifiedDataService';

// Criar contexto
const VisualizationContext = createContext({});

/**
 * Provider para gerenciamento de visualizações
 * Melhorado para integração com DocumentContext e evitar loops
 */
export const VisualizationProvider = ({ children }) => {
  const [visualizations, setVisualizations] = useState([]);
  const [activeVisualization, setActiveVisualization] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [isLoadingVisualizations, setIsLoadingVisualizations] = useState(false);
  
  // Referência para rastrear a última conversa carregada
  const lastLoadedConversationRef = useRef(null);
  
  const { error, handleError, clearError } = useErrorHandler();

  // Limpar dados quando a conversa muda
  useEffect(() => {
    if (activeConversationId) {
      // Verificar se já carregamos visualizações para esta conversa recentemente
      if (lastLoadedConversationRef.current !== activeConversationId) {
        loadVisualizations();
        lastLoadedConversationRef.current = activeConversationId;
      }
    } else {
      setVisualizations([]);
      setActiveVisualization(null);
      setIsDrawerOpen(false);
      lastLoadedConversationRef.current = null;
    }
  }, [activeConversationId]);

  // Definir a conversa ativa
  const setConversation = useCallback((conversationId) => {
    // Evitar redefinir a mesma conversa
    if (conversationId !== activeConversationId) {
      setActiveConversationId(conversationId);
    }
  }, [activeConversationId]);

  // Processar mensagem para visualizações
  const processMessageForVisualizations = useCallback((messageContent, messageId) => {
    if (!messageContent || !messageId) return { hasVisualization: false };
    
    try {
      const visualization = extractVisualizationFromMessage(messageContent);
      
      if (visualization) {
        // Adicionar ID da mensagem para referência
        visualization.messageId = messageId;
        visualization.conversationId = activeConversationId;
        
        // Adicionar à lista de visualizações
        setVisualizations(prev => {
          // Evitar duplicações
          const existingIndex = prev.findIndex(v => v.messageId === messageId);
          
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = visualization;
            return updated;
          }
          
          return [...prev, visualization];
        });
        
        return {
          hasVisualization: true,
          visualization
        };
      }
      
      return { hasVisualization: false };
    } catch (err) {
      handleError(err, 'Erro ao processar mensagem para visualizações');
      return { hasVisualization: false };
    }
  }, [activeConversationId, handleError]);

  // Abrir visualização
  const openVisualization = useCallback((visualization) => {
    setActiveVisualization(visualization);
    setIsDrawerOpen(true);
  }, []);

  // Fechar drawer
  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  // Salvar visualização
  const saveActiveVisualization = useCallback(async () => {
    if (!activeVisualization || !activeConversationId) return { success: false };
    
    try {
      const result = await saveVisualization(
        activeVisualization, 
        activeConversationId, 
        activeVisualization.messageId
      );
      
      return { success: true, result };
    } catch (err) {
      handleError(err, 'Erro ao salvar visualização');
      return { success: false };
    }
  }, [activeVisualization, activeConversationId, handleError]);

  // Carregar visualizações para a conversa atual com proteção contra chamadas repetidas
  const loadVisualizations = useCallback(async () => {
    if (!activeConversationId || isLoadingVisualizations) return;
    
    setIsLoadingVisualizations(true);
    clearError();
    
    try {
      // Esta função seria implementada para chamar a API real
      console.log(`Carregando visualizações para conversa ${activeConversationId}`);
      
      // Em uma implementação real, haveria uma chamada de API aqui
      // const response = await api.get(`/visualizations?conversationId=${activeConversationId}`);
      // setVisualizations(response.data);
      
      // Simular um pequeno delay para evitar chamadas em rápida sucessão
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (err) {
      handleError(err, 'Erro ao carregar visualizações');
    } finally {
      setIsLoadingVisualizations(false);
    }
  }, [activeConversationId, clearError, handleError, isLoadingVisualizations]);

  // Exportar visualização
  const exportVisualization = useCallback((visualization, format = 'png') => {
    if (!visualization) return { success: false };
    
    try {
      // Simulação de exportação
      console.log(`Exportando visualização em formato ${format}`);
      
      // Implementação real dependeria do tipo de visualização
      
      return { success: true };
    } catch (err) {
      handleError(err, 'Erro ao exportar visualização');
      return { success: false };
    }
  }, [handleError]);

  // Context value
  const value = {
    // Estado
    visualizations,
    activeVisualization,
    isDrawerOpen,
    activeConversationId,
    error,
    isLoadingVisualizations,
    
    // Métodos
    setConversation,
    processMessageForVisualizations,
    openVisualization,
    closeDrawer,
    saveVisualization: saveActiveVisualization,
    exportVisualization,
    loadVisualizations
  };

  return (
    <VisualizationContext.Provider value={value}>
      {children}
    </VisualizationContext.Provider>
  );
};

// Hook personalizado para usar o contexto
export const useVisualizationContext = () => {
  const context = useContext(VisualizationContext);
  
  if (!context) {
    throw new Error('useVisualizationContext deve ser usado dentro de um VisualizationProvider');
  }
  
  return context;
};

export default VisualizationContext;