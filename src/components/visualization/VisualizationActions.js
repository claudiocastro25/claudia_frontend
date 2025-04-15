import React from 'react';
import {
  Box,
  Button,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';

// Icons
import ShareIcon from '@mui/icons-material/Share';
import SaveIcon from '@mui/icons-material/Save';
import DownloadIcon from '@mui/icons-material/Download';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ImageIcon from '@mui/icons-material/Image';
import CodeIcon from '@mui/icons-material/Code';
import CloseIcon from '@mui/icons-material/Close';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';

// Context
import { useVisualizationContext } from '../../contexts/VisualizationContext';

/**
 * Componente que exibe ações para visualizações
 * Permite exportar, compartilhar, salvar, etc.
 */
const VisualizationActions = ({
  visualization,
  onClose,
  isFullScreen,
  onToggleFullScreen,
  variant = 'default',
  showMainActions = true,
  showMenuActions = true,
  showCloseButton = true
}) => {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);
  
  const {
    saveVisualization,
    exportVisualization
  } = useVisualizationContext();
  
  // Abrir menu
  const handleOpenMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  // Fechar menu
  const handleCloseMenu = () => {
    setAnchorEl(null);
  };
  
  // Salvar visualização
  const handleSave = async () => {
    try {
      const result = await saveVisualization(visualization);
      
      if (result && result.success) {
        // Poderia mostrar uma notificação de sucesso
        console.log('Visualização salva com sucesso');
      }
    } catch (error) {
      console.error('Erro ao salvar visualização', error);
    }
    
    handleCloseMenu();
  };
  
  // Exportar visualização
  const handleExport = async (format = 'png') => {
    try {
      const result = await exportVisualization(visualization, format);
      
      if (result && result.success) {
        // Poderia mostrar uma notificação de sucesso
        console.log(`Visualização exportada como ${format}`);
      }
    } catch (error) {
      console.error(`Erro ao exportar como ${format}`, error);
    }
    
    handleCloseMenu();
  };
  
  // Copiar como imagem
  const handleCopyAsImage = () => {
    // Implementação dependente do tipo de visualização
    console.log('Copiando como imagem...');
    handleCloseMenu();
  };
  
  // Copiar código
  const handleCopyCode = () => {
    if (visualization && visualization.code) {
      navigator.clipboard.writeText(visualization.code)
        .then(() => console.log('Código copiado para a área de transferência'))
        .catch(err => console.error('Erro ao copiar código', err));
    }
    
    handleCloseMenu();
  };
  
  // Copiar como markdown
  const handleCopyAsMarkdown = () => {
    if (visualization && visualization.code) {
      const markdown = `\`\`\`${visualization.language || 'js'}\n${visualization.code}\n\`\`\``;
      
      navigator.clipboard.writeText(markdown)
        .then(() => console.log('Markdown copiado para a área de transferência'))
        .catch(err => console.error('Erro ao copiar markdown', err));
    }
    
    handleCloseMenu();
  };
  
  // Citar visualização
  const handleCiteVisualization = () => {
    // Geraria uma citação para a visualização
    console.log('Gerando citação...');
    handleCloseMenu();
  };
  
  // Compartilhar visualização
  const handleShare = () => {
    // Implementação real dependeria da integração com serviços de compartilhamento
    console.log('Compartilhando visualização...');
    handleCloseMenu();
  };

  // Renderizar botões principais
  const renderMainActions = () => {
    if (!showMainActions) return null;
    
    return (
      <>
        {/* Botão de salvar */}
        <Tooltip title="Salvar visualização">
          <IconButton
            onClick={handleSave}
            size={variant === 'compact' ? 'small' : 'medium'}
          >
            <SaveIcon fontSize={variant === 'compact' ? 'small' : 'medium'} />
          </IconButton>
        </Tooltip>
        
        {/* Botão de compartilhar */}
        <Tooltip title="Compartilhar">
          <IconButton 
            onClick={handleShare}
            size={variant === 'compact' ? 'small' : 'medium'}
          >
            <ShareIcon fontSize={variant === 'compact' ? 'small' : 'medium'} />
          </IconButton>
        </Tooltip>
        
        {/* Botão de exportar */}
        <Tooltip title="Exportar como PNG">
          <IconButton
            onClick={() => handleExport('png')}
            size={variant === 'compact' ? 'small' : 'medium'}
          >
            <DownloadIcon fontSize={variant === 'compact' ? 'small' : 'medium'} />
          </IconButton>
        </Tooltip>
        
        {/* Botão de tela cheia se houver callback */}
        {onToggleFullScreen && (
          <Tooltip title={isFullScreen ? "Sair da tela cheia" : "Tela cheia"}>
            <IconButton
              onClick={onToggleFullScreen}
              size={variant === 'compact' ? 'small' : 'medium'}
            >
              {isFullScreen ? (
                <FullscreenExitIcon fontSize={variant === 'compact' ? 'small' : 'medium'} />
              ) : (
                <FullscreenIcon fontSize={variant === 'compact' ? 'small' : 'medium'} />
              )}
            </IconButton>
          </Tooltip>
        )}
      </>
    );
  };
  
  // Renderizar botão de menu
  const renderMenuButton = () => {
    if (!showMenuActions) return null;
    
    return (
      <>
        <Tooltip title="Mais opções">
          <IconButton
            onClick={handleOpenMenu}
            size={variant === 'compact' ? 'small' : 'medium'}
            aria-controls={open ? 'visualization-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={open ? 'true' : undefined}
          >
            <MoreVertIcon fontSize={variant === 'compact' ? 'small' : 'medium'} />
          </IconButton>
        </Tooltip>
        
        <Menu
          id="visualization-menu"
          anchorEl={anchorEl}
          open={open}
          onClose={handleCloseMenu}
          MenuListProps={{
            'aria-labelledby': 'basic-button',
          }}
        >
          <MenuItem onClick={() => handleExport('svg')}>
            <ListItemIcon>
              <ImageIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Exportar como SVG</ListItemText>
          </MenuItem>
          
          <MenuItem onClick={handleCopyAsImage}>
            <ListItemIcon>
              <ContentCopyIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Copiar como imagem</ListItemText>
          </MenuItem>
          
          <Divider />
          
          <MenuItem onClick={handleCopyCode}>
            <ListItemIcon>
              <CodeIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Copiar código</ListItemText>
          </MenuItem>
          
          <MenuItem onClick={handleCopyAsMarkdown}>
            <ListItemIcon>
              <FormatQuoteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Copiar como markdown</ListItemText>
          </MenuItem>
          
          <Divider />
          
          <MenuItem onClick={handleCiteVisualization}>
            <ListItemIcon>
              <FormatQuoteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Gerar citação</ListItemText>
          </MenuItem>
        </Menu>
      </>
    );
  };
  
  // Renderizar botão de fechar
  const renderCloseButton = () => {
    if (!showCloseButton || !onClose) return null;
    
    return (
      <Tooltip title="Fechar">
        <IconButton
          onClick={onClose}
          size={variant === 'compact' ? 'small' : 'medium'}
          sx={{ ml: 1 }}
        >
          <CloseIcon fontSize={variant === 'compact' ? 'small' : 'medium'} />
        </IconButton>
      </Tooltip>
    );
  };
  
  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      {renderMainActions()}
      {renderMenuButton()}
      {renderCloseButton()}
    </Box>
  );
};

export default VisualizationActions;