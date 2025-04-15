import { useState, useCallback, useEffect } from 'react';
import { useErrorHandler } from './useErrorHandler';
import { 
  extractVisualizationFromMessage, 
  saveVisualization 
} from '../services/unifiedDataService';

/**
 * Hook para gerenciamento de visualizações
 * Corrigido para implementação completa
 */
const useVisualization = (conversationId) => {
  const [visualizations, setVisualizations] = useState([]);
  const [activeVisualization, setActiveVisualization] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  const { error, handleError, clearError } = useErrorHandler();

  // Limpar dados quando a conversa muda
  useEffect(() => {
    if (conversationId) {
      setVisualizations([]);
      setActiveVisualization(null);
      setIsDrawerOpen(false);
    }
  }, [conversationId]);

  // Extrair visualização da mensagem
  const extractVisualizationFromMessageWrapper = useCallback((messageContent) => {
    if (!messageContent) return null;
    
    try {
      return extractVisualizationFromMessage(messageContent);
    } catch (err) {
      handleError(err, 'Erro ao extrair visualização');
      return null;
    }
  }, [handleError]);

  // Processar mensagem para visualizações
  const processMessageForVisualizations = useCallback((messageContent, messageId) => {
    if (!messageContent) return { hasVisualization: false };
    
    try {
      const visualization = extractVisualizationFromMessage(messageContent);
      
      if (visualization) {
        // Adicionar ID da mensagem para referência
        visualization.messageId = messageId;
        visualization.conversationId = conversationId;
        
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
  }, [conversationId, handleError]);

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
    if (!activeVisualization || !conversationId) return { success: false };
    
    try {
      const result = await saveVisualization(
        activeVisualization, 
        conversationId, 
        activeVisualization.messageId
      );
      
      return { success: true, result };
    } catch (err) {
      handleError(err, 'Erro ao salvar visualização');
      return { success: false };
    }
  }, [activeVisualization, conversationId, handleError]);

  // Exportar visualização
  const exportVisualization = useCallback((visualization, format = 'png') => {
    if (!visualization) return { success: false };
    
    try {
      // Simulação de exportação - em uma aplicação real, 
      // isso interagiria com bibliotecas específicas
      console.log(`Exportando visualização em formato ${format}`);
      
      // Implementação de exportação depende do tipo de visualização
      // e das bibliotecas usadas para renderização
      
      return { success: true };
    } catch (err) {
      handleError(err, 'Erro ao exportar visualização');
      return { success: false };
    }
  }, [handleError]);

  // Carregar visualizações para a conversa atual
  const loadVisualizations = useCallback(async () => {
    if (!conversationId) return;
    
    clearError();
    
    try {
      // Esta função seria implementada para chamar a API real
      // Por enquanto, usamos apenas as visualizações em memória
      console.log(`Carregando visualizações para conversa ${conversationId}`);
      
      // Em uma implementação real, haveria uma chamada de API aqui
      // const response = await api.get(`/visualizations?conversationId=${conversationId}`);
      // setVisualizations(response.data);
    } catch (err) {
      handleError(err, 'Erro ao carregar visualizações');
    }
  }, [conversationId, clearError, handleError]);

  return {
    // Estado
    visualizations,
    activeVisualization,
    isDrawerOpen,
    error,
    
    // Métodos
    extractVisualizationFromMessage: extractVisualizationFromMessageWrapper,
    processMessageForVisualizations,
    openVisualization,
    closeDrawer,
    saveVisualization: saveActiveVisualization,
    exportVisualization,
    loadVisualizations
  };
};

export { useVisualization };
export default useVisualization;