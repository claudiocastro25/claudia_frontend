import { useState, useCallback, useEffect, useRef } from 'react';
import visualizationService from '../services/visualizationService';

/**
 * Hook para gerenciamento de visualizações
 * Alternativa ao contexto para componentes que não precisam de estado global
 */
const useVisualization = (conversationId) => {
  const [visualizations, setVisualizations] = useState([]);
  const [activeVisualization, setActiveVisualization] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const visualizationRef = useRef(null);

  // Carregar visualizações quando a conversa muda
  useEffect(() => {
    if (conversationId) {
      loadVisualizations();
    } else {
      setVisualizations([]);
    }
  }, [conversationId]);

  /**
   * Carrega visualizações para a conversa atual
   */
  const loadVisualizations = useCallback(async () => {
    if (!conversationId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await visualizationService.getVisualizationsByConversation(conversationId);
      if (result?.data?.visualizations) {
        setVisualizations(result.data.visualizations);
      }
      setLoading(false);
    } catch (err) {
      console.error('Erro ao carregar visualizações:', err);
      setError('Erro ao carregar visualizações');
      setLoading(false);
    }
  }, [conversationId]);

  /**
   * Adiciona uma nova visualização
   */
  const addVisualization = useCallback((visualization) => {
    if (!visualization) return null;

    // Gerar um ID único se não existir
    const newVisualization = {
      ...visualization,
      id: visualization.id || `viz_${Date.now()}`,
      timestamp: visualization.timestamp || new Date().toISOString()
    };

    setVisualizations(prev => [newVisualization, ...prev]);
    return newVisualization;
  }, []);

  /**
   * Abre a visualização na gaveta/drawer
   */
  const openVisualization = useCallback((visualization) => {
    setActiveVisualization(visualization);
    setIsDrawerOpen(true);
  }, []);

  /**
   * Fecha a gaveta/drawer de visualização
   */
  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  /**
   * Extrai dados de visualização de uma mensagem
   */
  const extractVisualizationFromMessage = useCallback((messageContent) => {
    if (!messageContent) return null;
    
    return visualizationService.extractVisualizationData(messageContent);
  }, []);

  /**
   * Processa uma mensagem para detectar dados de visualização
   */
  const processMessageForVisualizations = useCallback((messageContent, messageId) => {
    if (!messageContent) return { hasVisualization: false };
    
    try {
      // Tentar extrair dados de visualização
      const visualizationData = extractVisualizationFromMessage(messageContent);
      
      if (visualizationData) {
        // Se encontrou dados visualizáveis, criar visualização
        const newViz = addVisualization({
          ...visualizationData,
          messageId,
          conversationId,
          title: visualizationData.title || 'Visualização',
          timestamp: new Date().toISOString()
        });
        
        return {
          hasVisualization: true,
          visualization: newViz,
          type: visualizationData.type
        };
      }
      
      return { hasVisualization: false };
    } catch (err) {
      console.error('Erro ao processar mensagem para visualizações:', err);
      return { hasVisualization: false, error: err.message };
    }
  }, [conversationId, extractVisualizationFromMessage, addVisualization]);

  /**
   * Salva uma visualização no servidor
   */
  const saveVisualization = useCallback(async (visualization, messageId) => {
    if (!visualization || !conversationId) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await visualizationService.saveVisualization(
        visualization,
        conversationId,
        messageId
      );
      
      setLoading(false);
      
      // Se bem-sucedido, atualizar lista local
      if (result?.data?.visualization) {
        addVisualization(result.data.visualization);
        return result.data.visualization;
      }
      
      return null;
    } catch (err) {
      console.error('Erro ao salvar visualização:', err);
      setError('Erro ao salvar visualização');
      setLoading(false);
      return null;
    }
  }, [conversationId, addVisualization]);

  /**
   * Exporta uma visualização para o formato especificado
   */
  const exportVisualization = useCallback(async (visualization, format = 'png') => {
    if (!visualization) {
      setError('Visualização inválida');
      return null;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Se estamos tentando exportar como imagem, precisamos do elemento DOM
      if ((format === 'png' || format === 'svg') && visualizationRef.current) {
        visualization = {
          ...visualization,
          elementId: visualizationRef.current
        };
      }
      
      const result = await visualizationService.exportVisualization(visualization, format);
      setLoading(false);
      return result;
    } catch (err) {
      console.error('Erro ao exportar visualização:', err);
      setError(`Erro ao exportar como ${format.toUpperCase()}`);
      setLoading(false);
      return null;
    }
  }, []);

  /**
   * Gera uma configuração de visualização com base nos dados
   */
  const generateVisualizationConfig = useCallback((data, type = 'auto', options = {}) => {
    return visualizationService.generateVisualizationConfig(data, type, options);
  }, []);

  /**
   * Sugere o melhor tipo de gráfico para os dados
   */
  const suggestChartType = useCallback((data) => {
    return visualizationService.suggestChartType(data);
  }, []);

  /**
   * Remove uma visualização
   */
  const removeVisualization = useCallback((visualizationId) => {
    setVisualizations(prev => prev.filter(v => v.id !== visualizationId));
    
    // Se for a visualização ativa, feche o drawer
    if (activeVisualization?.id === visualizationId) {
      setActiveVisualization(null);
      setIsDrawerOpen(false);
    }
  }, [activeVisualization]);

  return {
    // Estado
    visualizations,
    activeVisualization,
    isDrawerOpen,
    loading,
    error,
    visualizationRef,
    
    // Métodos
    loadVisualizations,
    addVisualization,
    openVisualization,
    closeDrawer,
    extractVisualizationFromMessage,
    processMessageForVisualizations,
    saveVisualization,
    exportVisualization,
    generateVisualizationConfig,
    suggestChartType,
    removeVisualization
  };
};

export { useVisualization };
export default useVisualization;