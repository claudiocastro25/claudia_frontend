import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, LinearProgress, Paper, 
  Fade, Alert, Avatar
} from '@mui/material';
import { 
  CloudUpload, BarChart, Search, Check, 
  DataObject, Psychology
} from '@mui/icons-material';

// Mensagens amigáveis para cada fase do processamento
const PROCESSING_MESSAGES = [
  {
    phase: 'uploading',
    messages: [
      "Enviando seu documento para a nuvem...",
      "Preparando o arquivo para processamento...",
      "Estabelecendo conexão segura para envio...",
      "Já recebi uma parte do seu documento...",
      "Quase lá! Finalizando o upload..."
    ],
    icon: <CloudUpload color="primary" />
  },
  {
    phase: 'processing',
    messages: [
      "Analisando a estrutura do documento...",
      "Reconhecendo o conteúdo das páginas...",
      "Extraindo informações valiosas...",
      "Organizando os dados para análise...",
      "Identificando conceitos importantes..."
    ],
    icon: <Search color="primary" />
  },
  {
    phase: 'analyzing',
    messages: [
      "Aplicando inteligência para compreender o conteúdo...",
      "Relacionando informações entre diferentes partes...",
      "Descobrindo padrões interessantes nos dados...",
      "Preparando visualizações e resumos...",
      "Fazendo as conexões finais entre os conceitos..."
    ],
    icon: <Psychology color="primary" />
  },
  {
    phase: 'structuring',
    messages: [
      "Estruturando dados para melhor compreensão...",
      "Preparando tabelas e gráficos para visualização...",
      "Refinando a apresentação da informação...",
      "Gerando insights a partir dos dados...",
      "Otimizando para consultas rápidas..."
    ],
    icon: <BarChart color="primary" />
  },
  {
    phase: 'finalizing',
    messages: [
      "Finalizando o processamento...",
      "Validando a qualidade da extração...",
      "Tudo pronto para suas perguntas!",
      "Documento processado com sucesso!",
      "Pronto para explorar o conteúdo!"
    ],
    icon: <Check color="success" />
  }
];

const ProcessingFeedback = ({ status, progress, filename, error }) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('uploading');
  
  // Definir a fase atual com base no progresso
  useEffect(() => {
    if (progress < 20) setCurrentPhase('uploading');
    else if (progress < 40) setCurrentPhase('processing');
    else if (progress < 60) setCurrentPhase('analyzing');
    else if (progress < 80) setCurrentPhase('structuring');
    else setCurrentPhase('finalizing');
  }, [progress]);
  
  // Rotacionar as mensagens a cada 4 segundos
  useEffect(() => {
    if (status === 'error') return;
    
    const interval = setInterval(() => {
      const phaseMessages = PROCESSING_MESSAGES.find(p => p.phase === currentPhase)?.messages || [];
      setMessageIndex(prev => (prev + 1) % phaseMessages.length);
    }, 4000);
    
    return () => clearInterval(interval);
  }, [currentPhase, status]);
  
  // Selecionar a mensagem atual
  const currentMessages = PROCESSING_MESSAGES.find(p => p.phase === currentPhase)?.messages || [];
  const currentMessage = currentMessages[messageIndex] || "Processando documento...";
  const currentIcon = PROCESSING_MESSAGES.find(p => p.phase === currentPhase)?.icon;
  
  if (status === 'error') {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Erro ao processar "{filename}": {error}
      </Alert>
    );
  }

  if (status === 'completed') {
    return (
      <Alert severity="success" sx={{ mb: 2 }}>
        Documento "{filename}" processado com sucesso!
      </Alert>
    );
  }
  
  return (
    <Fade in={status === 'uploading' || status === 'processing'}>
      <Paper 
        elevation={0} 
        variant="outlined"
        sx={{ 
          p: 2, 
          mb: 2, 
          borderRadius: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        <Box sx={{ 
          mb: 2, 
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          gap: 2
        }}>
          <Avatar sx={{ bgcolor: 'primary.light' }}>
            {currentIcon}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Processando: {filename}
            </Typography>
            <Fade in key={currentMessage}>
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