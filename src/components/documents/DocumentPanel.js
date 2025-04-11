import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Button,
  CircularProgress,
  Divider,
  Paper,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  Stack,
  Menu,
  MenuItem,
  LinearProgress,
  Tabs,
  Tab,
  useTheme
} from '@mui/material';
import {
  Close as CloseIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
  Description as DocumentIcon,
  PictureAsPdf as PdfIcon,
  TableChart as TableIcon,
  InsertDriveFile as FileIcon,
  MoreVert as MoreIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  AccessTime as PendingIcon,
  Link as LinkIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  CloudUpload as CloudUploadIcon,
  CloudDone as CloudDoneIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';

// Importar o componente DocumentUploader
import DocumentUploader from './DocumentUploader';

// Serviços
import { 
  uploadDocument, 
  getUserDocuments, 
  getDocumentContent, 
  pollDocumentStatus,
  deleteDocument,
  associateWithConversation,
  checkDocumentProcessorHealth
} from '../../services/documentService';

// Componente de drop zone para upload
const UploadDropzone = styled('div')(({ theme, isDragActive }) => ({
  border: `2px dashed ${isDragActive ? theme.palette.primary.main : theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(3),
  textAlign: 'center',
  backgroundColor: isDragActive ? 
    theme.palette.mode === 'dark' ? 'rgba(0, 127, 255, 0.08)' : 'rgba(0, 127, 255, 0.04)' : 
    'transparent',
  cursor: 'pointer',
  transition: 'all 0.2s',
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(2),
  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
  }
}));

// Componente para exibir um documento na lista
const DocumentItem = ({ document, onDelete, onView, onAssociate, conversationId }) => {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const isAssociated = conversationId && document.conversations?.includes(conversationId);
  
  // Função para renderizar o ícone correto com base no tipo de arquivo
  const getFileIcon = (fileType) => {
    switch(fileType?.toLowerCase()) {
      case 'pdf':
        return <PdfIcon />;
      case 'xlsx':
      case 'xls':
      case 'csv':
        return <TableIcon />;
      default:
        return <FileIcon />;
    }
  };
  
  // Status com cores e ícones
  const getStatusChip = (status) => {
    const statusConfig = {
      completed: { icon: <CheckIcon fontSize="small" />, color: 'success', label: 'Processado' },
      processing: { icon: <PendingIcon fontSize="small" />, color: 'warning', label: 'Processando' },
      pending: { icon: <PendingIcon fontSize="small" />, color: 'warning', label: 'Pendente' },
      error: { icon: <ErrorIcon fontSize="small" />, color: 'error', label: 'Erro' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    
    return (
      <Chip 
        icon={config.icon}
        label={config.label}
        color={config.color}
        size="small"
        variant="outlined"
      />
    );
  };
  
  return (
    <ListItem 
      sx={{ 
        borderRadius: 1,
        my: 0.5,
        '&:hover': {
          bgcolor: 'action.hover'
        }
      }}
    >
      <ListItemIcon>
        {getFileIcon(document.file_type)}
      </ListItemIcon>
      
      <ListItemText
        primary={document.original_filename || document.filename}
        secondary={
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
            {getStatusChip(document.status)}
            {isAssociated && (
              <Chip 
                icon={<LinkIcon fontSize="small" />}
                label="Vinculado"
                size="small"
                color="info"
                variant="outlined"
              />
            )}
          </Stack>
        }
        primaryTypographyProps={{ 
          variant: 'body2', 
          noWrap: true,
          sx: { fontWeight: 500 }
        }}
        secondaryTypographyProps={{ 
          variant: 'caption',
        }}
      />
      
      <ListItemSecondaryAction>
        <IconButton 
          edge="end" 
          size="small"
          onClick={(e) => setMenuAnchor(e.currentTarget)}
        >
          <MoreIcon fontSize="small" />
        </IconButton>
        
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={() => setMenuAnchor(null)}
        >
          <MenuItem 
            onClick={() => {
              onView(document);
              setMenuAnchor(null);
            }}
            disabled={document.status !== 'completed'}
          >
            <ListItemIcon>
              <SearchIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Visualizar</ListItemText>
          </MenuItem>
          
          {conversationId && !isAssociated && (
            <MenuItem 
              onClick={() => {
                onAssociate(document.document_id);
                setMenuAnchor(null);
              }}
            >
              <ListItemIcon>
                <LinkIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Vincular à conversa</ListItemText>
            </MenuItem>
          )}
          
          <MenuItem 
            onClick={() => {
              onDelete(document.document_id);
              setMenuAnchor(null);
            }}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon sx={{ color: 'inherit' }}>
              <DeleteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Excluir</ListItemText>
          </MenuItem>
        </Menu>
      </ListItemSecondaryAction>
    </ListItem>
  );
};

// Componente principal para o painel de documentos
const DocumentPanel = ({ conversationId, onClose, fullScreen }) => {
  const theme = useTheme();
  
  // Estados
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState(null);
  const [viewDocument, setViewDocument] = useState(null);
  const [documentContent, setDocumentContent] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Para forçar recarregamento
  const [activeTab, setActiveTab] = useState(0); // 0 = documentos, 1 = upload
  const [processorStatus, setProcessorStatus] = useState({
    available: false,
    checked: false,
    message: 'Verificando status do processador...'
  });
  
  // Refs
  const fileInputRef = useRef(null);
  const pollingRef = useRef(null);

  // Verificar o status do processador de documentos ao montar o componente
  useEffect(() => {
    checkProcessorHealth();
  }, []);
  
  // Função para verificar a saúde do processador de documentos
  const checkProcessorHealth = async () => {
    try {
      const health = await checkDocumentProcessorHealth();
      setProcessorStatus({
        available: health.status === 'available',
        checked: true,
        message: health.message || 'Serviço de processamento disponível'
      });
    } catch (error) {
      console.error('Erro ao verificar saúde do processador:', error);
      setProcessorStatus({
        available: false,
        checked: true,
        message: 'Não foi possível conectar ao serviço de processamento de documentos'
      });
    }
  };
  
  // Carrega documentos quando o componente monta ou quando refreshTrigger muda
  useEffect(() => {
    const loadDocuments = async () => {
      try {
        setIsLoading(true);
        const response = await getUserDocuments(conversationId);
        
        if (response.status === 'success' && response.data) {
          setDocuments(response.data.documents || []);
        }
      } catch (error) {
        console.error('Erro ao carregar documentos:', error);
        setError('Não foi possível carregar os documentos');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadDocuments();
    
    // Limpar polling ao desmontar
    return () => {
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
      }
    };
  }, [conversationId, refreshTrigger]);
  
  // Handlers para upload de arquivo
  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
    
    try {
      setIsUploading(true);
      setUploadStatus('uploading');
      setUploadProgress(10); // Inicia com um pequeno progresso para feedback
      
      // Upload do arquivo
      const response = await uploadDocument(files[0], conversationId);
      
      if (response.documentId || response.document_id) {
        const documentId = response.documentId || response.document_id;
        setUploadStatus('processing');
        setUploadProgress(50);
        
        // Iniciar polling para verificar o status do processamento
        const pollResult = await pollDocumentStatus(documentId);
        
        if (pollResult.success) {
          setUploadStatus('completed');
          setUploadProgress(100);
          // Atualizar a lista de documentos
          setRefreshTrigger(prev => prev + 1);
        } else {
          setUploadStatus('error');
          setError(`Erro no processamento: ${pollResult.error}`);
        }
      } else {
        setUploadStatus('error');
        setError('Resposta inválida do servidor');
      }
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      setUploadStatus('error');
      setError(error.message || 'Erro ao fazer upload do documento');
    } finally {
      // Mesmo em caso de erro, finalizamos o upload após um breve delay
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        // Também limpamos o status após um tempo
        setTimeout(() => setUploadStatus(null), 3000);
      }, 1000);
    }
  };
  
  const handleFileSelect = (event) => {
    if (event.target.files && event.target.files.length > 0) {
      handleFileUpload(event.target.files);
      // Limpar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const handleDragEnter = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(true);
  };
  
  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
  };
  
  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };
  
  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
    
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      handleFileUpload(event.dataTransfer.files);
    }
  };
  
  const handleDeleteDocument = async (documentId) => {
    try {
      await deleteDocument(documentId);
      // Atualizar lista removendo o documento excluído
      setDocuments(prev => prev.filter(doc => doc.document_id !== documentId));
    } catch (error) {
      console.error('Erro ao excluir documento:', error);
      setError('Não foi possível excluir o documento');
    }
  };
  
  const handleViewDocument = async (document) => {
    try {
      setViewDocument(document);
      setIsLoading(true);
      
      const response = await getDocumentContent(document.document_id);
      
      if (response.status === 'success' && response.data) {
        setDocumentContent(response.data);
      }
    } catch (error) {
      console.error('Erro ao obter conteúdo do documento:', error);
      setError('Não foi possível obter o conteúdo do documento');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCloseDocumentView = () => {
    setViewDocument(null);
    setDocumentContent(null);
  };
  
  const handleAssociateDocument = async (documentId) => {
    if (!conversationId) return;
    
    try {
      await associateWithConversation(documentId, conversationId);
      // Atualizar a lista para mostrar a associação
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Erro ao associar documento:', error);
      setError('Não foi possível associar o documento à conversa');
    }
  };

  const handleUploadComplete = (documentId, filename) => {
    // Atualizar a lista de documentos
    setRefreshTrigger(prev => prev + 1);
    
    // Exibir mensagem de sucesso
    setUploadStatus('completed');
    setTimeout(() => setUploadStatus(null), 3000);
  };

  const handleUploadError = (errorMessage) => {
    setError(errorMessage);
  };
  
  // Renderização do conteúdo do documento
  const renderDocumentContent = () => {
    if (!documentContent || !documentContent.content) {
      return (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Não há conteúdo disponível para este documento.
          </Typography>
        </Box>
      );
    }
    
    // Renderiza diferentes tipos de elementos
    return (
      <Box sx={{ p: 2 }}>
        {documentContent.content.map((element, index) => {
          switch (element.element_type) {
            case 'text':
              return (
                <Typography 
                  key={index} 
                  variant="body2" 
                  sx={{ mb: 1, whiteSpace: 'pre-wrap' }}
                >
                  {element.text}
                </Typography>
              );
            case 'table':
              return (
                <Box key={index} sx={{ mb: 2, overflowX: 'auto' }}>
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                    Tabela:
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 1 }}>
                    <pre style={{ margin: 0, fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(element.data, null, 2)}
                    </pre>
                  </Paper>
                </Box>
              );
            case 'metadata':
              return (
                <Box key={index} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                    Metadados:
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 1 }}>
                    <pre style={{ margin: 0, fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(element.metadata, null, 2)}
                    </pre>
                  </Paper>
                </Box>
              );
            default:
              return null;
          }
        })}
        
        {/* Mostrar conteúdo estruturado se disponível */}
        {documentContent.structured_content && (
          <Box sx={{ mt: 3 }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Conteúdo Estruturado:
            </Typography>
            <Paper variant="outlined" sx={{ p: 1 }}>
              <pre style={{ margin: 0, fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(documentContent.structured_content, null, 2)}
              </pre>
            </Paper>
          </Box>
        )}
      </Box>
    );
  };
  
  // Componente principal
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%', 
        position: 'relative' 
      }}
    >
      {/* Cabeçalho */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
          Documentos
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Status do processador */}
      {processorStatus.checked && !processorStatus.available && (
        <Alert 
          severity="warning" 
          sx={{ mx: 2, mt: 2 }}
          action={
            <IconButton
              color="inherit"
              size="small"
              onClick={checkProcessorHealth}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          }
        >
          {processorStatus.message}
        </Alert>
      )}
      
      {/* Tabs para alternar entre lista de documentos e upload */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          aria-label="document panel tabs"
          variant="fullWidth"
        >
          <Tab 
            label="Documentos" 
            icon={<DocumentIcon />} 
            iconPosition="start"
          />
          <Tab 
            label="Upload" 
            icon={<CloudUploadIcon />} 
            iconPosition="start"
            disabled={!processorStatus.available}
          />
        </Tabs>
      </Box>
      
      {/* Conteúdo da tab selecionada */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <AnimatePresence mode="wait">
          {activeTab === 0 ? (
            /* Lista de documentos */
            <motion.div
              key="documents-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ height: '100%' }}
            >
              <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                {isLoading && documents.length === 0 ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : error ? (
                  <Alert 
                    severity="error" 
                    sx={{ my: 2 }}
                    onClose={() => setError(null)}
                  >
                    {error}
                  </Alert>
                ) : documents.length === 0 ? (
                  <Box sx={{ py: 4, textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <DocumentIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.3, mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      Nenhum documento disponível
                    </Typography>
                    {conversationId && (
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1, mb: 3 }}>
                        Faça upload de um documento para associá-lo a esta conversa
                      </Typography>
                    )}
                    <Button 
                      variant="outlined" 
                      startIcon={<CloudUploadIcon />}
                      onClick={() => setActiveTab(1)}
                      disabled={!processorStatus.available}
                    >
                      Fazer Upload
                    </Button>
                  </Box>
                ) : (
                  <>
                    {/* Botão de upload no topo da lista quando há documentos */}
                    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        variant="contained"
                        startIcon={<CloudUploadIcon />}
                        size="small"
                        onClick={() => setActiveTab(1)}
                        disabled={!processorStatus.available}
                      >
                        Novo Upload
                      </Button>
                    </Box>
                    
                    {/* Lista de documentos */}
                    <List sx={{ flex: 1, overflow: 'auto' }}>
                      {documents.map((document) => (
                        <DocumentItem
                          key={document.document_id}
                          document={document}
                          onDelete={handleDeleteDocument}
                          onView={handleViewDocument}
                          onAssociate={handleAssociateDocument}
                          conversationId={conversationId}
                        />
                      ))}
                    </List>
                  </>
                )}
              </Box>
            </motion.div>
          ) : (
            /* Área de upload */
            <motion.div
              key="upload-area"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ height: '100%' }}
            >
              <Box sx={{ p: 2, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Upload de Documentos
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Faça upload de documentos para analisar nesta conversa. 
                  Suportamos vários formatos, incluindo PDF, Word, Excel, CSV e outros.
                </Typography>
                
                {/* Componente DocumentUploader */}
                <DocumentUploader 
                  conversationId={conversationId}
                  onUploadComplete={handleUploadComplete}
                  onError={handleUploadError}
                />
                
                {/* OU uma versão simplificada */}
                <Box sx={{ mt: 3, display: processorStatus.available ? 'block' : 'none' }}>
                  <Divider sx={{ my: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      OU
                    </Typography>
                  </Divider>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                    accept=".pdf,.docx,.xlsx,.xls,.csv,.json,.txt,.jpg,.jpeg,.png"
                  />
                  
                  <UploadDropzone 
                    isDragActive={isDragActive}
                    onClick={() => fileInputRef.current?.click()}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    {isUploading ? (
                      <Box sx={{ textAlign: 'center', py: 2 }}>
                        <CircularProgress size={24} sx={{ mb: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                          {uploadStatus === 'uploading' ? 'Enviando documento...' : 'Processando documento...'}
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={uploadProgress} 
                          sx={{ mt: 1, mx: 2 }} 
                        />
                      </Box>
                    ) : (
                      <>
                        <UploadIcon color="action" sx={{ fontSize: 40, mb: 1, opacity: 0.7 }} />
                        <Typography variant="body1" color="text.secondary">
                          Arraste um documento aqui ou clique para selecionar
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                          Suporta PDF, Word, Excel, CSV, TXT, JSON e imagens
                        </Typography>
                      </>
                    )}
                  </UploadDropzone>
                </Box>
                
                {/* Feedback de upload */}
                {uploadStatus === 'completed' && (
                  <Alert 
                    severity="success" 
                    sx={{ mt: 2 }}
                    action={
                      <Button 
                        color="inherit"
                        size="small"
                        onClick={() => setActiveTab(0)}
                      >
                        Ver Documentos
                      </Button>
                    }
                  >
                    Documento processado com sucesso!
                  </Alert>
                )}
                
                {uploadStatus === 'error' && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {error || 'Erro ao processar documento'}
                  </Alert>
                )}
              </Box>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>
      
      {/* Dialog para visualizar documento */}
      <Dialog
        open={Boolean(viewDocument)}
        onClose={handleCloseDocumentView}
        fullWidth
        maxWidth="md"
        fullScreen={fullScreen}
      >
        {viewDocument && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6" noWrap>
                  {viewDocument.original_filename || viewDocument.filename}
                </Typography>
                <IconButton size="small" onClick={handleCloseDocumentView}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            </DialogTitle>
            
            <DialogContent dividers>
              {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                renderDocumentContent()
              )}
            </DialogContent>
            
            <DialogActions>
              <Button onClick={handleCloseDocumentView}>Fechar</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default DocumentPanel;