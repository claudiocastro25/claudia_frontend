import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Avatar, 
  Paper, 
  IconButton, 
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  alpha,
  useTheme,
  useMediaQuery,
  Chip,
  Collapse,
  Button,
  Zoom,
  Fade
} from '@mui/material';
import { 
  ContentCopy as CopyIcon, 
  MoreVert as MoreIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon,
  Check as CheckIcon,
  Code as CodeIcon,
  LibraryBooks as SourceIcon,
  FileCopy as DocumentIcon,
  KeyboardArrowDown as ExpandMoreIcon,
  KeyboardArrowUp as ExpandLessIcon,
  OpenInNew as OpenIcon,
  Reply as ReplyIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  FormatQuote as QuoteIcon,
  BarChart as ChartIcon,
  Fullscreen as FullscreenIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import ClaudiaLogo from '../layout/ClaudiaLogo';

// Integração com visualizações
import { useVisualization } from '../../hooks/useVisualization';
import VisualizationContainer from '../visualization/VisualizationContainer';
import VisualizationActions from '../visualization/VisualizationActions';

// Componente para exibir referências de documentos
const DocumentReferences = ({ references, onViewDocument }) => {
  const [expanded, setExpanded] = useState(false);
  const theme = useTheme();

  if (!references || references.length === 0) return null;

  // Agrupar por tipo de documento para melhor organização
  const groupedRefs = references.reduce((acc, ref) => {
    const type = ref.file_type || 'outro';
    if (!acc[type]) acc[type] = [];
    acc[type].push(ref);
    return acc;
  }, {});

  return (
    <Fade in={true}>
      <Box sx={{ 
        mt: 2, 
        pt: 1.5, 
        borderTop: '1px dashed', 
        borderColor: alpha(theme.palette.divider, 0.7)
      }}>
        <Button
          size="small"
          startIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          endIcon={<SourceIcon fontSize="small" />}
          onClick={() => setExpanded(!expanded)}
          color="primary"
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
          <Box 
            sx={{ 
              mt: 1.5,
              p: 1.5,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              border: '1px solid',
              borderColor: alpha(theme.palette.primary.main, 0.15),
            }}
          >
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
                  {type === 'pdf' ? 'Documentos PDF' : 
                   type === 'docx' ? 'Documentos Word' :
                   type === 'xlsx' || type === 'csv' ? 'Planilhas' : 
                   'Outros documentos'}
                </Typography>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {docs.map((reference, index) => (
                    <Chip
                      key={reference.document_id || index}
                      icon={<DocumentIcon fontSize="small" />}
                      label={reference.filename || `Documento ${index + 1}`}
                      size="small"
                      variant="outlined"
                      onClick={() => onViewDocument && onViewDocument(reference)}
                      sx={{ 
                        borderRadius: 1.5,
                        fontWeight: 500,
                        fontSize: '0.75rem',
                        py: 0.25,
                        bgcolor: theme.palette.mode === 'dark' 
                          ? alpha(theme.palette.primary.main, 0.12)
                          : alpha(theme.palette.primary.main, 0.08),
                        borderColor: alpha(theme.palette.primary.main, 0.25),
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.15),
                          borderColor: theme.palette.primary.main,
                        },
                        transition: 'all 0.2s'
                      }}
                      deleteIcon={
                        <Tooltip title="Abrir documento">
                          <OpenIcon fontSize="small" />
                        </Tooltip>
                      }
                      onDelete={() => onViewDocument && onViewDocument(reference)}
                    />
                  ))}
                </Box>
              </Box>
            ))}

            <Typography 
              variant="caption" 
              color="text.secondary" 
              sx={{ 
                display: 'block', 
                mt: 1.5,
                fontStyle: 'italic',
                borderTop: '1px solid',
                borderColor: alpha(theme.palette.divider, 0.5),
                pt: 1
              }}
            >
              A resposta foi baseada nas informações contidas nestes documentos. 
              Clique em um documento para visualizá-lo.
            </Typography>
          </Box>
        </Collapse>
      </Box>
    </Fade>
  );
};

// Componente para formatar o conteúdo da mensagem
const MessageContent = ({ content }) => {
  // Referência para renderização de HTML seguro
  const containerRef = useRef(null);
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  useEffect(() => {
    if (containerRef.current && (content.includes('<html>') || content.includes('<svg') || content.includes('<canvas'))) {
      // Renderizar conteúdo HTML de forma segura
      containerRef.current.innerHTML = content;
    }
  }, [content]);

  // Formatar blocos de código com syntax highlighting mais moderno
  const formatContent = (text) => {
    if (!text) return null;
    
    // Remover blocos de visualização (serão tratados separadamente)
    const contentWithoutVisualization = text.replace(/```visualization\s*([\s\S]*?)\s*```/g, '');
    
    return contentWithoutVisualization.split('```').map((part, index) => {
      // Textos pares são normais, ímpares são blocos de código
      if (index % 2 === 0) {
        // Formatar links no texto normal
        let formattedText = part;
        
        // Detectar URLs e transformá-las em links
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        formattedText = formattedText.replace(urlRegex, (url) => {
          return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: ${theme.palette.primary.main}; text-decoration: none; border-bottom: 1px solid ${theme.palette.primary.main};">${url}</a>`;
        });
        
        // Destacar trechos entre asteriscos para bold/italic
        formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        return (
          <Typography 
            key={index} 
            variant="body1"
            sx={{ 
              whiteSpace: 'pre-wrap',
              lineHeight: 1.7, // Linha mais espaçada para melhor leitura
              mb: part.trim() ? 2 : 0,
              color: 'text.primary',
              fontSize: '0.95rem',
              '& a': {
                color: 'primary.main', 
                textDecoration: 'none',
                borderBottom: '1px solid',
                borderColor: 'primary.light',
                transition: 'all 0.2s ease',
                '&:hover': {
                  opacity: 0.85,
                  borderColor: 'primary.main',
                }
              },
              '& strong': {
                fontWeight: 600
              }
            }}
            dangerouslySetInnerHTML={{ __html: formattedText }}
          />
        );
      } else {
        const lines = part.split('\n');
        const language = lines[0]?.trim() || '';
        const code = lines.slice(1).join('\n');
        
        // Cores mais atraentes para blocos de código
        const bgColor = isDarkMode ? '#1E1F22' : '#FAFBFC';
        const borderColor = isDarkMode ? '#2D2E32' : '#E8EAED';
        const headerBg = isDarkMode ? '#2D2E32' : '#F0F2F5';
        
        return (
          <Box 
            component={motion.div}
            initial={{ opacity: 0.9, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            key={index} 
            sx={{ 
              position: 'relative',
              my: 2.5, 
              borderRadius: 2, 
              overflow: 'hidden',
              border: '1px solid',
              borderColor: borderColor,
              boxShadow: isDarkMode 
                ? '0 4px 12px rgba(0,0,0,0.15)' 
                : '0 2px 8px rgba(0,0,0,0.05)',
              transition: 'all 0.2s ease',
              '&:hover': {
                boxShadow: isDarkMode 
                  ? '0 6px 16px rgba(0,0,0,0.2)' 
                  : '0 4px 12px rgba(0,0,0,0.08)',
              }
            }}
          >
            {/* Cabeçalho do bloco de código */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              px: 2,
              py: 1,
              bgcolor: headerBg,
              borderBottom: '1px solid',
              borderColor: borderColor
            }}>
              <Chip 
                label={language || 'código'} 
                size="small" 
                color="primary" 
                variant="outlined"
                sx={{ 
                  height: 24, 
                  fontSize: '0.75rem', 
                  fontWeight: 600,
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                  borderColor: alpha(theme.palette.primary.main, 0.3),
                  '& .MuiChip-label': { 
                    px: 1,
                    fontFamily: '"Fira Code", "Roboto Mono", monospace',
                  }
                }}
              />
              <Tooltip title="Copiar código">
                <IconButton 
                  size="small" 
                  onClick={() => navigator.clipboard.writeText(code)}
                  sx={{ 
                    color: 'text.secondary',
                    '&:hover': { 
                      color: 'primary.main',
                      bgcolor: alpha(theme.palette.primary.main, 0.1)
                    },
                    transition: 'all 0.2s'
                  }}
                >
                  <CopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            
            {/* Corpo do código com cores melhoradas */}
            <Box sx={{ 
              p: 2,
              bgcolor: bgColor,
              overflowX: 'auto',
              position: 'relative',
              '&::-webkit-scrollbar': {
                height: 8,
              },
              '&::-webkit-scrollbar-track': {
                background: isDarkMode ? '#2A2B2E' : '#EBEDEF'
              },
              '&::-webkit-scrollbar-thumb': {
                background: isDarkMode ? '#4D4E54' : '#C1C5C9',
                borderRadius: 4
              }
            }}>
              <Typography 
                component="pre" 
                sx={{ 
                  m: 0, 
                  whiteSpace: 'pre-wrap',
                  fontFamily: '"Fira Code", "Roboto Mono", monospace',
                  fontSize: '0.85rem',
                  lineHeight: 1.5,
                  color: isDarkMode ? '#E2E4E9' : '#273142'
                }}
              >
                {code}
              </Typography>
            </Box>
          </Box>
        );
      }
    });
  };

  // Renderizar HTML ou formatar conteúdo
  if (content && (content.includes('<html>') || content.includes('<svg') || content.includes('<canvas'))) {
    return <Box ref={containerRef} sx={{ width: '100%', my: 2 }} />;
  }

  return <Box sx={{ whiteSpace: 'pre-wrap' }}>{formatContent(content)}</Box>;
};

// Componente principal de item de mensagem (aprimorado)
const MessageItem = ({ 
  message, 
  onDelete, 
  onViewDocument,
  documentReferences = []
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [copied, setCopied] = useState(false);
  const [starred, setStarred] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [messageVisualization, setMessageVisualization] = useState(null);
  
  // Hook de visualização para processar mensagens
  const { extractVisualizationFromMessage, openVisualization } = useVisualization();
  
  // Detectar visualizações na mensagem
  useEffect(() => {
    if (message?.role === 'assistant' && message?.content) {
      const vizData = extractVisualizationFromMessage(message.content);
      if (vizData) {
        setMessageVisualization({
          ...vizData,
          messageId: message.message_id,
          conversationId: message.conversation_id
        });
      }
    }
  }, [message, extractVisualizationFromMessage]);
  
  // Manipuladores do menu de contexto
  const handleMenuClick = (event) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };
  
  // Copiar conteúdo da mensagem com feedback visual
  const handleCopyMessage = () => {
    if (message?.content) {
      navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    handleMenuClose();
  };
  
  // Ações adicionais
  const handleToggleStar = () => {
    setStarred(!starred);
    handleMenuClose();
  };
  
  const handleReplyToMessage = () => {
    // Implementação para responder diretamente a esta mensagem
    handleMenuClose();
  };
  
  // Excluir mensagem
  const handleDeleteMessage = () => {
    if (onDelete && typeof onDelete === 'function') {
      onDelete(message.message_id);
    }
    handleMenuClose();
  };
  
  // Propriedades da mensagem
  const isAssistant = message?.role === 'assistant';
  const isUser = message?.role === 'user';
  const messageDate = message?.created_at ? new Date(message.created_at) : new Date();
  const hasCode = message?.content && message.content.includes('```');
  
  // Verificar se tem referências a documentos
  const hasReferences = documentReferences && documentReferences.length > 0;
  
  // Formatar data e hora de forma mais amigável
  const formatTimeAgo = (date) => {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Agora mesmo';
    if (minutes < 60) return `${minutes}m atrás`;
    if (hours < 24) return `${hours}h atrás`;
    if (days < 7) return `${days}d atrás`;
    
    return date.toLocaleDateString();
  };
  
  // Hora formatada de forma mais amigável
  const timeAgo = formatTimeAgo(messageDate);
  const formattedTime = messageDate.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit'
  });

  // Verificar se a mensagem está definida
  if (!message) return null;
  
  return (
    <Box 
      component={motion.div}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      sx={{ 
        width: '100%',
        maxWidth: 900,
        mx: 'auto',
        my: 3,
        px: { xs: 1, md: 3 }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.5, sm: 2 },
          borderRadius: 2.5,
          bgcolor: isAssistant 
            ? theme.palette.mode === 'dark' 
              ? alpha(theme.palette.primary.dark, 0.08) 
              : alpha(theme.palette.primary.light, 0.06)
            : theme.palette.mode === 'dark'
              ? alpha(theme.palette.background.paper, 0.3)
              : alpha(theme.palette.background.paper, 0.7),
          borderLeft: isAssistant ? '3px solid' : 'none',
          borderColor: isAssistant ? alpha(theme.palette.primary.main, 0.5) : 'transparent',
          transition: 'all 0.2s ease',
          boxShadow: hovered 
            ? (theme.palette.mode === 'dark' 
              ? '0 4px 12px rgba(0,0,0,0.2)' 
              : '0 4px 12px rgba(0,0,0,0.08)')
            : 'none',
          transform: hovered ? 'translateY(-1px)' : 'none'
        }}
      >
        <Box 
          sx={{ 
            display: 'flex',
            alignItems: 'flex-start',
            gap: 2
          }}
        >
          {/* Avatar com logo da Claudia para o assistente */}
          <Box sx={{ mt: 0.5 }}>
            {isAssistant ? (
              <ClaudiaLogo size="small" showText={false} variant={theme.palette.mode === 'dark' ? 'glow' : 'default'} />
            ) : (
              <Avatar
                sx={{
                  bgcolor: theme.palette.secondary.main,
                  color: '#fff',
                  width: 36,
                  height: 36
                }}
              >
                <PersonIcon fontSize="small" />
              </Avatar>
            )}
          </Box>
          
          {/* Conteúdo da mensagem */}
          <Box sx={{ 
            flex: 1,
            minWidth: 0
          }}>
            {/* Cabeçalho da mensagem */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mb: 1,
              gap: 1
            }}>
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  fontWeight: 600, 
                  color: isAssistant ? 'primary.main' : 'secondary.main'
                }}
              >
                {isAssistant ? 'Claud.IA' : 'Você'}
              </Typography>
              
              {hasCode && (
                <Tooltip title="Contém código">
                  <Chip
                    icon={<CodeIcon sx={{ fontSize: '0.7rem !important' }} />}
                    label="Código"
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.65rem',
                      fontWeight: 500,
                      bgcolor: alpha(theme.palette.info.main, 0.1),
                      color: theme.palette.info.main,
                      '& .MuiChip-label': { px: 0.5 }
                    }}
                  />
                </Tooltip>
              )}
              
              {/* Indicador de documento referenciado */}
              {isAssistant && hasReferences && (
                <Tooltip title="Baseado em documentos">
                  <Chip
                    icon={<SourceIcon sx={{ fontSize: '0.7rem !important' }} />}
                    label={`${documentReferences.length} fonte${documentReferences.length > 1 ? 's' : ''}`}
                    size="small"
                    sx={{ 
                      height: 20, 
                      fontSize: '0.65rem',
                      fontWeight: 500,
                      bgcolor: alpha(theme.palette.success.main, 0.1),
                      color: theme.palette.success.main,
                      '& .MuiChip-label': { px: 0.5 }
                    }}
                  />
                </Tooltip>
              )}
              
              {/* Indicador de visualização */}
              {isAssistant && messageVisualization && (
                <Tooltip title="Contém visualização">
                  <Chip
                    icon={<ChartIcon sx={{ fontSize: '0.7rem !important' }} />}
                    label="Visualização"
                    size="small"
                    sx={{ 
                      height: 20, 
                      fontSize: '0.65rem',
                      fontWeight: 500,
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main,
                      '& .MuiChip-label': { px: 0.5 }
                    }}
                  />
                </Tooltip>
              )}
              
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  ml: 'auto',
                  fontSize: '0.7rem'
                }}
              >
                <TimeIcon sx={{ fontSize: 14, opacity: 0.7 }} />
                <Tooltip title={formattedTime}>
                  <span>{timeAgo}</span>
                </Tooltip>
              </Typography>
              
              {/* Ações da mensagem - visíveis apenas no hover */}
              <Fade in={hovered}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Tooltip title={copied ? "Copiado!" : "Copiar mensagem"}>
                    <IconButton 
                      size="small" 
                      onClick={handleCopyMessage}
                      color={copied ? "success" : "default"}
                      sx={{ 
                        color: copied ? 'success.main' : 'action.active',
                        width: 28,
                        height: 28
                      }}
                    >
                      {copied ? <CheckIcon fontSize="small" /> : <CopyIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title={starred ? "Remover destaque" : "Destacar mensagem"}>
                    <IconButton 
                      size="small"
                      onClick={handleToggleStar}
                      sx={{ 
                        color: starred ? 'warning.main' : 'action.active',
                        width: 28,
                        height: 28
                      }}
                    >
                      {starred ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title="Mais opções">
                    <IconButton 
                      size="small"
                      onClick={handleMenuClick}
                      sx={{ 
                        color: 'action.active',
                        width: 28,
                        height: 28
                      }}
                    >
                      <MoreIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Fade>
            </Box>
            
            {/* Corpo da mensagem */}
            <Box sx={{ 
              mt: 0.5,
              color: 'text.primary',
              '& p:first-of-type': { mt: 0 },
              '& p:last-of-type': { mb: 0 },
            }}>
              <MessageContent content={message.content} />
              
              {/* Visualização incorporada na mensagem */}
              {messageVisualization && (
                <Box sx={{ mt: 2, mb: 1 }}>
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 2, 
                      borderRadius: 2,
                      bgcolor: theme.palette.mode === 'dark' 
                        ? alpha(theme.palette.background.paper, 0.2) 
                        : alpha(theme.palette.background.paper, 0.5)
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
                        {messageVisualization.title || 'Visualização de Dados'}
                      </Typography>
                      <VisualizationActions 
                        visualization={messageVisualization}
                        conversationId={message.conversation_id}
                        messageId={message.message_id}
                      />
                    </Box>
                    
                    <VisualizationContainer 
                      data={messageVisualization.data}
                      type={messageVisualization.type || 'bar'}
                      height={220}
                      options={messageVisualization.options || {}}
                    />
                    
                    <Button 
                      size="small" 
                      startIcon={<FullscreenIcon fontSize="small" />}
                      sx={{ mt: 1 }} 
                      onClick={() => openVisualization(messageVisualization)}
                    >
                      Expandir visualização
                    </Button>
                  </Paper>
                </Box>
              )}
              
              {/* Componente de referências de documentos */}
              {isAssistant && hasReferences && (
                <DocumentReferences 
                  references={documentReferences} 
                  onViewDocument={onViewDocument}
                />
              )}
            </Box>
          </Box>
        </Box>
      </Paper>
      
      {/* Menu de opções aprimorado */}
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
        PaperProps={{
          elevation: 3,
          sx: { 
            mt: 0.5, 
            minWidth: 200,
            borderRadius: 2,
            overflow: 'hidden',
            bgcolor: theme.palette.mode === 'dark' 
              ? alpha(theme.palette.background.paper, 0.9)
              : alpha(theme.palette.background.paper, 0.95),
            backdropFilter: 'blur(10px)',
            boxShadow: theme.palette.mode === 'dark'
              ? '0 6px 16px rgba(0, 0, 0, 0.3)'
              : '0 6px 16px rgba(0, 0, 0, 0.1)',
            '& .MuiMenuItem-root': {
              py: 1.25,
              px: 2
            }
          }
        }}
      >
        <MenuItem onClick={handleCopyMessage}>
          <ListItemIcon>
            <CopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText 
            primary="Copiar mensagem" 
            primaryTypographyProps={{ fontSize: '0.875rem' }}
          />
        </MenuItem>
        
        <MenuItem onClick={handleReplyToMessage}>
          <ListItemIcon>
            <ReplyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText 
            primary="Responder" 
            primaryTypographyProps={{ fontSize: '0.875rem' }}
          />
        </MenuItem>
        
        <MenuItem onClick={handleToggleStar}>
          <ListItemIcon>
            {starred ? <StarIcon fontSize="small" color="warning" /> : <StarBorderIcon fontSize="small" />}
          </ListItemIcon>
          <ListItemText 
            primary={starred ? "Remover destaque" : "Destacar mensagem"} 
            primaryTypographyProps={{ fontSize: '0.875rem' }}
          />
        </MenuItem>
        
        <MenuItem onClick={() => window.open(`data:text/plain;charset=utf-8,${encodeURIComponent(message.content)}`)}>
          <ListItemIcon>
            <OpenIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText 
            primary="Exportar texto" 
            primaryTypographyProps={{ fontSize: '0.875rem' }}
          />
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={handleDeleteMessage} sx={{ color: 'error.main' }}>
          <ListItemIcon sx={{ color: 'error.main' }}>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText 
            primary="Excluir mensagem" 
            primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
          />
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default MessageItem;