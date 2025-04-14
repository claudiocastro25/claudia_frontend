import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import visualizationService from '../services/visualizationService';

// Criar o contexto
const VisualizationContext = createContext();

/**
 * Provider para gerenciar o estado global de visualizações
 */
export const VisualizationProvider = ({ children }) => {
  // Estado para armazenar visualizações
  const [visualizations, setVisualizations] = useState([]);
  const [activeVisualization, setActiveVisualization] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [favoriteVisualizations, setFavoriteVisualizations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Carregar visualizações favoritas do localStorage
  useEffect(() => {
    try {
      const savedFavorites = localStorage.getItem('favoriteVisualizations');
      if (savedFavorites) {
        setFavoriteVisualizations(JSON.parse(savedFavorites));
      }
    } catch (err) {
      console.error('Erro ao carregar visualizações favoritas:', err);
    }
  }, []);

  // Salvar visualização favorita no localStorage
  const updateFavorites = useCallback((updatedFavorites) => {
    setFavoriteVisualizations(updatedFavorites);
    try {
      localStorage.setItem('favoriteVisualizations', JSON.stringify(updatedFavorites));
    } catch (err) {
      console.error('Erro ao salvar visualizações favoritas:', err);
    }
  }, []);

  // Adicionar uma nova visualização
  const addVisualization = useCallback((visualization) => {
    if (!visualization) return;

    // Gerar um ID único se não existir
    const newVisualization = {
      ...visualization,
      id: visualization.id || `viz_${Date.now()}`,
      timestamp: visualization.timestamp || new Date().toISOString()
    };

    setVisualizations(prev => [newVisualization, ...prev]);
    return newVisualization;
  }, []);

  // Abrir a visualização na gaveta
  const openVisualization = useCallback((visualization) => {
    setActiveVisualization(visualization);
    setIsDrawerOpen(true);
  }, []);

  // Favoritar/Desfavoritar uma visualização
  const toggleFavorite = useCallback((visualization) => {
    if (!visualization) return;

    const vizId = visualization.id;
    const isFavorited = favoriteVisualizations.some(v => v.id === vizId);

    if (isFavorited) {
      // Remover dos favoritos
      const updatedFavorites = favoriteVisualizations.filter(v => v.id !== vizId);
      updateFavorites(updatedFavorites);
    } else {
      // Adicionar aos favoritos
      const updatedFavorites = [...favoriteVisualizations, visualization];
      updateFavorites(updatedFavorites);
    }
  }, [favoriteVisualizations, updateFavorites]);

  // Verificar se uma visualização é favorita
  const isFavorite = useCallback((visualizationId) => {
    return favoriteVisualizations.some(v => v.id === visualizationId);
  }, [favoriteVisualizations]);

  // Exportar uma visualização
  const exportVisualization = useCallback(async (visualization, format = 'png') => {
    if (!visualization) return null;

    setLoading(true);
    setError(null);

    try {
      const result = await visualizationService.exportVisualization(visualization, format);
      setLoading(false);
      return result;
    } catch (err) {
      setError(err.message || 'Erro ao exportar visualização');
      setLoading(false);
      return null;
    }
  }, []);

  // Salvar uma visualização no servidor
  const saveVisualization = useCallback(async (visualization, conversationId, messageId) => {
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
      
      // Adicionar à lista local se bem-sucedido
      if (result?.data?.visualization) {
        addVisualization(result.data.visualization);
      }
      
      return result;
    } catch (err) {
      setError(err.message || 'Erro ao salvar visualização');
      setLoading(false);
      return null;
    }
  }, [addVisualization]);

  // Carregar visualizações por conversa
  const loadVisualizationsByConversation = useCallback(async (conversationId) => {
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
      setError(err.message || 'Erro ao carregar visualizações');
      setLoading(false);
    }
  }, []);

  // Fechar a gaveta de visualização
  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  // Extrair dados de visualização de uma mensagem
  const extractVisualizationFromMessage = useCallback((messageContent) => {
    if (!messageContent) return null;
    
    return visualizationService.extractVisualizationData(messageContent);
  }, []);

  // Valor do contexto
  const value = {
    visualizations,
    activeVisualization,
    isDrawerOpen,
    favoriteVisualizations,
    loading,
    error,
    addVisualization,
    openVisualization,
    toggleFavorite,
    isFavorite,
    exportVisualization,
    saveVisualization,
    loadVisualizationsByConversation,
    closeDrawer,
    extractVisualizationFromMessage
  };

  return (
    <VisualizationContext.Provider value={value}>
      {children}
    </VisualizationContext.Provider>
  );
};

// Hook para usar o contexto
export const useVisualization = () => {
  const context = useContext(VisualizationContext);
  if (!context) {
    throw new Error('useVisualization must be used within a VisualizationProvider');
  }
  return context;
};

export default VisualizationContext;