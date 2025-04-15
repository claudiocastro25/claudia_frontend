import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Drawer, 
  IconButton, 
  Typography, 
  Tabs, 
  Tab, 
  Divider, 
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  useTheme
} from '@mui/material';
import { 
  Close, 
  Download, 
  Bookmark, 
  Share, 
  BarChart, 
  TableChart, 
  PieChart,
  MoreVert,
  Code
} from '@mui/icons-material';

import VisualizationContainer from './VisualizationContainer';

/**
 * Drawer para exibir visualizações de dados em tela cheia
 */
const VisualizationDrawer = ({ 
  open, 
  onClose, 
  visualizations = [], 
  customVisualizations = null, // Para visualizações específicas
  conversationId,
  messageId,
  onExport,
  onSave
}) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [visData, setVisData] = useState([]);
  
  // References to previous values to avoid infinite render cycles
  const prevCustomVisualizationsRef = useRef();
  const prevVisualizationsRef = useRef();
  
  // Usar visualizações personalizadas ou da lista geral
  useEffect(() => {
    // Create a function to check if arrays are deeply equal
    const areArraysEqual = (arr1, arr2) => {
      if (!arr1 || !arr2) return arr1 === arr2;
      if (arr1.length !== arr2.length) return false;
      
      // Simple comparison for primitive arrays
      return JSON.stringify(arr1) === JSON.stringify(arr2);
    };
    
    // Only update if the source data actually changed
    const customVisChanged = !areArraysEqual(customVisualizations, prevCustomVisualizationsRef.current);
    const visualizationsChanged = !areArraysEqual(visualizations, prevVisualizationsRef.current);
    
    if (customVisChanged || visualizationsChanged) {
      // Update references for next comparison
      prevCustomVisualizationsRef.current = customVisualizations;
      prevVisualizationsRef.current = visualizations;
      
      // Set the new data and reset active tab
      const newData = customVisualizations 
        ? (Array.isArray(customVisualizations) ? customVisualizations : [customVisualizations])
        : visualizations;
        
      setVisData(newData);
      setActiveTab(0);
    }
  }, [customVisualizations, visualizations]);
  
  // Verificar se há visualizações para mostrar
  if (!open || (visData?.length === 0)) {
    return null;
  }
  
  // Obter a visualização atual
  const currentViz = visData[activeTab] || {};
  
  // Obter o título da visualização atual
  const getTitle = () => {
    if (!currentViz) return 'Visualização';
    return currentViz.title || `Visualização ${activeTab + 1}`;
  };
  
  // Obter o tipo de visualização
  const getTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'bar': return <BarChart fontSize="small" />;
      case 'pie': return <PieChart fontSize="small" />;
      case 'table': return <TableChart fontSize="small" />;
      default: return <BarChart fontSize="small" />;
    }
  };
  
  // Manipulador para abrir menu
  const handleOpenMenu = (event) => {
    setMenuAnchorEl(event.currentTarget);
  };
  
  // Manipulador para fechar menu
  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
  };
  
  // Manipulador para exportar
  const handleExport = (format) => {
    handleCloseMenu();
    if (onExport) {
      onExport(currentViz, format);
    }
  };
  
  // Manipulador para salvar
  const handleSave = () => {
    handleCloseMenu();
    if (onSave) {
      onSave(currentViz);
    }
  };
  
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { 
          width: { xs: '100%', sm: '80%', md: 700 }, 
          p: 0,
          display: 'flex',
          flexDirection: 'column'
        }
      }}
    >
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
        
        {/* Menu de ações */}
        <IconButton 
          onClick={handleOpenMenu}
          sx={{ mr: 1 }}
        >
          <MoreVert />
        </IconButton>
        
        <IconButton onClick={onClose}>
          <Close />
        </IconButton>
      </Box>
      
      {/* Menu de exportação e opções */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={handleSave}>
          <ListItemIcon>
            <Bookmark fontSize="small" />
          </ListItemIcon>
          <ListItemText>Salvar visualização</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleExport('png')}>
          <ListItemIcon>
            <Download fontSize="small" />
          </ListItemIcon>
          <ListItemText>Exportar como PNG</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleExport('csv')}>
          <ListItemIcon>
            <TableChart fontSize="small" />
          </ListItemIcon>
          <ListItemText>Exportar dados (CSV)</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleExport('json')}>
          <ListItemIcon>
            <Code fontSize="small" />
          </ListItemIcon>
          <ListItemText>Exportar dados (JSON)</ListItemText>
        </MenuItem>
      </Menu>
      
      {/* Tabs para múltiplas visualizações */}
      {visData.length > 1 && (
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ 
            px: 2, 
            borderBottom: '1px solid', 
            borderColor: 'divider',
            minHeight: 48
          }}
        >
          {visData.map((vis, index) => (
            <Tab 
              key={index} 
              label={vis.title || `Visualização ${index + 1}`}
              icon={getTypeIcon(vis.type)}
              iconPosition="start"
              sx={{ minHeight: 48 }}
            />
          ))}
        </Tabs>
      )}
      
      {/* Visualização */}
      <Box sx={{ 
        flex: 1, 
        overflow: 'auto', 
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        {currentViz ? (
          <VisualizationContainer 
            data={currentViz.data || []}
            type={currentViz.type || 'bar'}
            title={currentViz.title}
            options={currentViz.options || {}}
            height={500}
            width="100%"
          />
        ) : (
          <Typography variant="body1" color="text.secondary" align="center">
            Nenhuma visualização disponível
          </Typography>
        )}
      </Box>
      
      {/* Informações e botões de ação */}
      <Box sx={{ 
        p: 2, 
        borderTop: '1px solid', 
        borderColor: 'divider',
        bgcolor: theme.palette.background.default
      }}>
        <Typography variant="caption" color="text.secondary" paragraph>
          {currentViz.description || 'Visualização de dados baseada na conversa atual.'}
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button 
            variant="outlined" 
            onClick={onClose}
          >
            Fechar
          </Button>
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={() => handleExport('png')}
          >
            Exportar
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

export default VisualizationDrawer;