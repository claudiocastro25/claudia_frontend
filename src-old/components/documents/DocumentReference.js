// Arquivo: src/components/documents/EnhancedDocumentReferences.js

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Collapse,
  Button,
  Grid,
  Divider,
  Chip,
  alpha,
  useTheme
} from '@mui/material';
import {
  KeyboardArrowDown as ExpandMoreIcon,
  KeyboardArrowUp as ExpandLessIcon,
  LocalLibrary as SourceIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import EnhancedDocumentChip from './EnhancedDocumentChip';

/**
 * Componente para exibir referências a documentos em uma mensagem
 * 
 * @param {Object} props
 * @param {Array} props.references - Lista de documentos referenciados
 * @param {Function} props.onViewDocument - Função chamada ao clicar em um documento
 * @param {string} props.variant - Estilo de exibição (compact, detailed)
 * @param {boolean} props.initiallyExpanded - Se as referências devem começar expandidas
 */
const EnhancedDocumentReferences = ({
  references = [],
  onViewDocument,
  variant = 'compact',
  initiallyExpanded = false
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const hasReferences = references && references.length > 0;
  
  if (!hasReferences) return null;
  
  // Agrupar documentos por tipo para melhor organização
  const groupedRefs = references.reduce((acc, ref) => {
    const type = ref.file_type || 'outro';
    if (!acc[type]) acc[type] = [];
    acc[type].push(ref);
    return acc;
  }, {});
  
  // Obter nomes amigáveis para os tipos de arquivo
  const getTypeName = (type) => {
    switch (type.toLowerCase()) {
      case 'pdf': return 'Documentos PDF';
      case 'docx': 
      case 'doc': return 'Documentos Word';
      case 'xlsx': 
      case 'xls': 
      case 'csv': return 'Planilhas';
      case 'jpg':
      case 'jpeg':
      case 'png': return 'Imagens';
      case 'json': return 'Arquivos JSON';
      case 'txt': return 'Arquivos de texto';
      default: return 'Outros documentos';
    }
  };
  
  // Renderização compacta - apenas um botão com contagem
  if (variant === 'compact' && !expanded) {
    return (
      <Box sx={{ mt: 2 }}>
        <Button
          size="small"
          startIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          endIcon={<SourceIcon fontSize="small" />}
          onClick={() => setExpanded(!expanded)}
          color="primary"
          variant="text"
          sx={{ 
            textTransform: 'none',
            fontSize: '0.825rem',
            fontWeight: 500,
            p: 0.5,
            borderRadius: 1.5,
            color: theme.palette.primary.main,
            '&:hover': {
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              color: theme.palette.primary.dark
            }
          }}
        >
          {expanded ? 'Ocultar fontes' : `Baseado em ${references.length} ${references.length === 1 ? 'documento' : 'documentos'}`}
        </Button>
      </Box>
    );
  }
  
  return (
    <AnimatePresence>
      <Box 
        component={motion.div}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        sx={{ 
          mt: 2, 
          pt: 1.5, 
          borderTop: '1px dashed', 
          borderColor: alpha(theme.palette.divider, 0.7)
        }}
      >
        <Button
          size="small"
          startIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          endIcon={<SourceIcon fontSize="small" />}
          onClick={() => setExpanded(!expanded)}
          color="primary"
          variant="text"
          sx={{ 
            textTransform: 'none',
            fontSize: '0.825rem',
            fontWeight: 500,
            p: 0.5,
            borderRadius: 1.5,
            color: theme.palette.primary.main,
            '&:hover': {
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              color: theme.palette.primary.dark
            }
          }}
        >
          {expanded ? 'Ocultar fontes' : `Informações obtidas de ${references.length} ${references.length === 1 ? 'documento' : 'documentos'}`}
        </Button>

        <Collapse in={expanded}>
          <Paper 
            component={motion.div}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            sx={{ 
              mt: 1.5,
              p: 2,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.03),
              border: '1px solid',
              borderColor: alpha(theme.palette.primary.main, 0.1),
            }}
          >
            {variant === 'detailed' ? (
              // Versão detalhada com cards
              <Grid container spacing={2}>
                {references.map((reference, index) => (
                  <Grid item xs={6} sm={4} md={3} key={reference.document_id || `doc-${index}`}>
                    <EnhancedDocumentChip
                      document={reference}
                      onClick={() => onViewDocument && onViewDocument(reference)}
                      variant="card"
                      size="medium"
                      showProcessed={true}
                    />
                  </Grid>
                ))}
              </Grid>
            ) : (
              // Versão compacta com chips agrupados por tipo
              <Box>
                {Object.entries(groupedRefs).map(([type, docs]) => (
                  <Box key={type} sx={{ mb: 1.5, '&:last-child': { mb: 0 } }}>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        display: 'block', 
                        mb: 0.5, 
                        color: 'text.secondary',
                        fontWeight: 500,
                        textTransform: 'uppercase'
                      }}
                    >
                      {getTypeName(type)}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {docs.map((reference, index) => (
                        <EnhancedDocumentChip
                          key={reference.document_id || `doc-${index}`}
                          document={reference}
                          onClick={() => onViewDocument && onViewDocument(reference)}
                          variant="chip"
                          size="medium"
                          showProcessed={true}
                        />
                      ))}
                    </Box>
                  </Box>
                ))}
              </Box>
            )}

            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography 
                variant="caption" 
                color="text.secondary" 
                sx={{ 
                  fontStyle: 'italic'
                }}
              >
                A resposta foi baseada nas informações contidas nestes documentos.
              </Typography>
              
              <Button
                variant="outlined"
                size="small"
                startIcon={<SearchIcon fontSize="small" />}
                onClick={() => {
                  // Abrir o primeiro documento
                  if (references.length > 0 && onViewDocument) {
                    onViewDocument(references[0]);
                  }
                }}
                sx={{ ml: 2 }}
              >
                Explorar Documentos
              </Button>
            </Box>
          </Paper>
        </Collapse>
      </Box>
    </AnimatePresence>
  );
};

export default EnhancedDocumentReferences;