import React from 'react';
import { 
  Chip, 
  Tooltip, 
  Box,
  Typography,
  useTheme
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  Description as DocIcon,
  TableChart as ExcelIcon,
  Image as ImageIcon,
  DataObject as JsonIcon,
  Article as TxtIcon
} from '@mui/icons-material';

/**
 * Componente que renderiza um chip para um documento
 * 
 * @param {Object} props
 * @param {Object} props.document - Documento a ser exibido
 * @param {Function} props.onClick - Função chamada ao clicar no chip
 * @param {string} props.variant - Variante do chip (outlined, filled)
 * @param {string} props.size - Tamanho do chip (small, medium)
 * @param {Object} props.sx - Estilos adicionais
 */
const DocumentChip = ({ document, onClick, variant = "outlined", size = "small", sx = {} }) => {
  const theme = useTheme();
  
  // Extrair nome e extensão do arquivo
  const fileName = document?.filename || document?.name || 'Documento';
  const extension = fileName.split('.').pop().toLowerCase();
  
  // Determinar o ícone com base na extensão
  const getIcon = () => {
    switch (extension) {
      case 'pdf':
        return <PdfIcon sx={{ fontSize: size === 'small' ? 16 : 20 }} />;
      case 'doc':
      case 'docx':
        return <DocIcon sx={{ fontSize: size === 'small' ? 16 : 20 }} />;
      case 'xls':
      case 'xlsx':
      case 'csv':
        return <ExcelIcon sx={{ fontSize: size === 'small' ? 16 : 20 }} />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'tiff':
        return <ImageIcon sx={{ fontSize: size === 'small' ? 16 : 20 }} />;
      case 'json':
        return <JsonIcon sx={{ fontSize: size === 'small' ? 16 : 20 }} />;
      default:
        return <TxtIcon sx={{ fontSize: size === 'small' ? 16 : 20 }} />;
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
        return 'default';
    }
  };
  
  // Obter o nome do arquivo truncado se for muito longo
  const getDisplayName = () => {
    // Limitar o comprimento do nome do arquivo com base no tamanho do chip
    const maxLength = size === 'small' ? 15 : 20;
    
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
  
  // Construir o conteúdo do tooltip
  const tooltipContent = (
    <Box sx={{ p: 0.5 }}>
      <Typography variant="body2" fontWeight="medium">
        {fileName}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {document?.file_type || extension.toUpperCase()}
        {document?.file_size && ` • ${(document.file_size / (1024 * 1024)).toFixed(1)} MB`}
        {document?.status && ` • ${document.status.charAt(0).toUpperCase() + document.status.slice(1)}`}
      </Typography>
    </Box>
  );
  
  return (
    <Tooltip title={tooltipContent} arrow placement="top">
      <Chip
        icon={getIcon()}
        label={getDisplayName()}
        variant={variant}
        size={size}
        onClick={onClick}
        color={getColor()}
        sx={{
          fontWeight: 500,
          transition: 'all 0.2s ease',
          '&:hover': {
            opacity: 0.9,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          },
          ...sx
        }}
      />
    </Tooltip>
  );
};

export default DocumentChip;