import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  IconButton, 
  Paper, 
  Tooltip, 
  CircularProgress,
  Typography,
  Zoom,
  Badge,
  Divider,
  Fab,
  Collapse,
  LinearProgress,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Button,
  alpha,
  useTheme
} from '@mui/material';
import {
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  InsertDriveFile as FileIcon,
  Close as CloseIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  Description as DocumentIcon,
  CloudUpload as UploadIcon,
  FileCopy as FileListIcon,
  Folder as FolderIcon,
  Info as InfoIcon,
  Error as ErrorIcon,
  Check as CheckIcon,
  Search as SearchIcon,
  Article as ArticleIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadDocument, getUserDocuments, checkDocumentProcessorHealth } from '../../services/documentService';

// Estilo para o input de arquivo (invisível)
const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

// Componente para exibir documentos ativos
const ActiveDocumentsDrawer = ({ 
  open, 
  onClose, 
  documents = [], 
  onViewDocument, 
  conversationId,
  onUploadNew
}) => {
  const theme = useTheme();
  
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { 
          width: { xs: '85%', sm: 400 }, 
          p: 2,
          borderTopLeftRadius: 8,
          borderBottomLeftRadius: 8,
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FolderIcon color="primary" />
          Documentos da Conversa
        </Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      {documents.length === 0 ? (
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            justifyContent: 'center',
            height: 200,
            textAlign: 'center',
            p: 3
          }}
        >
          <ArticleIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Nenhum documento disponível nesta conversa
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Você pode carregar documentos para obter respostas baseadas em conteúdo específico
          </Typography>
          
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={onUploadNew}
          >
            Carregar Documento
          </Button>
        </Box>
      ) : (
        <>
          <List sx={{ width: '100%' }}>
            {documents.map((doc) => {
              const fileTypeIcon = getFileIcon(doc.file_type);
              const statusColor = getStatusColor(doc.status);
              
              return (
                <ListItem
                  key={doc.document_id}
                  button
                  onClick={() => onViewDocument && onViewDocument(doc)}
                  sx={{ 
                    mb: 1, 
                    borderRadius: 1, 
                    border: '1px solid',
                    borderColor: 'divider',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.04)
                    }
                  }}
                >
                  <ListItemIcon>
                    {fileTypeIcon}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography 
                        variant="body2" 
                        noWrap 
                        sx={{ 
                          fontWeight: 500,
                          maxWidth: '180px'
                        }}
                      >
                        {doc.filename || doc.original_filename}
                      </Typography>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Chip 
                          label={doc.status} 
                          size="small"
                          color={statusColor}
                          variant="outlined"
                          sx={{ 
                            height: 20, 
                            '& .MuiChip-label': { 
                              px: 0.5, 
                              fontSize: '0.65rem',
                              fontWeight: 500
                            }
                          }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {formatFileSize(doc.file_size)}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Tooltip title="Ver documento">
                      <IconButton edge="end" size="small" onClick={() => onViewDocument && onViewDocument(doc)}>
                        <SearchIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
              );
            })}
          </List>
          
          <Button
            fullWidth
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={onUploadNew}
            sx={{ mt: 2 }}
          >
            Carregar Novo Documento
          </Button>
        </>
      )}
    </Drawer>
  );
};

// Helpers para visualização de documentos
const getFileIcon = (fileType) => {
  switch (fileType?.toLowerCase()) {
    case 'pdf':
      return <DocumentIcon color="error" />;
    case 'docx':
    case 'doc':
      return <DocumentIcon color="primary" />;
    case 'xlsx':
    case 'xls':
    case 'csv':
      return <DocumentIcon color="success" />;
    case 'txt':
    case 'json':
      return <DocumentIcon color="info" />;
    default:
      return <FileIcon color="action" />;
  }
};

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'completed':
      return 'success';
    case 'processing':
      return 'info';
    case 'error':
      return 'error';
    case 'pending':
      return 'warning';
    default:
      return 'default';
  }
};

const formatFileSize = (size) => {
  if (!size) return 'Desconhecido';
  
  if (size < 1024) {
    return `${size} B`;
  } else if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  } else {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
};

const MessageInput = ({ 
  onSendMessage, 
  onAttachFile,
  disabled = false, 
  isTyping = false,
  processorAvailable = true,
  conversationId = null,
  onOpenDocumentUploader = null,
  onViewDocument = null,
  showDocumentBadge = false
}) => {
  const theme = useTheme();
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null); // null, 'uploading', 'processing', 'success', 'error'
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [showUploadDetails, setShowUploadDetails] = useState(false);
  const [documentsDrawerOpen, setDocumentsDrawerOpen] = useState(false);
  const [activeDocuments, setActiveDocuments] = useState([]);
  const [documentsCount, setDocumentsCount] = useState(0);
  const [isProcessorAvailable, setIsProcessorAvailable] = useState(processorAvailable);
  const fileInputRef = useRef(null);
  const textInputRef = useRef(null);

  // Focar no input de texto quando o componente monta
  useEffect(() => {
    if (textInputRef.current) {
      textInputRef.current.focus();
    }
  }, []);

  // Verificar status do processador quando o componente monta
  useEffect(() => {
    checkProcessorStatus();
  }, []);

  // Carregar documentos ativos quando a conversa muda
  useEffect(() => {
    if (conversationId) {
      loadActiveDocuments();
    } else {
      setActiveDocuments([]);
      setDocumentsCount(0);
    }
    
    // Limpar estado de upload
    setSelectedFile(null);
    setUploadStatus(null);
    setUploadProgress(0);
    setUploadError('');
  }, [conversationId]);

  // Verificar status do processador de documentos
  const checkProcessorStatus = async () => {
    try {
      const health = await checkDocumentProcessorHealth();
      console.log("Status do processador verificado:", health);
      
      // CORREÇÃO: Usar a propriedade normalizada 'available'
      setIsProcessorAvailable(health.available === true);
    } catch (error) {
      console.error("Erro ao verificar status do processador:", error);
      setIsProcessorAvailable(false);
    }
  };

  // Função para carregar documentos ativos
  const loadActiveDocuments = async () => {
    if (!conversationId) return;
    
    try {
      const response = await getUserDocuments(conversationId);
      console.log("Documentos da conversa recebidos:", response);
      
      // CORREÇÃO: Usar o formato normalizado consistente
      if (response && response.data && response.data.documents) {
        setActiveDocuments(response.data.documents);
        setDocumentsCount(response.data.documents.length);
      } else {
        console.warn("Formato de resposta inesperado para documentos:", response);
        setActiveDocuments([]);
        setDocumentsCount(0);
      }
    } catch (error) {
      console.error('Erro ao carregar documentos ativos:', error);
      setActiveDocuments([]);
      setDocumentsCount(0);
    }
  };

  // Permitir envio com Enter, mas nova linha com Shift+Enter
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Enviar mensagem
  const handleSendMessage = async () => {
    if (message.trim() === '' && !selectedFile) return;

    // Se temos uma mensagem, enviá-la
    if (message.trim() !== '') {
      onSendMessage(message);
      setMessage('');
    }
    
    // Se temos um arquivo e ele ainda não foi enviado, enviá-lo
    if (selectedFile && uploadStatus !== 'success') {
      await handleUploadFile();
    }
  };

  // Selecionar arquivo
  const handleFileChange = (event) => {
    const file = event.target.files && event.target.files[0];
    if (file) {
      // Verificar se existe um handler externo
      if (onAttachFile) {
        onAttachFile(event);
        return;
      }
      
      // Verificar tamanho (limite de 100MB)
      if (file.size > 100 * 1024 * 1024) {
        setUploadError(`O arquivo é muito grande (${(file.size / (1024 * 1024)).toFixed(1)}MB). O limite é 100MB.`);
        setUploadStatus('error');
        setShowUploadDetails(true);
        return;
      }
      
      // Caso contrário, utilizar o comportamento padrão
      setSelectedFile(file);
      setUploadStatus(null);
      setUploadError('');
      setShowUploadDetails(true);
    }
  };

  // Upload de arquivo
  const handleUploadFile = async () => {
    if (!selectedFile || !isProcessorAvailable || !conversationId) return;

    try {
      setUploadStatus('uploading');
      setUploadProgress(0);
      
      // Simulação de progresso
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + (5 * Math.random());
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 300);

      // Upload do documento usando o serviço
      const response = await uploadDocument(selectedFile, conversationId);
      
      // Limpar o intervalo de progresso simulado
      clearInterval(progressInterval);
      
      // CORREÇÃO: Usar a resposta normalizada
      if (response && response.documentId) {
        setUploadStatus('success');
        setUploadProgress(100);
        
        // Recarregar a lista de documentos
        await loadActiveDocuments();
        
        // Limpar após um delay
        setTimeout(() => {
          setSelectedFile(null);
          setUploadStatus(null);
          setUploadProgress(0);
        }, 2000);
      } else {
        throw new Error('Resposta inválida do servidor');
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      setUploadStatus('error');
      setUploadError(error.message || 'Erro ao fazer upload do documento');
    }
  };

  // Remover arquivo selecionado
  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadStatus(null);
    setUploadProgress(0);
    setUploadError('');
    // Limpar o valor do input de arquivo para permitir selecionar o mesmo arquivo novamente
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Retry upload
  const handleRetryUpload = () => {
    setUploadStatus(null);
    setUploadError('');
    setUploadProgress(0);
  };

  // Abrir o uploader de documentos completo
  const handleOpenDocumentUploader = () => {
    if (onOpenDocumentUploader) {
      onOpenDocumentUploader();
    }
  };

  // Renderizar a área de upload de arquivo
  const renderFileUploadArea = () => {
    if (!selectedFile) return null;

    return (
      <Paper
        component={motion.div}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        elevation={1}
        sx={{
          p: 1,
          mb: 1,
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <IconButton 
              size="small" 
              onClick={() => setShowUploadDetails(!showUploadDetails)}
              sx={{ mr: 1 }}
            >
              {showUploadDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
            <FileIcon color="primary" sx={{ mr: 1 }} />
            <Typography 
              variant="body2" 
              noWrap 
              sx={{ 
                flex: 1,
                fontWeight: 500,
                color: uploadStatus === 'error' ? 'error.main' : 'text.primary'
              }}
            >
              {selectedFile.name}
            </Typography>
          </Box>
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
            {uploadStatus === 'uploading' || uploadStatus === 'processing' ? (
              <CircularProgress size={20} sx={{ mr: 1 }} />
            ) : uploadStatus === 'success' ? (
              <CheckIcon fontSize="small" color="success" sx={{ mr: 1 }} />
            ) : uploadStatus === 'error' ? (
              <ErrorIcon fontSize="small" color="error" sx={{ mr: 1 }} />
            ) : null}
            <IconButton size="small" onClick={handleRemoveFile}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
        
        <Collapse in={showUploadDetails}>
          <Box sx={{ mt: 1 }}>
            <LinearProgress 
              variant="determinate" 
              value={uploadProgress}
              sx={{ 
                height: 4, 
                borderRadius: 2,
                mb: 1,
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
              }}
              color={uploadStatus === 'error' ? 'error' : 'primary'}
            />
            
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="caption" color="text.secondary">
                {uploadStatus === 'uploading' ? 'Enviando...' : 
                 uploadStatus === 'processing' ? 'Processando documento...' :
                 uploadStatus === 'success' ? 'Documento processado' :
                 uploadStatus === 'error' ? 'Erro no processamento' :
                 'Pronto para enviar'}
              </Typography>
              
              <Typography variant="caption" color="text.secondary">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </Typography>
            </Box>
            
            {uploadStatus === 'error' && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="error">
                  {uploadError || 'Ocorreu um erro ao processar o documento.'}
                </Typography>
                <Box sx={{ mt: 0.5, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    size="small"
                    variant="outlined"
                    color="primary"
                    onClick={handleRetryUpload}
                    startIcon={<UploadIcon fontSize="small" />}
                  >
                    Tentar novamente
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        </Collapse>
      </Paper>
    );
  };

  return (
    <Box>
      <AnimatePresence>
        {selectedFile && renderFileUploadArea()}
      </AnimatePresence>
      
      <Paper
        elevation={0}
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          p: 1,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
          bgcolor: theme.palette.background.paper,
        }}
      >
        {/* Botão para exibir documentos associados */}
        <Tooltip 
          title={
            documentsCount > 0 
              ? `Ver ${documentsCount} documentos disponíveis` 
              : "Sem documentos associados"
          }
          placement="top"
        >
          <IconButton
            color={documentsCount > 0 ? "primary" : "default"}
            onClick={() => setDocumentsDrawerOpen(true)}
            sx={{
              color: documentsCount > 0 
                ? theme.palette.primary.main 
                : theme.palette.text.secondary,
              '&:hover': {
                color: theme.palette.primary.main,
              },
            }}
          >
            <Badge 
              badgeContent={documentsCount} 
              color="primary"
              invisible={documentsCount === 0}
            >
              <FileListIcon />
            </Badge>
          </IconButton>
        </Tooltip>
        
        {/* Botão para anexar documentos */}
        <Tooltip 
          title={isProcessorAvailable ? "Anexar documento" : "Processador de documentos indisponível"}
          placement="top"
        >
          <Box sx={{ display: 'inline-flex' }}>
            <IconButton 
              color="primary"
              component="label"
              disabled={!isProcessorAvailable || disabled || !conversationId}
              sx={{
                color: theme.palette.text.secondary,
                '&:hover': {
                  color: theme.palette.primary.main,
                },
              }}
            >
              <AttachFileIcon />
              <VisuallyHiddenInput 
                type="file" 
                onChange={handleFileChange}
                accept=".pdf,.docx,.xlsx,.xls,.csv,.json,.txt,.jpg,.jpeg,.png"
                ref={fileInputRef}
              />
            </IconButton>
          </Box>
        </Tooltip>
        
        <TextField
          inputRef={textInputRef}
          fullWidth
          placeholder={conversationId 
            ? "Envie uma mensagem..." 
            : "Selecione ou crie uma conversa para começar"}
          multiline
          maxRows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || !conversationId}
          InputProps={{
            disableUnderline: true,
            sx: { 
              bgcolor: 'transparent',
              pl: 1, 
              pr: 1,
              fontSize: '0.95rem',
            }
          }}
          variant="standard"
          sx={{ ml: 1 }}
        />

        <Box sx={{ ml: 1, display: 'flex', alignItems: 'center' }}>
          {isTyping ? (
            <Tooltip title="Gerando resposta..." placement="top">
              <CircularProgress size={24} />
            </Tooltip>
          ) : (
            <Zoom in={message.trim() !== '' || selectedFile !== null}>
              <Tooltip title="Enviar mensagem" placement="top">
                <IconButton
                  color="primary"
                  onClick={handleSendMessage}
                  disabled={disabled || !conversationId || (message.trim() === '' && !selectedFile)}
                  sx={{ 
                    bgcolor: message.trim() !== '' || selectedFile ? theme.palette.primary.main : 'transparent',
                    color: message.trim() !== '' || selectedFile ? theme.palette.primary.contrastText : theme.palette.text.secondary,
                    '&:hover': {
                      bgcolor: message.trim() !== '' || selectedFile ? theme.palette.primary.dark : 'rgba(0,0,0,0.04)',
                    },
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  <SendIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Zoom>
          )}
        </Box>
      </Paper>
      
      {uploadStatus === 'uploading' || uploadStatus === 'processing' ? (
        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            {uploadStatus === 'uploading' ? 'Enviando documento...' : 'Processando documento...'}
          </Typography>
        </Box>
      ) : null}

      {/* Contador de caracteres e status */}
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          mt: 0.5,
          px: 2,
          opacity: 0.7
        }}
      >
        <Typography variant="caption" color="text.secondary">
          {isProcessorAvailable 
            ? documentsCount > 0 
              ? `${documentsCount} documento${documentsCount > 1 ? 's' : ''} disponível${documentsCount > 1 ? 'is' : ''}`
              : "Você pode enviar documentos para análise" 
            : "Análise de documentos indisponível"}
        </Typography>
        
        <Typography variant="caption" color="text.secondary">
          {message.length > 0 ? `${message.length} caracteres` : ''}
        </Typography>
      </Box>
      
      {/* Drawer de documentos ativos */}
      <ActiveDocumentsDrawer
        open={documentsDrawerOpen}
        onClose={() => setDocumentsDrawerOpen(false)}
        documents={activeDocuments}
        onViewDocument={onViewDocument}
        conversationId={conversationId}
        onUploadNew={handleOpenDocumentUploader}
      />
    </Box>
  );
};

export default MessageInput;