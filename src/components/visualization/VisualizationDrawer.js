import React, { useState } from 'react';
import {
  Box,
  Drawer,
  Typography,
  IconButton,
  Tabs,
  Tab,
  Divider,
  Button,
  CircularProgress,
  Paper,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Close as CloseIcon,
  BarChart as ChartIcon,
  TableChart as TableIcon,
  Share as ShareIcon
} from '@mui/icons-material';
import VisualizationContainer from './VisualizationContainer';
import VisualizationActions from './VisualizationActions';
import { useVisualization } from '../../contexts/VisualizationContext';

/**
 * Componente de gaveta para exibir visualizações
 */
const VisualizationDrawer = ({ 
  open, 
  onClose,
  customVisualizations = null,
  conversationId,
  messageId
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  
  // Usar visualizações do contexto ou visualizações personalizadas
  const { 
    visualizations: contextVisualizations,
    activeVisualization,
    loading,
    exportVisualization
  } = useVisualization();
  
  // Determinar quais visualizações exibir
  const visualizations = customVisualizations || 
    (activeVisualization ? [activeVisualization] : contextVisualizations);
  
  // Estado para gerenciar a exportação
  const [isExporting, setIsExporting] = useState(false);
  
  // Lidar com a mudança de tab
  const handleTabChange = (event, newValue) => {
    setActiveTabIndex(newValue);
  };

  // Título dinâmico
  const getTitle = () => {
    if (visualizations.length === 0) return 'Visualização';
    
    const currentViz = visualizations[activeTabIndex];
    return currentViz.title || 
      `${currentViz.type?.charAt(0).toUpperCase()}${currentViz.type?.slice(1) || 'Visualização'}`;
  };
  
  // Obter a visualização atual
  const currentVisualization = visualizations[activeTabIndex] || null;
  
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { 
          width: { xs: '100%', sm: '550px', md: '650px' },
          maxWidth: '100%'
        }
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%' 
      }}>
        {/* Header */}
        <Box sx={{ 
          p: 2, 
          display: 'flex', 
          alignItems: 'center', 
          borderBottom: '1px solid', 
          borderColor: 'divider' 
        }}>
          <Typography variant="h6" sx={{ flex: 1 }}>
            {getTitle()}
          </Typography>
          <IconButton onClick={onClose} edge="end">
            <CloseIcon />
          </IconButton>
        </Box>
        
        {/* Tabs para múltiplas visualizações */}
        {visualizations.length > 1 && (
          <Tabs
            value={activeTabIndex}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider' }}
          >
            {visualizations.map((viz, index) => (
              <Tab 
                key={viz.id || index}
                label={viz.title || `Visualização ${index + 1}`}
                icon={viz.type === 'table' ? <TableIcon fontSize="small" /> : <ChartIcon fontSize="small" />}
                iconPosition="start"
              />
            ))}
          </Tabs>
        )}
        
        {/* Conteúdo principal */}
        <Box sx={{ 
          flex: 1, 
          overflow: 'auto', 
          p: 2, 
          display: 'flex', 
          flexDirection: 'column' 
        }}>
          {loading ? (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '100%' 
            }}>
              <CircularProgress />
            </Box>
          ) : visualizations.length === 0 ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '100%',
              textAlign: 'center',
              p: 3
            }}>
              <ChartIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.5, mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Nenhuma visualização disponível
              </Typography>
              <Typography variant="body2" color="text.secondary">
                As visualizações geradas durante a conversa aparecerão aqui
              </Typography>
            </Box>
          ) : (
            <>
              {/* Informações da visualização */}
              {currentVisualization && (
                <Box sx={{ mb: 2 }}>
                  <Typography 
                    variant="subtitle1" 
                    sx={{ fontWeight: 500, mb: 0.5 }}
                  >
                    {currentVisualization.title || 'Visualização'}
                  </Typography>
                  
                  {currentVisualization.description && (
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      {currentVisualization.description}
                    </Typography>
                  )}
                  
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 1
                  }}>
                    <Typography variant="caption" color="text.secondary">
                      Fonte: {currentVisualization.source || 'Mensagem do assistente'}
                    </Typography>
                    
                    <VisualizationActions 
                      visualization={currentVisualization}
                      conversationId={conversationId}
                      messageId={messageId}
                    />
                  </Box>
                  
                  <Divider sx={{ mb: 2 }} />
                </Box>
              )}
              
              {/* Container da visualização */}
              <Box sx={{ 
                flex: 1, 
                minHeight: isMobile ? 300 : 400,
                display: 'flex', 
                justifyContent: 'center' 
              }}>
                {currentVisualization ? (
                  <VisualizationContainer 
                    data={currentVisualization.data}
                    type={currentVisualization.type}
                    options={currentVisualization.options}
                    title={null} // O título já está sendo exibido acima
                    height="100%"
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Selecione uma visualização para exibir
                  </Typography>
                )}
              </Box>
            </>
          )}
        </Box>
        
        {/* Footer */}
        {currentVisualization && (
          <Box sx={{ 
            p: 2, 
            borderTop: '1px solid', 
            borderColor: 'divider',
            backgroundColor: theme.palette.background.paper
          }}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center' 
            }}>
              <Typography variant="caption" color="text.secondary">
                {currentVisualization.timestamp ? (
                  new Date(currentVisualization.timestamp).toLocaleString()
                ) : (
                  'Gerado agora'
                )}
              </Typography>
              
              <Button
                variant="contained"
                size="small"
                startIcon={isExporting ? <CircularProgress size={16} /> : <ShareIcon />}
                disabled={isExporting}
                onClick={async () => {
                  setIsExporting(true);
                  try {
                    await exportVisualization(currentVisualization, 'png');
                  } catch (error) {
                    console.error('Erro ao exportar:', error);
                  } finally {
                    setIsExporting(false);
                  }
                }}
              >
                {isExporting ? 'Exportando...' : 'Exportar'}
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </Drawer>
  );
};

export default VisualizationDrawer;