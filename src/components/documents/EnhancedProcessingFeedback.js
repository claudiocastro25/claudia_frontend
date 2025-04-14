// Arquivo: src/components/documents/EnhancedProcessingFeedback.js
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  LinearProgress, 
  Paper, 
  Fade, 
  Avatar,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { 
  CloudUpload, 
  BarChart, 
  Search, 
  Check, 
  DataObject, 
  Psychology,
  AutoAwesome
} from '@mui/icons-material';
import { motion } from 'framer-motion';

// Configuração das fases de processamento com mensagens amigáveis e ícones
const PROCESSING_PHASES = [
  {
    key: 'uploading',
    label: 'Enviando documento',
    messages: [
      "Transferindo seu arquivo para o servidor...",
      "Estabelecendo conexão segura...",
      "Quase lá! Finalizando upload...",
      "Preparando arquivo para processamento...",
    ],
    icon: <CloudUpload color="primary" />,
    progressRange: [0, 20]
  },
  {
    key: 'processing',
    label: 'Processando conteúdo',
    messages: [
      "Analisando a estrutura do documento...",
      "Reconhecendo o texto e elementos...",
      "Extraindo informações valiosas...",
      "Identificando tópicos principais...",
    ],
    icon: <Search color="primary" />,
    progressRange: [20, 40]
  },
  {
    key: 'analyzing',
    label: 'Analisando dados',
    messages: [
      "Aplicando IA para compreender o conteúdo...",
      "Descobrindo padrões e conceitos importantes...",
      "Relacionando informações entre diferentes seções...",
      "Organizando dados para melhor compreensão...",
    ],
    icon: <Psychology color="primary" />,
    progressRange: [40, 60]
  },
  {
    key: 'indexing',
    label: 'Indexando para pesquisa',
    messages: [
      "Organizando informações para consulta rápida...",
      "Criando índices de busca semântica...",
      "Preparando dados para responder perguntas...",
      "Otimizando para recuperação de informações...",
    ],
    icon: <BarChart color="primary" />,
    progressRange: [60, 80]
  },
  {
    key: 'finalizing',
    label: 'Finalizando',
    messages: [
      "Preparando visualizações e resumos...",
      "Gerando insights a partir dos dados...",
      "Validando a qualidade da extração...",
      "Tudo pronto para suas perguntas!",
    ],
    icon: <AutoAwesome color="primary" />,
    progressRange: [80, 100]
  }
];

const EnhancedProcessingFeedback = ({ status, progress, filename, error }) => {
  const theme = useTheme();
  const [messageIndex, setMessageIndex] = useState(0);
  const [activePhase, setActivePhase] = useState(0);
  
  // CORREÇÃO: Garantir que status e progress tenham valores válidos
  const safeStatus = status || 'processing';
  const safeProgress = progress || 0;
  
  // Lista de status que são considerados completos
  const completedStatuses = ['completed', 'complete', 'finalizado', 'concluído', 'concluido', 'success', 'disponível', 'available'];
  const errorStatuses = ['error', 'failed', 'erro', 'falha', 'unavailable'];
  
  // Normalizar o status para facilitar a comparação
  const normalizedStatus = safeStatus ? safeStatus.toLowerCase() : '';
  
  // Determinar status atual com maior precisão
  let currentStatus = safeStatus;
  if (!currentStatus && safeProgress > 0) {
    currentStatus = 'processing';
  } else if (completedStatuses.includes(normalizedStatus)) {
    currentStatus = 'completed';
  } else if (errorStatuses.includes(normalizedStatus)) {
    currentStatus = 'error';
  }
  
  // Determinar fase ativa com base no progresso - modificação para ser mais resiliente
  useEffect(() => {
    // Se o documento estiver completo ou com erro, não atualizar a fase
    if (errorStatuses.includes(normalizedStatus) || completedStatuses.includes(normalizedStatus)) return;
    
    // Encontrar a fase atual com base no progresso
    for (let i = 0; i < PROCESSING_PHASES.length; i++) {
      const phase = PROCESSING_PHASES[i];
      if (safeProgress >= phase.progressRange[0] && safeProgress <= phase.progressRange[1]) {
        setActivePhase(i);
        break;
      }
    }
  }, [safeProgress, normalizedStatus]);
  
  // Rotação de mensagens amigáveis
  useEffect(() => {
    // Verifica usando as listas de status normalizados
    if (errorStatuses.includes(normalizedStatus) || completedStatuses.includes(normalizedStatus)) return;
    
    const currentPhase = PROCESSING_PHASES[activePhase];
    const messages = currentPhase.messages;
    
    // Alternar mensagens a cada 3.5 segundos
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % messages.length);
    }, 3500);
    
    return () => clearInterval(interval);
  }, [activePhase, normalizedStatus, errorStatuses, completedStatuses]);
  
  // Renderizar com base no status normalizado
  if (errorStatuses.includes(normalizedStatus)) {
    return (
      <Paper 
        elevation={0} 
        variant="outlined"
        sx={{ 
          p: 2, 
          mb: 2, 
          borderRadius: 2,
          borderColor: alpha(theme.palette.error.main, 0.5),
          bgcolor: alpha(theme.palette.error.main, 0.05)
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: theme.palette.error.main }}>
            <DataObject />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" gutterBottom fontWeight={500}>
              Erro ao processar "{filename}"
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {error || "Ocorreu um erro durante o processamento do documento."}
            </Typography>
          </Box>
        </Box>
      </Paper>
    );
  }

  if (completedStatuses.includes(normalizedStatus)) {
    return (
      <Paper 
        elevation={0} 
        variant="outlined"
        sx={{ 
          p: 2, 
          mb: 2, 
          borderRadius: 2,
          borderColor: alpha(theme.palette.success.main, 0.5),
          bgcolor: alpha(theme.palette.success.main, 0.05)
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: theme.palette.success.main }}>
            <Check />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" gutterBottom fontWeight={500}>
              Documento processado com sucesso!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              "{filename}" está pronto para consulta. Você já pode fazer perguntas sobre o conteúdo.
            </Typography>
          </Box>
        </Box>
      </Paper>
    );
  }
  
  // Obtém a fase atual e a mensagem
  const currentPhase = PROCESSING_PHASES[activePhase];
  const currentMessage = currentPhase.messages[messageIndex];
  
  // Lista de status que devem mostrar o componente de progresso
  const processingStatuses = ['processing', 'uploading', 'processando', 'em processamento', 'pending', 'pendente', 'analyzing', 'analisando', 'indexing', 'indexando'];
  
  return (
    <Fade in={processingStatuses.includes(normalizedStatus) || (!errorStatuses.includes(normalizedStatus) && !completedStatuses.includes(normalizedStatus) && safeProgress > 0)}>
      <Paper 
        component={motion.div}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        elevation={0} 
        variant="outlined"
        sx={{ 
          p: 3, 
          mb: 2, 
          borderRadius: 2,
          borderColor: alpha(theme.palette.primary.main, 0.3),
          bgcolor: alpha(theme.palette.primary.main, 0.03)
        }}
      >
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar 
            sx={{ 
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main,
              width: 48,
              height: 48
            }}
          >
            {currentPhase.icon}
          </Avatar>
          
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Processando: {filename}
            </Typography>
            
            <Fade key={currentMessage} in={true}>
              <Typography 
                variant="body2" 
                color="primary"
                sx={{ 
                  fontWeight: 500,
                  opacity: 0.8
                }}
              >
                {currentMessage}
              </Typography>
            </Fade>
          </Box>
        </Box>
        
        {/* Progresso global */}
        <Box sx={{ mb: 3 }}>
          <LinearProgress 
            variant="determinate" 
            value={safeProgress} 
            sx={{ 
              height: 8,
              borderRadius: 4,
              mb: 1,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              '& .MuiLinearProgress-bar': {
                bgcolor: theme.palette.primary.main,
                borderRadius: 4
              }
            }}
          />
          
          <Typography 
            variant="caption" 
            color="text.secondary" 
            align="right" 
            sx={{ display: 'block' }}
          >
            {Math.round(safeProgress)}% concluído
          </Typography>
        </Box>
        
        {/* Stepper com fases do processamento */}
        <Stepper activeStep={activePhase} orientation="vertical" sx={{ mt: 1 }}>
          {PROCESSING_PHASES.map((phase, index) => (
            <Step key={phase.key} completed={index < activePhase}>
              <StepLabel
                StepIconProps={{
                  icon: index === activePhase ? 
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      {phase.icon}
                    </motion.div> : 
                    phase.icon
                }}
              >
                {phase.label}
              </StepLabel>
              {index === activePhase && (
                <StepContent>
                  <Typography variant="caption" color="text.secondary">
                    {phase.progressRange[0]}-{phase.progressRange[1]}%
                  </Typography>
                </StepContent>
              )}
            </Step>
          ))}
        </Stepper>
      </Paper>
    </Fade>
  );
};

export default EnhancedProcessingFeedback;