import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  CircularProgress, 
  Alert, 
  IconButton,
  Tooltip,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Stack,
  useTheme
} from '@mui/material';
import { 
  UploadFile as UploadIcon, 
  Description as DocumentIcon,
  Close as CloseIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  Article as FileIcon,
  Delete as DeleteIcon,
  CloudUpload as CloudUploadIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useDropzone } from 'react-dropzone';
import { 
  uploadDocument, 
  pollDocumentStatus, 
  checkDocumentProcessorHealth 
} from '../../services/documentService';
import { motion, AnimatePresence } from 'framer-motion';

// Tamanho máximo configurado no cliente - alinhado com o backend (100MB)
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

// Componente estilizado de drag-and-drop
const DropzoneArea = styled(Box)(({ theme, isDragActive }) => ({
  border: `2px dashed ${isDragActive ? theme.palette.primary.main : theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(4),
  textAlign: 'center',
  backgroundColor: isDragActive 
    ? theme.palette.mode === 'dark' 
      ? 'rgba(144, 202, 249, 0.08)' 
      : 'rgba(33, 150, 243, 0.04)'
    : 'transparent',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark' 
      ? 'rgba(255, 255, 255, 0.05)' 
      : 'rgba(0, 0, 0, 0.02)',
    borderColor: theme.palette.mode === 'dark'
      ? theme.palette.primary.light
      : theme.palette.primary.main,
  }
}));

// Componente para upload e gerenciamento de documentos
function DocumentUploader({ conversationId, onUploadComplete, onError }) {
  const theme = useTheme();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogContent, setDialogContent] = useState('');
  const [serviceHealth, setServiceHealth] = useState({
    status: 'unknown',
    message: 'Verificando serviço de processamento...'
  });
  const [uploadAllActive, setUploadAllActive] = useState(false);

  // Verificar saúde do serviço de processamento ao carregar o componente
  useEffect(() => {
    checkServiceHealth();
  }, []);

  // Função para verificar saúde do serviço
  const checkServiceHealth = async () => {
    try {
      setServiceHealth({
        status: 'checking',
        message: 'Verificando serviço de processamento...'
      });
      
      const health = await checkDocumentProcessorHealth();
      
      setServiceHealth({
        status: health.status,
        message: health.message || (health.status === 'available' 
          ? 'Serviço de processamento disponível' 
          : 'Serviço de processamento indisponível')
      });
    } catch (error) {
      console.error('Erro ao verificar saúde do processador:', error);
      setServiceHealth({
        status: 'unavailable',
        message: 'Não foi possível conectar ao serviço de processamento'
      });
    }
  };

  // Pre-verificação de arquivos muito grandes
  const verifyFileSize = (file) => {
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        message: `O arquivo é muito grande (${(file.size / (1024 * 1024)).toFixed(2)}MB). O tamanho máximo é 100MB.`
      };
    }
    return { valid: true };
  };

  // Configuração do dropzone
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: acceptedFiles => {
      // Verificar cada arquivo antes de adicionar à lista
      const newFiles = acceptedFiles.map(file => {
        const sizeCheck = verifyFileSize(file);
        
        return {
          file,
          id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
          status: sizeCheck.valid ? 'ready' : 'error',
          progress: 0,
          documentId: null,
          error: sizeCheck.valid ? null : sizeCheck.message
        };
      });
      
      setFiles(prevFiles => [...prevFiles, ...newFiles]);
      
      // Mostrar alerta se algum arquivo for muito grande
      const invalidFiles = newFiles.filter(f => f.status === 'error');
      if (invalidFiles.length > 0) {
        setError(`${invalidFiles.length} arquivo(s) excedem o tamanho máximo permitido.`);
      }
    },
    noClick: true,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
      'application/json': ['.json'],
      'text/plain': ['.txt'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    // Definimos um tamanho máximo maior aqui para gerenciar o erro no cliente
    maxSize: MAX_FILE_SIZE * 2 // Permitimos selecionar arquivos maiores para dar uma mensagem de erro mais clara
  });

  // Mostrar diálogo com detalhes do erro
  const showErrorDetails = (errorMsg) => {
    setDialogContent(errorMsg);
    setDialogOpen(true);
  };

  // Função para fazer o upload de um arquivo
  const handleUpload = async (fileObj) => {
    if (!fileObj) return;
    
    if (!conversationId) {
      const errorMsg = 'Nenhuma conversa selecionada para o upload';
      setError(errorMsg);
      if (onError) onError(errorMsg);
      return;
    }

    // Verificar saúde do serviço antes de iniciar upload
    if (serviceHealth.status !== 'available') {
      await checkServiceHealth();
      if (serviceHealth.status !== 'available') {
        const errorMsg = 'Serviço de processamento indisponível. Tente novamente mais tarde.';
        setError(errorMsg);
        if (onError) onError(errorMsg);
        return;
      }
    }

    // Verificar tamanho novamente antes de enviar
    const sizeCheck = verifyFileSize(fileObj.file);
    if (!sizeCheck.valid) {
      setFiles(prevFiles => prevFiles.map(f => 
        f.id === fileObj.id ? { ...f, status: 'error', error: sizeCheck.message } : f
      ));
      return;
    }

    try {
      // Atualizar status para uploading
      setFiles(prevFiles => prevFiles.map(f => 
        f.id === fileObj.id ? { ...f, status: 'uploading', progress: 0 } : f
      ));

      // Simular progresso inicial para feedback visual
      const progressInterval = setInterval(() => {
        setFiles(prevFiles => prevFiles.map(f => {
          if (f.id === fileObj.id && f.status === 'uploading' && f.progress < 60) {
            return { ...f, progress: f.progress + 5 };
          }
          return f;
        }));
      }, 300);

      // Fazer o upload do arquivo
      console.log(`Iniciando upload de ${fileObj.file.name}...`);
      const response = await uploadDocument(fileObj.file, conversationId);
      
      // Limpar o intervalo de progresso simulado
      clearInterval(progressInterval);
      
      // Extrair o documentId da resposta
      const documentId = response.documentId || response.document_id || 
                        (response.data && (response.data.documentId || response.data.document_id));
      
      if (!documentId) {
        throw new Error('Resposta inválida do servidor: ID do documento não encontrado');
      }
      
      // Atualizar status para processing
      setFiles(prevFiles => prevFiles.map(f => 
        f.id === fileObj.id ? { 
          ...f, 
          status: 'processing', 
          progress: 70,
          documentId
        } : f
      ));

      // Iniciar polling para verificar o status do processamento
      const pollResult = await pollDocumentStatus(documentId);
      
      if (pollResult.success) {
        // Processamento concluído com sucesso
        setFiles(prevFiles => prevFiles.map(f => 
          f.id === fileObj.id ? { 
            ...f, 
            status: 'completed', 
            progress: 100 
          } : f
        ));
        
        if (onUploadComplete) {
          onUploadComplete(documentId, fileObj.file.name);
        }
      } else {
        // Erro no processamento
        throw new Error(pollResult.error || 'Erro durante o processamento do documento');
      }
    } catch (error) {
      console.error(`Erro no upload/processamento de ${fileObj.file.name}:`, error);
      
      // Extrair mensagem de erro
      let errorMessage = error.message || 'Erro desconhecido';
      
      // Verificar se é erro de tamanho de arquivo
      if (errorMessage.includes('File too large') || errorMessage.includes('LIMIT_FILE_SIZE')) {
        errorMessage = `O arquivo é muito grande (${(fileObj.file.size / (1024 * 1024)).toFixed(2)}MB). O tamanho máximo permitido é 100MB.`;
      }
      
      setFiles(prevFiles => prevFiles.map(f => 
        f.id === fileObj.id ? { 
          ...f, 
          status: 'error',
          error: errorMessage,
          progress: 0
        } : f
      ));
      
      if (onError) onError(errorMessage);
    }
  };

  // Função para remover um arquivo da lista
  const removeFile = (fileId) => {
    setFiles(prevFiles => prevFiles.filter(f => f.id !== fileId));
  };

  // Função para iniciar o upload de todos os arquivos
  const handleUploadAll = async () => {
    const readyFiles = files.filter(f => f.status === 'ready');
    if (readyFiles.length === 0) return;

    setUploading(true);
    setUploadAllActive(true);
    setError(null);

    try {
      // Upload sequencial para evitar sobrecarga
      for (const fileObj of readyFiles) {
        if (uploadAllActive) { // Verificar se o processo ainda deve continuar
          await handleUpload(fileObj);
        }
      }
    } catch (err) {
      console.error('Erro durante upload em lote:', err);
      setError('Ocorreu um erro durante o upload em lote. Alguns arquivos podem não ter sido processados.');
    } finally {
      setUploading(false);
      setUploadAllActive(false);
    }
  };

  // Cancelar todos os uploads
  const cancelAllUploads = () => {
    setUploadAllActive(false);
    // Reseta o status dos arquivos que estavam em uploading ou processing
    setFiles(prevFiles => prevFiles.map(f => 
      (f.status === 'uploading' || f.status === 'processing') 
        ? { ...f, status: 'ready', progress: 0 } 
        : f
    ));
  };

  // Limpar todos os arquivos
  const clearAllFiles = () => {
    if (uploading) {
      cancelAllUploads();
    }
    setFiles([]);
    setError(null);
  };

  // Configurações para renderização do status
  const getStatusConfig = (status) => {
    switch (status) {
      case 'ready':
        return { icon: <UploadIcon fontSize="small" />, color: 'primary', label: 'Pronto' };
      case 'uploading':
        return { icon: <CircularProgress size={16} />, color: 'primary', label: 'Enviando...' };
      case 'processing':
        return { icon: <CircularProgress size={16} />, color: 'info', label: 'Processando...' };
      case 'completed':
        return { icon: <CheckIcon fontSize="small" />, color: 'success', label: 'Concluído' };
      case 'error':
        return { icon: <ErrorIcon fontSize="small" />, color: 'error', label: 'Erro' };
      default:
        return { icon: <InfoIcon fontSize="small" />, color: 'default', label: status };
    }
  };

  // Renderizar componente principal
  return (
    <Box sx={{ width: '100%' }}>
      {/* Indicador de saúde do serviço */}
      {serviceHealth.status !== 'available' && (
        <Alert 
          severity={serviceHealth.status === 'checking' ? 'info' : serviceHealth.status === 'warning' ? 'warning' : 'error'}
          sx={{ mb: 2 }}
          action={
            <IconButton 
              color="inherit" 
              size="small" 
              onClick={checkServiceHealth}
            >
              <RefreshIcon fontSize="inherit" />
            </IconButton>
          }
        >
          {serviceHealth.message}
        </Alert>
      )}

      {/* Área de drop de arquivos */}
      <DropzoneArea
        {...getRootProps()}
        isDragActive={isDragActive}
        sx={{
          mb: 3,
          opacity: serviceHealth.status === 'available' ? 1 : 0.7,
          pointerEvents: serviceHealth.status === 'available' ? 'auto' : 'none',
        }}
      >
        <input {...getInputProps()} disabled={serviceHealth.status !== 'available'} />
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <CloudUploadIcon 
            sx={{ 
              fontSize: 60, 
              color: isDragActive ? 'primary.main' : 'text.secondary',
              mb: 2,
              opacity: 0.8
            }} 
          />
        </motion.div>
        
        <Typography variant="h6" gutterBottom>
          {isDragActive ? 'Solte os arquivos aqui' : 'Arraste arquivos ou clique para selecionar'}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Suporta PDF, DOCX, XLSX, XLS, CSV, JSON, TXT e imagens
        </Typography>
        
        <Button 
          variant="contained" 
          onClick={open}
          startIcon={<UploadIcon />}
          disabled={serviceHealth.status !== 'available'}
        >
          Selecionar Arquivos
        </Button>
      </DropzoneArea>

      {/* Mensagem de erro geral */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {/* Lista de arquivos */}
      {files.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            mb: 1
          }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              Arquivos para Upload ({files.length})
            </Typography>
            
            <Box>
              <Tooltip title="Limpar todos os arquivos">
                <IconButton 
                  size="small" 
                  onClick={clearAllFiles}
                  color="default"
                  sx={{ mr: 1 }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              
              <Button
                variant="contained"
                color="primary"
                size="small"
                onClick={handleUploadAll}
                disabled={uploading || serviceHealth.status !== 'available' || !files.some(f => f.status === 'ready')}
                startIcon={uploading ? <CircularProgress size={16} /> : <CloudUploadIcon />}
              >
                {uploading ? 'Enviando...' : 'Enviar Todos'}
              </Button>
              
              {uploading && (
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={cancelAllUploads}
                  sx={{ ml: 1 }}
                >
                  Cancelar
                </Button>
              )}
            </Box>
          </Box>
          
          <Paper 
            variant="outlined" 
            sx={{ 
              overflow: 'hidden',
              borderRadius: 1,
              maxHeight: '300px',
              overflow: 'auto'
            }}
          >
            <List dense disablePadding>
              {files.map((fileObj) => {
                const statusConfig = getStatusConfig(fileObj.status);
                
                return (
                  <ListItem
                    key={fileObj.id}
                    sx={{
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      '&:last-child': { borderBottom: 'none' },
                      py: 1
                    }}
                    secondaryAction={
                      fileObj.status !== 'uploading' && fileObj.status !== 'processing' ? (
                        <IconButton 
                          edge="end" 
                          size="small"
                          onClick={() => removeFile(fileObj.id)}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      ) : null
                    }
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <FileIcon color={statusConfig.color} />
                    </ListItemIcon>
                    
                    <ListItemText
                      primary={
                        <Typography variant="body2" noWrap sx={{ maxWidth: '200px' }}>
                          {fileObj.file.name}
                        </Typography>
                      }
                      secondary={
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                          <Chip
                            size="small"
                            label={statusConfig.label}
                            color={statusConfig.color}
                            icon={statusConfig.icon}
                            variant="outlined"
                            sx={{ height: 24 }}
                          />
                          
                          <Typography variant="caption" color="text.secondary">
                            {(fileObj.file.size / (1024 * 1024)).toFixed(2)} MB
                          </Typography>
                          
                          {fileObj.error && (
                            <Button
                              variant="text"
                              color="error"
                              size="small"
                              onClick={() => showErrorDetails(fileObj.error)}
                              sx={{ padding: 0, minWidth: 'auto', fontSize: '0.7rem' }}
                            >
                              Detalhes
                            </Button>
                          )}
                        </Stack>
                      }
                    />
                    
                    {(fileObj.status === 'uploading' || fileObj.status === 'processing') && (
                      <Box sx={{ width: '100%', maxWidth: 100, ml: 2 }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={fileObj.progress} 
                          sx={{ height: 4, borderRadius: 2 }} 
                        />
                      </Box>
                    )}
                    
                    {fileObj.status === 'ready' && (
                      <Button
                        variant="text"
                        color="primary"
                        size="small"
                        onClick={() => handleUpload(fileObj)}
                        disabled={uploading || serviceHealth.status !== 'available'}
                        sx={{ ml: 2 }}
                      >
                        Enviar
                      </Button>
                    )}
                  </ListItem>
                );
              })}
            </List>
          </Paper>
          
          {/* Resumo do status */}
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {files.filter(f => f.status === 'completed').length} concluídos, 
              {' '}{files.filter(f => f.status === 'error').length} com erro, 
              {' '}{files.filter(f => f.status === 'ready').length} prontos para envio
            </Typography>
          </Box>
        </Box>
      )}

      {/* Diálogo para mostrar detalhes do erro */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          <ErrorIcon color="error" sx={{ mr: 1 }} />
          Detalhes do erro
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">{dialogContent}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} color="primary">
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default DocumentUploader;