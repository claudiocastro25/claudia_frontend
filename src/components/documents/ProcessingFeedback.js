import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, LinearProgress, Paper, 
  Fade, Alert, Avatar,
  useTheme, alpha
} from '@mui/material';
import { 
  CloudUpload, BarChart, Search, Check, 
  Error, Psychology
} from '@mui/icons-material';

import { getProcessingMessage, DOCUMENT_STATUS, isError, isCompleted } from '../../constants/documentStatus';

/**
 * Componente para fornecer feedback visual durante o processamento de documentos
 * Inclui mensagens amigáveis e progresso animado
 */
const ProcessingFeedback = ({ 
  status, 
  progress = 0, 
  filename = "documento", 
  error = null 
}) => {
  const theme = useTheme();
  const [messageIndex, setMessageIndex] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('uploading');
  
  // Definir a fase atual com base no progresso
  useEffect(() => {
    if (progress < 20) setCurrentPhase('uploading');
    else if (progress < 40) setCurrentPhase('processing');
    else if (progress < 60) setCurrentPhase('analyzing');
    else if (progress < 80) setCurrentPhase('finalizing');
  }, [progress]);
  
  // Rotacionar as mensagens a cada 4 segundos
  useEffect(() => {
    if (isError(status)) return;
    
    const interval = setInterval(() => {
      const messages = getProcessingMessage(status, progress);
      setMessageIndex(prev => (prev + 1) % messages.length);
    }, 4000);
    
    return () => clearInterval(interval);
  }, [currentPhase, status, progress]);
  
  // Obter a mensagem atual
  const currentMessage = getProcessingMessage(status, progress);
  
  // Determinar o ícone a mostrar
  const getStatusIcon = () => {
    if (isError(status)) return <Error color="error" />;
    if (isCompleted(status)) return <Check color="success" />;
    
    switch (currentPhase) {
      case 'uploading': return <CloudUpload color="primary" />;
      case 'processing': return <Search color="primary" />;
      case 'analyzing': return <Psychology color="primary" />;
      case 'finalizing': return <BarChart color="primary" />;
      default: return <CloudUpload color="primary" />;
    }
  };
  
  // Renderizar alerta em caso de erro
  if (isError(status)) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Erro ao processar "{filename}": {error || "Ocorreu um erro inesperado"}
      </Alert>
    );
  }

  // Renderizar alerta de sucesso quando completado
  if (isCompleted(status)) {
    return (
      <Alert severity="success" sx={{ mb: 2 }}>
        Documento "{filename}" processado com sucesso!
      </Alert>
    );
  }
  
  // Renderizar feedback de progresso
  return (
    <Fade in={status === DOCUMENT_STATUS.UPLOADING || status === DOCUMENT_STATUS.PROCESSING}>
      <Paper 
        elevation={0} 
        variant="outlined"
        sx={{ 
          p: 2, 
          mb: 2, 
          borderRadius: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          backgroundColor: alpha(theme.palette.background.paper, 0.6),
          backdropFilter: 'blur(8px)',
        }}
      >
        <Box sx={{ 
          mb: 2, 
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          gap: 2
        }}>
          <Avatar sx={{ 
            bgcolor: theme.palette.mode === 'dark' 
              ? alpha(theme.palette.primary.main, 0.2) 
              : alpha(theme.palette.primary.light, 0.2),
            color: theme.palette.primary.main  
          }}>
            {getStatusIcon()}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Processando: {filename}
            </Typography>
            <Fade in={true} key={currentMessage}>
              <Typography variant="body2" color="text.secondary">
                {currentMessage}
              </Typography>
            </Fade>
          </Box>
        </Box>
        
        <LinearProgress 
          variant="determinate" 
          value={progress} 
          sx={{ 
            width: '100%', 
            height: 6,
            borderRadius: 3
          }} 
        />
        
        <Typography 
          variant="caption" 
          color="text.secondary" 
          align="right" 
          sx={{ width: '100%', mt: 1 }}
        >
          {Math.round(progress)}% completo
        </Typography>
      </Paper>
    </Fade>
  );
};

export default ProcessingFeedback;