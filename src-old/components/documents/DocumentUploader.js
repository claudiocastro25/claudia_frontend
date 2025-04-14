import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Snackbar,
  LinearProgress,
  useTheme
} from '@mui/material';
import {
  CloudUpload,
  FilePresent,
  CheckCircleOutline,
  ErrorOutline
} from '@mui/icons-material';

// Importar serviços
import { 
  uploadDocument, 
  pollDocumentStatus, 
  checkDocumentProcessorHealth 
} from '../../services/documentService';

// Extensões permitidas para exibição
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.csv', '.json', '.txt', '.jpg', '.jpeg', '.png'];

const DocumentUploader = ({ 
  conversationId, 
  onUploadComplete, 
  onUploadError, 
  onProcessing 
}) => {
  const theme = useTheme();
  const fileInputRef = useRef(null);
  
  // Estados
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [documentId, setDocumentId] = useState(null);
  const [processorAvailable, setProcessorAvailable] = useState(false);
  const [processorMessage, setProcessorMessage] = useState('Verificando disponibilidade...');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');

  // Verificar a disponibilidade do processador ao montar o componente
  useEffect(() => {
    checkProcessorStatus();
  }, []);

  // Função para verificar a disponibilidade do processador
  const checkProcessorStatus = async () => {
    try {
      setProcessorMessage('Verificando disponibilidade do processador...');
      
      const health = await checkDocumentProcessorHealth();
      console.log('Status do processador:', health);
      
      // CORREÇÃO: Usar a resposta normalizada
      setProcessorAvailable(health.available);
      setProcessorMessage(health.message);
    } catch (error) {
      console.error('Erro ao verificar status do processador:', error);
      setProcessorAvailable(false);
      setProcessorMessage('Erro ao verificar status do processador');
    }
  };

  // Handler para seleção de arquivo
  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const fileExtension = `.${selectedFile.name.split('.').pop().toLowerCase()}`;
      
      // Verificar se a extensão é permitida
      if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
        setUploadError(`Tipo de arquivo não permitido: ${fileExtension}`);
        setSnackbarMessage(`Tipo de arquivo não permitido: ${fileExtension}`);
        setSnackbarSeverity('error');
        setShowSnackbar(true);
        return;
      }
      
      // Verificar tamanho (limite de 100MB)
      if (selectedFile.size > 100 * 1024 * 1024) {
        setUploadError(`Arquivo muito grande: ${(selectedFile.size / (1024 * 1024)).toFixed(1)}MB. Limite: 100MB`);
        setSnackbarMessage(`Arquivo muito grande: ${(selectedFile.size / (1024 * 1024)).toFixed(1)}MB. Limite: 100MB`);
        setSnackbarSeverity('error');
        setShowSnackbar(true);
        return;
      }
      
      setFile(selectedFile);
      setUploadError(null);
    }
  };

  // Função para fazer upload do arquivo
  const handleUpload = async () => {
    if (!file || !processorAvailable) return;
    
    if (!conversationId) {
      setUploadError('ID da conversa não fornecido');
      setSnackbarMessage('Erro: ID da conversa não fornecido');
      setSnackbarSeverity('error');
      setShowSnackbar(true);
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(10);
    setUploadError(null);
    
    try {
      // Log detalhado para depuração
      console.log(`Iniciando upload de arquivo ${file.name} para conversa ${conversationId}`);
      
      // Informar componente pai que o upload está em andamento
      if (onProcessing) {
        onProcessing(true, {
          status: 'uploading',
          filename: file.name,
          progress: 10
        });
      }
      
      // Fazer upload
      const response = await uploadDocument(file, conversationId);
      console.log('Resposta do upload:', response);
      
      // CORREÇÃO: Usar a resposta normalizada
      const docId = response.documentId;
      
      if (!docId) {
        throw new Error('ID do documento não encontrado na resposta');
      }
      
      console.log(`Documento enviado com ID: ${docId}, aguardando processamento...`);
      setDocumentId(docId);
      setUploadProgress(40);
      
      // Atualizar componente pai
      if (onProcessing) {
        onProcessing(true, {
          status: 'processing',
          filename: file.name,
          progress: 40,
          documentId: docId
        });
      }
      
      // Iniciar polling do status
      console.log(`Iniciando polling de status para documento ${docId}`);
      const pollResult = await pollDocumentStatus(docId);
      console.log(`Resultado do polling:`, pollResult);
      
      if (pollResult.success) {
        console.log(`Documento ${docId} processado com sucesso!`);
        setUploadProgress(100);
        setUploadSuccess(true);
        
        // Atualizar componente pai
        if (onProcessing) {
          onProcessing(true, {
            status: 'completed',
            filename: file.name,
            progress: 100,
            documentId: docId
          });
        }
        
        // Chamar callback de sucesso
        if (onUploadComplete) {
          onUploadComplete(docId, file.name);
          
          // Disparar evento global para forçar recarga de documentos
          // Evento mais detalhado com dados completos
          window.dispatchEvent(new CustomEvent('document-uploaded', { 
            detail: { 
              documentId: docId, 
              conversationId,
              filename: file.name,
              status: 'completed' 
            }
          }));
          
          // Adicional: forçar recarga após um pequeno delay
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('document-uploaded', { 
              detail: { 
                documentId: docId, 
                conversationId, 
                delayed: true,
                filename: file.name,
                status: 'completed'
              }
            }));
          }, 2000);
        }
        
        setSnackbarMessage(`Documento "${file.name}" processado com sucesso!`);
        setSnackbarSeverity('success');
        setShowSnackbar(true);
        
        // Limpar arquivo após upload bem-sucedido, mas com um delay maior
        setTimeout(() => {
          setFile(null);
          setDocumentId(null);
          setUploadProgress(0);
          setUploadSuccess(false);
          setIsUploading(false);
          
          // Informar o pai que o processamento terminou após um delay
          if (onProcessing) {
            onProcessing(false, {  // setamos para false para indicar que terminou
              status: 'completed',
              filename: file.name,
              progress: 100,
              documentId: docId
            });
          }
        }, 5000);  // Aumentamos o tempo para 5 segundos
      } else {
        console.error(`Erro no processamento do documento ${docId}:`, pollResult.error);
        throw new Error(pollResult.error || 'Erro ao processar documento');
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      
      setUploadProgress(0);
      setUploadError(error.message || 'Erro desconhecido');
      
      // Atualizar componente pai
      if (onProcessing) {
        onProcessing(false, {  // Importante marcar como falso aqui também
          status: 'error',
          filename: file.name,
          error: error.message || 'Erro desconhecido'
        });
      }
      
      // Chamar callback de erro
      if (onUploadError) {
        onUploadError(error.message || 'Erro desconhecido');
      }
      
      setSnackbarMessage(`Erro ao processar "${file.name}": ${error.message || 'Erro desconhecido'}`);
      setSnackbarSeverity('error');
      setShowSnackbar(true);
      setIsUploading(false);
    }
  };

  // Limpar arquivo e erros
  const handleClearFile = () => {
    setFile(null);
    setUploadError(null);
    setDocumentId(null);
    setUploadProgress(0);
    setUploadSuccess(false);
    
    // Limpar o input de arquivo
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Fechar snackbar
  const handleCloseSnackbar = () => {
    setShowSnackbar(false);
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Status do processador */}
      {!processorAvailable && (
        <Alert 
          severity="warning" 
          sx={{ mb: 2 }}
          action={
            <Button 
              size="small" 
              color="inherit" 
              onClick={checkProcessorStatus}
            >
              Verificar
            </Button>
          }
        >
          {processorMessage}
        </Alert>
      )}
      
      {/* Input de arquivo oculto */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept={ALLOWED_EXTENSIONS.join(',')}
        style={{ display: 'none' }}
      />
      
      {/* UI principal */}
      {!file ? (
        <Paper
          variant="outlined"
          onClick={() => fileInputRef.current?.click()}
          sx={{ 
            p: 3, 
            textAlign: 'center',
            cursor: 'pointer',
            borderRadius: 2,
            borderStyle: 'dashed',
            borderColor: theme.palette.divider,
            transition: 'all 0.3s ease',
            '&:hover': {
              borderColor: theme.palette.primary.main,
              backgroundColor: theme.palette.action.hover
            }
          }}
        >
          <CloudUpload 
            sx={{ 
              fontSize: 48,
              color: theme.palette.primary.main,
              mb: 2
            }} 
          />
          
          <Typography 
            variant="h6" 
            color="textPrimary" 
            gutterBottom
          >
            Clique para selecionar um arquivo
          </Typography>
          
          <Typography 
            variant="body2" 
            color="textSecondary" 
            sx={{ mb: 2 }}
          >
            Suporta documentos PDF, Word, Excel, e outros formatos (.pdf, .docx, .xlsx, .csv, .txt)
          </Typography>
          
          <Button
            variant="contained"
            disabled={!processorAvailable}
          >
            Selecionar Arquivo
          </Button>
        </Paper>
      ) : (
        <Paper
          variant="outlined"
          sx={{ 
            p: 3, 
            borderRadius: 2,
            borderColor: uploadError 
              ? theme.palette.error.main 
              : (uploadSuccess ? theme.palette.success.main : theme.palette.divider)
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 48,
                height: 48,
                borderRadius: '50%',
                bgcolor: theme.palette.action.hover,
                mr: 2
              }}
            >
              {uploadSuccess ? (
                <CheckCircleOutline sx={{ color: theme.palette.success.main }} />
              ) : uploadError ? (
                <ErrorOutline sx={{ color: theme.palette.error.main }} />
              ) : (
                <FilePresent sx={{ color: theme.palette.primary.main }} />
              )}
            </Box>
            
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight="medium" noWrap>
                {file.name}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.type || 'Documento'}
              </Typography>
            </Box>
            
            {!isUploading && !uploadSuccess && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={handleClearFile}
                sx={{ ml: 1 }}
              >
                Remover
              </Button>
            )}
          </Box>
          
          {isUploading && (
            <Box sx={{ mt: 2, mb: 1 }}>
              <LinearProgress 
                variant="determinate" 
                value={uploadProgress} 
                sx={{
                  height: 8,
                  borderRadius: 4,
                  mb: 1
                }}
              />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" color="textSecondary">
                  {uploadProgress < 40 ? 'Enviando...' : 
                   uploadProgress < 80 ? 'Processando...' : 
                   'Finalizando...'}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {uploadProgress}%
                </Typography>
              </Box>
            </Box>
          )}
          
          {uploadError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {uploadError}
            </Alert>
          )}
          
          {uploadSuccess ? (
            <Alert severity="success" sx={{ mt: 2 }}>
              Documento processado com sucesso!
            </Alert>
          ) : !isUploading && !uploadError && (
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleUpload}
                disabled={!processorAvailable}
                startIcon={isUploading && <CircularProgress size={16} color="inherit" />}
              >
                {isUploading ? 'Enviando...' : 'Enviar Documento'}
              </Button>
            </Box>
          )}
        </Paper>
      )}
      
      {/* Snackbar para feedback */}
      <Snackbar
        open={showSnackbar}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbarSeverity} 
          sx={{ width: '100%' }}
          variant="filled"
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DocumentUploader;