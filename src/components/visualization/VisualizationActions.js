import React, { useState } from 'react';
import { 
  Box, 
  IconButton, 
  Tooltip, 
  Menu, 
  MenuItem, 
  ListItemIcon, 
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress
} from '@mui/material';
import { 
  Download as DownloadIcon,
  Bookmark as BookmarkIcon,
  BookmarkBorder as BookmarkBorderIcon,
  Share as ShareIcon,
  Image as ImageIcon,
  TableChart as TableIcon,
  Code as CodeIcon,
  MoreVert as MoreIcon
} from '@mui/icons-material';
import { useVisualization } from '../../contexts/VisualizationContext';

/**
 * Componente de ações para visualizações (exportar, favoritar, etc.)
 */
const VisualizationActions = ({ visualization, conversationId, messageId }) => {
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('png');
  const [exportTitle, setExportTitle] = useState(visualization?.title || 'Visualização');
  const [isExporting, setIsExporting] = useState(false);
  
  const { 
    toggleFavorite, 
    isFavorite, 
    exportVisualization, 
    saveVisualization,
    loading,
    error
  } = useVisualization();
  
  // Estado local para verificar se é favorito
  const isFavorited = isFavorite(visualization?.id);
  
  // Abrir menu
  const handleMenuOpen = (event) => {
    setMenuAnchorEl(event.currentTarget);
  };
  
  // Fechar menu
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };
  
  // Abrir diálogo de exportação
  const handleOpenExportDialog = () => {
    setExportDialogOpen(true);
    handleMenuClose();
  };
  
  // Fechar diálogo de exportação
  const handleCloseExportDialog = () => {
    setExportDialogOpen(false);
  };
  
  // Favoritar/desfavoritar
  const handleToggleFavorite = () => {
    toggleFavorite(visualization);
    handleMenuClose();
  };
  
  // Exportar visualização
  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const result = await exportVisualization(visualization, exportFormat);
      
      // Processar o resultado de acordo com o formato
      if (exportFormat === 'png' || exportFormat === 'svg') {
        // Se for um blob, criar um link de download
        if (result instanceof Blob) {
          const url = URL.createObjectURL(result);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${exportTitle.replace(/\s+/g, '-').toLowerCase()}.${exportFormat}`;
          document.body.appendChild(link);
          link.click();
          link.remove();
          URL.revokeObjectURL(url);
        } else if (typeof result === 'string' && exportFormat === 'svg') {
          // Para SVG como string
          const blob = new Blob([result], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${exportTitle.replace(/\s+/g, '-').toLowerCase()}.svg`;
          document.body.appendChild(link);
          link.click();
          link.remove();
          URL.revokeObjectURL(url);
        }
      } else if (exportFormat === 'csv' || exportFormat === 'json') {
        // Para formatos de texto
        const blob = new Blob([result], { 
          type: exportFormat === 'csv' ? 'text/csv' : 'application/json' 
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${exportTitle.replace(/\s+/g, '-').toLowerCase()}.${exportFormat}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      }
      
      setExportDialogOpen(false);
    } catch (err) {
      console.error('Erro ao exportar:', err);
    } finally {
      setIsExporting(false);
    }
  };
  
  // Salvar visualização
  const handleSave = () => {
    saveVisualization(visualization, conversationId, messageId);
    handleMenuClose();
  };
  
  // Ícones por tipo de exportação
  const formatIcons = {
    png: <ImageIcon fontSize="small" />,
    svg: <ImageIcon fontSize="small" />,
    csv: <TableIcon fontSize="small" />,
    json: <CodeIcon fontSize="small" />
  };
  
  return (
    <>
      {/* Botão principal de ações */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Tooltip title={isFavorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}>
          <IconButton
            size="small"
            onClick={handleToggleFavorite}
            color={isFavorited ? "warning" : "default"}
          >
            {isFavorited ? <BookmarkIcon /> : <BookmarkBorderIcon />}
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Exportar">
          <IconButton
            size="small"
            onClick={handleOpenExportDialog}
          >
            <DownloadIcon />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Mais opções">
          <IconButton
            size="small"
            onClick={handleMenuOpen}
          >
            <MoreIcon />
          </IconButton>
        </Tooltip>
      </Box>
      
      {/* Menu de opções */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleToggleFavorite}>
          <ListItemIcon>
            {isFavorited ? <BookmarkIcon color="warning" /> : <BookmarkBorderIcon />}
          </ListItemIcon>
          <ListItemText>
            {isFavorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          </ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleOpenExportDialog}>
          <ListItemIcon>
            <DownloadIcon />
          </ListItemIcon>
          <ListItemText>Exportar</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleSave}>
          <ListItemIcon>
            <ShareIcon />
          </ListItemIcon>
          <ListItemText>Salvar visualização</ListItemText>
        </MenuItem>
      </Menu>
      
      {/* Diálogo de exportação */}
      <Dialog
        open={exportDialogOpen}
        onClose={handleCloseExportDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Exportar Visualização</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Título"
            type="text"
            fullWidth
            value={exportTitle}
            onChange={(e) => setExportTitle(e.target.value)}
            variant="outlined"
            sx={{ mb: 2 }}
          />
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {['png', 'svg', 'csv', 'json'].map((format) => (
              <Button
                key={format}
                variant={exportFormat === format ? "contained" : "outlined"}
                startIcon={formatIcons[format]}
                onClick={() => setExportFormat(format)}
                fullWidth
              >
                {format.toUpperCase()}
              </Button>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseExportDialog} color="inherit">
            Cancelar
          </Button>
          <Button 
            onClick={handleExport} 
            variant="contained" 
            color="primary"
            disabled={isExporting || loading}
            startIcon={isExporting ? <CircularProgress size={18} /> : null}
          >
            {isExporting ? 'Exportando...' : 'Exportar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default VisualizationActions;