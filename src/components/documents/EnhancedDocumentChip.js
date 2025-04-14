// Arquivo: src/components/documents/EnhancedDocumentChip.js

import React from 'react';
import {
  Chip,
  Tooltip,
  Box,
  Typography,
  useTheme,
  Card,
  CardActionArea,
  Badge,
  alpha
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  Description as DocIcon,
  TableChart as ExcelIcon,
  Image as ImageIcon,
  DataObject as JsonIcon,
  Article as TxtIcon,
  AccessibilityNew as AiIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';

/**
 * Componente aprimorado para exibir chip ou card de documento
 * 
 * @param {Object} props
 * @param {Object} props.document - Documento a ser exibido
 * @param {Function} props.onClick - Função chamada ao clicar no chip/card
 * @param {string} props.variant - Estilo de exibição (chip, card)
 * @param {string} props.size - Tamanho (small, medium, large)
 * @param {Object} props.sx - Estilos adicionais
 * @param {boolean} props.showProcessed - Exibir indicador de processamento
 */
const EnhancedDocumentChip = ({ 
  document, 
  onClick, 
  variant = "chip", 
  size = "medium", 
  sx = {},
  showProcessed = false
}) => {
  const theme = useTheme();
  
  // Extrair nome e extensão do arquivo
  // Usar prioritariamente o nome original do arquivo
  const fileName = document?.original_filename || document?.filename || document?.name || 'Documento';
  const extension = fileName.split('.').pop().toLowerCase();
  
  // Determinar o ícone com base na extensão
  const getIcon = () => {
    const iconColor = getColor();
    const iconSize = size === 'small' ? 16 : size === 'medium' ? 20 : 32;
    
    switch (extension) {
      case 'pdf':
        return <PdfIcon sx={{ color: 'error.main', fontSize: iconSize }} />;
      case 'doc':
      case 'docx':
        return <DocIcon sx={{ color: 'primary.main', fontSize: iconSize }} />;
      case 'xls':
      case 'xlsx':
      case 'csv':
        return <ExcelIcon sx={{ color: 'success.main', fontSize: iconSize }} />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'tiff':
        return <ImageIcon sx={{ color: 'secondary.main', fontSize: iconSize }} />;
      case 'json':
        return <JsonIcon sx={{ color: 'warning.main', fontSize: iconSize }} />;
      default:
        return <TxtIcon sx={{ color: 'info.main', fontSize: iconSize }} />;
    }
  };
  
  // Determinar a cor do chip com base no tipo de arquivo
  const getColor = () => {
    switch (extension) {
      case 'pdf':
        return 'error';
      case 'doc':
      case 'docx':
        return 'primary';
      case 'xls':
      case 'xlsx':
      case 'csv':
        return 'success';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'tiff':
        return 'secondary';
      case 'json':
        return 'warning';
      default:
        return 'info';
    }
  };
  
  // Obter o nome do arquivo truncado se for muito longo
  const getDisplayName = () => {
    // Limitar o comprimento do nome do arquivo com base no tamanho
    const maxLength = size === 'small' ? 15 : size === 'medium' ? 20 : 30;
    
    if (fileName.length <= maxLength) return fileName;
    
    // Truncar o meio do nome do arquivo mantendo a extensão
    const nameParts = fileName.split('.');
    const extension = nameParts.pop();
    const baseName = nameParts.join('.');
    
    if (baseName.length <= maxLength - 5) {
      return fileName;
    }
    
    return `${baseName.substring(0, Math.max(5, maxLength - 8))}...${baseName.slice(-3)}.${extension}`;
  };
  
  // Formatar o tamanho do arquivo para exibição
  const formatFileSize = (bytes) => {
    if (!bytes || isNaN(bytes)) return '';
    
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
  };
  
  // Construir o conteúdo do tooltip
  const tooltipContent = (
    <Box sx={{ p: 1, maxWidth: 250 }}>
      <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
        {fileName}
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box component="span" sx={{ fontWeight: 'bold', minWidth: 60 }}>Tipo:</Box> 
          {document?.file_type ? document.file_type.toUpperCase() : extension.toUpperCase()}
        </Typography>
        
        {document?.file_size && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box component="span" sx={{ fontWeight: 'bold', minWidth: 60 }}>Tamanho:</Box> 
            {formatFileSize(document.file_size)}
          </Typography>
        )}
        
        {document?.status && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box component="span" sx={{ fontWeight: 'bold', minWidth: 60 }}>Status:</Box> 
            {document.status.charAt(0).toUpperCase() + document.status.slice(1)}
          </Typography>
        )}
        
        {document?.created_at && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box component="span" sx={{ fontWeight: 'bold', minWidth: 60 }}>Enviado:</Box> 
            {new Date(document.created_at).toLocaleString()}
          </Typography>
        )}
      </Box>
    </Box>
  );
  
  // Renderizar como card se variant for "card"
  if (variant === "card") {
    return (
      <Tooltip title={tooltipContent} arrow placement="top">
        <Card 
          component={motion.div}
          whileHover={{ y: -5, boxShadow: theme.shadows[8] }}
          transition={{ duration: 0.2 }}
          sx={{
            width: size === 'small' ? 110 : size === 'medium' ? 150 : 180,
            height: size === 'small' ? 110 : size === 'medium' ? 150 : 180,
            borderRadius: 2,
            overflow: 'hidden',
            ...sx
          }}
        >
          <CardActionArea 
            onClick={onClick}
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              p: 1
            }}
          >
            <Badge
              invisible={!showProcessed || document?.status !== 'completed'}
              overlap="circular"
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              badgeContent={
                <CheckIcon sx={{ fontSize: 14, color: 'white' }} />
              }
              sx={{
                '& .MuiBadge-badge': {
                  bgcolor: 'success.main',
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  border: `2px solid ${theme.palette.background.paper}`
                }
              }}
            >
              <Box
                sx={{
                  width: size === 'small' ? 40 : size === 'medium' ? 60 : 80,
                  height: size === 'small' ? 40 : size === 'medium' ? 60 : 80,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: alpha(theme.palette[getColor()].main, 0.1),
                  borderRadius: '50%',
                  mb: 1,
                  p: 1
                }}
              >
                {getIcon()}
              </Box>
            </Badge>
            
            <Typography 
              variant={size === 'small' ? 'caption' : 'body2'} 
              align="center"
              sx={{ 
                fontWeight: 500,
                mt: 1,
                width: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical'
              }}
            >
              {getDisplayName()}
            </Typography>
            
            {size === 'large' && document?.file_size && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                {formatFileSize(document.file_size)}
              </Typography>
            )}
          </CardActionArea>
        </Card>
      </Tooltip>
    );
  }
  
  // Renderizar como chip por padrão
  return (
    <Tooltip title={tooltipContent} arrow placement="top">
      <Chip
        icon={getIcon()}
        label={getDisplayName()}
        variant={document?.status === 'completed' ? "filled" : "outlined"}
        size={size === 'small' ? 'small' : 'medium'}
        onClick={onClick}
        color={getColor()}
        sx={{
          fontWeight: 500,
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          },
          ...sx
        }}
      />
    </Tooltip>
  );
};

export default EnhancedDocumentChip;