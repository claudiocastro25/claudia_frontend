import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  IconButton,
  Button,
  Tabs,
  Tab,
  Chip,
  Stack,
  Tooltip,
  useTheme,
  Container,
  useMediaQuery,
  Fade,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slide,
  Alert,
  Snackbar
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  FileUp,
  BookOpen,
  Sparkles,
  BarChart2,
  Table,
  FileImage,
  Send,
  HelpCircle,
  CheckCircle,
  X,
  FilePlus,
  FileSpreadsheet,
  FileCode,
  ScrollText,
  FileType,
  Database
} from 'lucide-react';
import ClaudIAEyeLogo from '../../components/layout/ClaudiaLogo';
import DocumentUploader from '../documents/DocumentUploader'; // Importando o componente de upload

// Importando serviços
import { 
  uploadDocumentWithoutConversation, 
  associateDocumentWithConversation 
} from '../../services/documentService';

// Transition para os diálogos
const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

// Suggested prompts by category
const EXAMPLE_PROMPTS = {
  documents: [
    "Analise este contrato e destaque as cláusulas importantes",
    "Extraia as informações-chave deste relatório financeiro",
    "Resuma os pontos principais deste documento",
    "Compare estes dois documentos e identifique as diferenças",
  ],
  dataAnalysis: [
    "Extraia os dados desta tabela e crie um gráfico de barras",
    "Analise estes dados de vendas e identifique tendências",
    "Calcule as estatísticas descritivas deste conjunto de dados",
    "Preveja os próximos valores com base nesta série temporal",
  ],
  creativity: [
    "Gere ideias para um projeto sobre sustentabilidade",
    "Ajude-me a escrever um e-mail persuasivo para um cliente",
    "Crie uma apresentação de slides sobre IA para iniciantes",
    "Sugira uma estrutura para um artigo sobre inovação",
  ],
  research: [
    "O que são redes neurais e como funcionam?",
    "Quais são as últimas pesquisas em energia renovável?",
    "Explique o conceito de blockchain de forma simples",
    "Quais são as melhores práticas para segurança de dados?",
  ]
};

// Tab configuration
const TABS = [
  { id: 'documents', label: 'Documentos', icon: <FileText size={18} /> },
  { id: 'dataAnalysis', label: 'Análise de Dados', icon: <BarChart2 size={18} /> },
  { id: 'creativity', label: 'Criatividade', icon: <Sparkles size={18} /> },
  { id: 'research', label: 'Pesquisa', icon: <BookOpen size={18} /> },
];

// Document types supported with colored icons
const DOCUMENT_TYPES = [
  { 
    label: "PDF", 
    icon: <FileText size={14} color="#EF4444" />, 
    color: "#EF4444",
    description: "Contratos, artigos, relatórios e documentos formatados"
  },
  { 
    label: "Word", 
    icon: <FileCode size={14} color="#3B82F6" />, 
    color: "#3B82F6",
    description: "Documentos de texto com formatação avançada"
  },
  { 
    label: "Excel", 
    icon: <FileSpreadsheet size={14} color="#10B981" />, 
    color: "#10B981",
    description: "Planilhas e dados tabulares com fórmulas"
  },
  { 
    label: "Imagem", 
    icon: <FileImage size={14} color="#8B5CF6" />, 
    color: "#8B5CF6",
    description: "Fotografias, diagramas e imagens escaneadas"
  },
  { 
    label: "CSV", 
    icon: <Table size={14} color="#F59E0B" />, 
    color: "#F59E0B",
    description: "Dados tabulares simples em formato texto"
  },
  { 
    label: "Texto", 
    icon: <ScrollText size={14} color="#6B7280" />, 
    color: "#6B7280",
    description: "Arquivos de texto simples sem formatação"
  },
  { 
    label: "Ajuda", 
    icon: <HelpCircle size={14} color="#3B82F6" />, 
    color: "#3B82F6",
    description: "Saiba mais sobre os tipos de documentos suportados"
  },
];

const ClaudiaWelcomeScreen = ({ 
  onStartChat, 
  onPromptSelected, 
  onUpload, 
  processorAvailable = true,
  conversationId = null,
  sidebarWidth = 280,
  sidebarExpanded = true
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('documents');
  const [currentSuggestion, setCurrentSuggestion] = useState(0);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadProcessing, setUploadProcessing] = useState(false);
  const [tempDocument, setTempDocument] = useState(null);
  const [pendingUpload, setPendingUpload] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');
  
  // Ref para o input de arquivo
  const fileInputRef = useRef(null);
  
  // Get the current prompts based on active tab
  const currentPrompts = EXAMPLE_PROMPTS[activeTab] || [];
  
  // Adicionar log para depuração do estado do processador
  useEffect(() => {
    console.log('ClaudiaWelcomeScreen - Estado do processador:', processorAvailable);
  }, [processorAvailable]);
  
  // Effect for auto-rotating suggestions
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSuggestion((prev) => (prev + 1) % currentPrompts.length);
    }, 8000); 
    
    return () => clearInterval(interval);
  }, [currentPrompts]);
  
  // Reset suggestion index when changing tabs
  useEffect(() => {
    setCurrentSuggestion(0);
  }, [activeTab]);
  
  // Criar nova conversa a partir da mensagem e associar documento temporário
  const createNewConversationWithDocument = async (prompt, documentId, filename) => {
    if (!prompt || !prompt.trim()) return null;
    
    try {
      // Primeiro criar a conversa normal
      const newConversation = await onPromptSelected(prompt);
      
      // Se temos um ID de conversa e documento, associar
      if (newConversation?.conversation_id && documentId) {
        await associateDocumentWithConversation(documentId, newConversation.conversation_id);
        
        // Notificar o usuário
        setSnackbarMessage(`Documento "${filename}" associado à nova conversa.`);
        setSnackbarSeverity('success');
        setShowSnackbar(true);
      }
      
      return newConversation;
    } catch (error) {
      console.error('Erro ao criar conversa com documento:', error);
      
      setSnackbarMessage('Erro ao associar documento à conversa: ' + (error.message || 'Erro desconhecido'));
      setSnackbarSeverity('error');
      setShowSnackbar(true);
      
      return null;
    }
  };
  
  // Handle sending the message
  const handleSendMessage = () => {
    if (message.trim()) {
      if (tempDocument) {
        // Se temos documento temporário, criar conversa e associar
        createNewConversationWithDocument(
          message, 
          tempDocument.documentId, 
          tempDocument.filename
        ).then(() => {
          // Limpar documento temporário após associação
          setTempDocument(null);
          setPendingUpload(false);
          setMessage('');
        });
      } else {
        // Fluxo normal sem documento
        onPromptSelected(message);
        setMessage('');
      }
    }
  };
  
  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && message.trim()) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Select the current suggestion
  const handleSelectCurrentSuggestion = () => {
    if (currentPrompts[currentSuggestion]) {
      if (tempDocument) {
        // Se temos documento temporário, criar conversa e associar
        createNewConversationWithDocument(
          currentPrompts[currentSuggestion], 
          tempDocument.documentId, 
          tempDocument.filename
        ).then(() => {
          // Limpar documento temporário após associação
          setTempDocument(null);
          setPendingUpload(false);
        });
      } else {
        // Fluxo normal sem documento
        onPromptSelected(currentPrompts[currentSuggestion]);
      }
    }
  };
  
  // Navigation for suggestions
  const handleNextSuggestion = (e) => {
    e.stopPropagation();
    setCurrentSuggestion((prev) => (prev + 1) % currentPrompts.length);
  };
  
  const handlePreviousSuggestion = (e) => {
    e.stopPropagation();
    setCurrentSuggestion((prev) => (prev - 1 + currentPrompts.length) % currentPrompts.length);
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Upload handlers
  const handleOpenUploadDialog = () => {
    setUploadDialogOpen(true);
    setUploadSuccess(false);
    setUploadError(null);
  };

  const handleCloseUploadDialog = () => {
    setUploadDialogOpen(false);
    // Se o upload foi bem-sucedido, limpe após fechar
    if (uploadSuccess) {
      setTimeout(() => {
        setUploadSuccess(false);
        setUploadError(null);
      }, 300);
    }
  };
  
  // Handler para quando o upload for concluído
  const handleUploadComplete = (documentId, filename) => {
    console.log(`Upload temporário concluído: ${documentId}, ${filename}`);
    setUploadSuccess(true);
    setUploadProcessing(false);
    
    // Armazenar informações do documento temporariamente
    setTempDocument({
      documentId,
      filename
    });
    
    // Se houver uma função de callback, chamar
    if (onUpload) {
      onUpload(documentId, filename);
    }
    
    // Não fechar o diálogo imediatamente
    // Exibir mensagem explicando próximos passos
    setSnackbarMessage(`Documento "${filename}" processado. Digite uma mensagem para iniciar a conversa com esse documento.`);
    setSnackbarSeverity('success');
    setShowSnackbar(true);
    
    // Fechar o diálogo após um tempo mais longo
    setTimeout(() => {
      setUploadDialogOpen(false);
    }, 3000);
  };
  
  // Handler para erros de upload
  const handleUploadError = (error) => {
    console.error('Erro no upload:', error);
    setUploadError(error);
    setUploadProcessing(false);
  };
  
  // Handler para acompanhar o processamento
  const handleProcessing = (isProcessing, status) => {
    setUploadProcessing(isProcessing);
  };

  // Abrir diálogo de ajuda
  const handleOpenHelpDialog = () => {
    setHelpDialogOpen(true);
  };

  // Remover documento temporário
  const handleRemoveTempDocument = () => {
    setTempDocument(null);
    setPendingUpload(false);
  };

  // Calcular o ajuste baseado na largura da sidebar e seu estado
  const contentOffset = !isMobile && sidebarExpanded ? `${sidebarWidth/2}px` : '0px';

  return (
    <Box 
      sx={{ 
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: { xs: 4, md: 6 },
        overflow: 'auto',
        background: theme.palette.mode === 'dark' 
          ? 'linear-gradient(180deg, rgba(16,20,30,0.95) 0%, rgba(16,20,30,1) 100%)' 
          : 'linear-gradient(180deg, rgba(245,247,250,0.95) 0%, rgba(245,247,250,1) 100%)'
      }}
    >
      {/* Container centralizado com margem ajustada para a sidebar */}
      <Container 
        maxWidth="md" 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          height: '100%',
          justifyContent: 'center',
          ml: { xs: 0, md: contentOffset },
          transition: 'margin-left 0.3s ease'
        }}
      >
        {/* Logo and title com alinhamento corrigido */}
        <Box 
          component={motion.div}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          sx={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            mb: 4,
            mt: { xs: 2, md: 0 },
            width: '100%',
            textAlign: 'center'
          }}
        >
          {/* Logo do olho com texto moderno integrado */}
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              position: 'relative',
              pb: 1,
              mb: 2,
              mt: 1
            }}
          >
            <ClaudIAEyeLogo 
              size="xlarge" 
              showText={true} 
              withAnimation={true} 
              blinkInterval={10}
            />
          </Box>
          
          <Typography 
            variant="h6" 
            color="text.secondary" 
            sx={{ 
              textAlign: 'center',
              maxWidth: 600,
              mb: 3,
              fontWeight: 400,
              mt: 1,
              px: 2,
              fontSize: { xs: '1rem', md: '1.1rem' },
              lineHeight: 1.5
            }}
          >
            Sua assistente particular, especializada em análise de documentos e dados
          </Typography>
          
          {/* Chips de documentos com tooltip e melhor feedback */}
          <Stack 
            direction="row" 
            spacing={1} 
            flexWrap="wrap" 
            justifyContent="center" 
            sx={{ 
              mb: 4,
              px: 2,
              gap: { xs: 0.5, md: 1 }
            }}
          >
            {DOCUMENT_TYPES.map((type, index) => (
              <Tooltip 
                key={index} 
                title={type.description || `Suporte para arquivos ${type.label}`}
                placement="top"
              >
                <Chip
                  icon={type.icon}
                  label={type.label}
                  variant="outlined"
                  size="small"
                  onClick={type.label === "Ajuda" ? handleOpenHelpDialog : undefined}
                  sx={{
                    borderRadius: '16px',
                    mb: 1,
                    px: 1,
                    bgcolor: alpha(type.color, 0.08),
                    borderColor: alpha(type.color, 0.3),
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      bgcolor: alpha(type.color, 0.12),
                      transform: 'translateY(-2px)',
                      boxShadow: '0 3px 5px rgba(0,0,0,0.1)'
                    },
                    '& .MuiChip-icon': {
                      color: type.color
                    },
                    '& .MuiChip-label': {
                      color: theme.palette.mode === 'dark' ? alpha(type.color, 0.9) : type.color
                    }
                  }}
                />
              </Tooltip>
            ))}
          </Stack>
        </Box>
        
        {/* Main dialog com centralização corrigida */}
        <Paper
          elevation={1}
          sx={{
            p: 0,
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 2px 20px rgba(0,0,0,0.08)',
            mb: 4,
            mx: 'auto',
            width: '100%',
            maxWidth: '100%',
            background: theme.palette.mode === 'dark' 
              ? 'rgba(30, 32, 40, 0.9)' 
              : 'rgba(255, 255, 255, 0.95)',
            position: 'relative',
            backdropFilter: 'blur(10px)',
            border: '1px solid',
            borderColor: theme.palette.mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.05)' 
              : 'rgba(0, 0, 0, 0.05)'
          }}
        >
          {/* Tabs no estilo da imagem */}
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            variant={isMobile ? "scrollable" : "fullWidth"}
            scrollButtons={isMobile ? "auto" : false}
            textColor="primary"
            indicatorColor="primary"
            aria-label="assistant categories"
            sx={{
              borderBottom: '1px solid',
              borderColor: 'divider',
              '& .MuiTab-root': {
                px: isMobile ? 2 : 3,
                py: 1.5,
                minWidth: isMobile ? 'auto' : 120,
                minHeight: '48px',
                fontSize: '0.875rem'
              }
            }}
          >
            {TABS.map((tab) => (
              <Tab 
                key={tab.id} 
                value={tab.id} 
                icon={tab.icon} 
                label={tab.label} 
                iconPosition="start"
                sx={{
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: isMobile ? '0.8rem' : '0.875rem'
                }}
              />
            ))}
          </Tabs>

          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Pergunte à Claud.IA
            </Typography>
            
            {/* Documento temporário alerta */}
            {tempDocument && (
              <Alert 
                severity="info" 
                sx={{ mt: 1, mb: 3 }}
                action={
                  <Button 
                    color="inherit" 
                    size="small" 
                    onClick={handleRemoveTempDocument}
                  >
                    Remover
                  </Button>
                }
              >
                Documento "{tempDocument.filename}" pronto para uso. Digite uma mensagem para iniciar a conversa com esse documento.
              </Alert>
            )}
            
            {/* Carousel de sugestões mais interativo */}
            <Box 
              onClick={handleSelectCurrentSuggestion}
              sx={{ 
                height: 64, 
                mb: 3, 
                display: 'flex',
                alignItems: 'center',
                borderRadius: 2,
                backgroundColor: alpha(theme.palette.primary.light, 0.06),
                px: 1,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: alpha(theme.palette.primary.main, 0.1),
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.light, 0.1),
                  boxShadow: 'inset 0 0 0 1px ' + alpha(theme.palette.primary.main, 0.2)
                }
              }}
            >
              <IconButton onClick={(e) => {
                e.stopPropagation();
                handlePreviousSuggestion(e);
              }} size="small">
                <ChevronLeft size={20} />
              </IconButton>
              
              <Box sx={{ flex: 1, mx: 1, overflow: 'hidden' }}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSuggestion}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.5 }}
                    style={{ 
                      width: '100%', 
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Typography 
                      variant="body1" 
                      color="primary"
                      sx={{ 
                        textAlign: 'center',
                        fontStyle: 'italic',
                        maxWidth: '100%',
                        px: 1,
                        fontSize: isMobile ? '0.9rem' : '1rem'
                      }}
                    >
                      "{currentPrompts[currentSuggestion]}"
                    </Typography>
                  </motion.div>
                </AnimatePresence>
              </Box>
              
              <IconButton onClick={(e) => {
                e.stopPropagation();
                handleNextSuggestion(e);
              }} size="small">
                <ChevronRight size={20} />
              </IconButton>
            </Box>
            
            {/* Campo de mensagem estilo da imagem com feedback melhorado */}
            <Box sx={{ position: 'relative', mb: 3 }}>
              <TextField
                fullWidth
                multiline
                minRows={2}
                maxRows={5}
                placeholder="Digite sua mensagem ou pergunta aqui..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                variant="outlined"
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    backgroundColor: alpha(theme.palette.background.paper, 0.5),
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.background.paper, 0.8),
                    },
                    '&.Mui-focused': {
                      boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.25)}`
                    }
                  }
                }}
              />
              <IconButton 
                color="primary" 
                onClick={handleSendMessage}
                disabled={!message.trim()}
                sx={{
                  position: 'absolute',
                  bottom: 8,
                  right: 8,
                  backgroundColor: message.trim() ? theme.palette.primary.main : 'transparent',
                  color: message.trim() ? 'white' : undefined,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: message.trim() ? theme.palette.primary.dark : undefined,
                    transform: message.trim() ? 'scale(1.05)' : 'none'
                  }
                }}
              >
                <Send size={18} />
              </IconButton>
            </Box>
            
            {/* Botões no estilo da imagem com melhor transição */}
            <Box sx={{ 
              display: 'flex', 
              flexDirection: isTablet ? 'column' : 'row',
              justifyContent: 'space-between', 
              alignItems: isTablet ? 'stretch' : 'center',
              gap: 2
            }}>
              <Button
                variant="contained"
                disableElevation
                disabled={!message.trim()}
                onClick={handleSendMessage}
                startIcon={<MessageSquare size={18} />}
                fullWidth={isTablet}
                sx={{
                  borderRadius: '10px',
                  py: 1.5,
                  px: 3,
                  textTransform: 'none',
                  fontWeight: 500,
                  backgroundColor: theme.palette.primary.main,
                  backgroundImage: 'linear-gradient(90deg, #5B52F3 0%, #7C64F9 100%)',
                  boxShadow: '0 2px 10px rgba(91, 82, 243, 0.25)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundImage: 'linear-gradient(90deg, #4A43D9 0%, #6B55E4 100%)',
                    boxShadow: '0 4px 12px rgba(91, 82, 243, 0.3)',
                    transform: 'translateY(-2px)'
                  },
                  '&:active': {
                    transform: 'translateY(1px)',
                    boxShadow: '0 2px 8px rgba(91, 82, 243, 0.2)',
                  }
                }}
              >
                Iniciar Conversa
              </Button>
              
              {/* CORREÇÃO: Botão de upload com feedback visual quando processador indisponível */}
              <Button
                variant="outlined"
                onClick={processorAvailable ? handleOpenUploadDialog : () => {
                  console.log('Botão de upload desabilitado. Estado do processador:', processorAvailable);
                  setSnackbarMessage('O serviço de processamento de documentos não está disponível no momento.');
                  setSnackbarSeverity('warning');
                  setShowSnackbar(true);
                }}
                startIcon={<FileUp size={18} />}
                fullWidth={isTablet}
                disabled={!processorAvailable}
                sx={{ 
                  borderRadius: '10px',
                  py: 1.5,
                  px: 3,
                  ml: isTablet ? 0 : 2,
                  textTransform: 'none',
                  fontWeight: 500,
                  borderColor: !processorAvailable 
                    ? theme.palette.action.disabled
                    : (theme.palette.mode === 'dark' 
                      ? alpha(theme.palette.primary.main, 0.7)
                      : theme.palette.primary.main),
                  color: !processorAvailable ? theme.palette.text.disabled : theme.palette.primary.main,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: theme.palette.primary.dark,
                    backgroundColor: alpha(theme.palette.primary.main, 0.04),
                    transform: processorAvailable ? 'translateY(-2px)' : 'none'
                  },
                  '&:active': {
                    transform: processorAvailable ? 'translateY(1px)' : 'none'
                  }
                }}
              >
                Upload de Documento
              </Button>
            </Box>
          </Box>
        </Paper>
      </Container>
      
      {/* Diálogo de Upload de Documento */}
      <Dialog
        open={uploadDialogOpen}
        onClose={uploadProcessing ? undefined : handleCloseUploadDialog}
        TransitionComponent={Transition}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            px: 2,
            py: 2
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          pb: 1
        }}>
          <Typography variant="h6" component="div">
            Upload de Documento
          </Typography>
          {!uploadProcessing && (
            <IconButton onClick={handleCloseUploadDialog} size="small">
              <X size={18} />
            </IconButton>
          )}
        </DialogTitle>
        
        <DialogContent>
          {uploadSuccess ? (
            <Box 
              sx={{ 
                textAlign: 'center', 
                py: 4,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2
              }}
            >
              <CheckCircle size={48} color={theme.palette.success.main} />
              <Typography variant="h6" color="success.main">
                Upload Concluído com Sucesso!
              </Typography>
              <Typography variant="body2" color="text.secondary">
                O documento está pronto para uso. Digite uma mensagem para iniciar a conversa com ele.
              </Typography>
            </Box>
          ) : uploadError ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {typeof uploadError === 'string' ? uploadError : 'Ocorreu um erro durante o upload. Por favor, tente novamente.'}
            </Alert>
          ) : (
            <Box sx={{ py: 1 }}>
              <Typography variant="body2" color="text.secondary" paragraph>
                Faça upload de um documento para analisar com a Claud.IA. 
                Suportamos diversos formatos, incluindo PDF, Word, Excel e imagens.
              </Typography>
              
              {/* Componente DocumentUploader integrado com modo temporário */}
              <DocumentUploader 
                onUploadComplete={handleUploadComplete} 
                onUploadError={handleUploadError}
                onProcessing={handleProcessing}
                temporaryMode={true} // Importante: modo temporário!
              />
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button 
            onClick={handleCloseUploadDialog} 
            color="primary"
            disabled={uploadProcessing}
          >
            {uploadSuccess ? 'Fechar' : 'Cancelar'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Diálogo de Ajuda */}
      <Dialog
        open={helpDialogOpen}
        onClose={() => setHelpDialogOpen(false)}
        TransitionComponent={Transition}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            px: 2,
            py: 2
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          pb: 1
        }}>
          <Typography variant="h6" component="div">
            Sobre os Documentos
          </Typography>
          <IconButton onClick={() => setHelpDialogOpen(false)} size="small">
            <X size={18} />
          </IconButton>
        </DialogTitle>
        
        <DialogContent>
          <Typography variant="body1" paragraph>
            A Claud.IA pode processar diversos tipos de documentos para análise:
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>
              Tipos de documentos suportados:
            </Typography>
            
            <Stack spacing={1}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ minWidth: 24 }}>
                  <FileText size={20} color="#EF4444" />
                </Box>
                <Box>
                  <Typography variant="body2" fontWeight={500}>PDF</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Contratos, artigos, relatórios, teses e outros documentos textuais
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ minWidth: 24 }}>
                  <FileCode size={20} color="#3B82F6" />
                </Box>
                <Box>
                  <Typography variant="body2" fontWeight={500}>Word</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Documentos com formatação avançada, estilos e recursos do Microsoft Word
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ minWidth: 24 }}>
                  <FileSpreadsheet size={20} color="#10B981" />
                </Box>
                <Box>
                  <Typography variant="body2" fontWeight={500}>Excel e CSV</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Planilhas, tabelas de dados, relatórios financeiros e estatísticas
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ minWidth: 24 }}>
                  <FileImage size={20} color="#8B5CF6" />
                </Box>
                <Box>
                  <Typography variant="body2" fontWeight={500}>Imagens</Typography>
                  <Typography variant="caption" color="text.secondary">
                    JPG, PNG - documentos digitalizados, fotos de documentos
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ minWidth: 24 }}>
                  <ScrollText size={20} color="#6B7280" />
                </Box>
                <Box>
                  <Typography variant="body2" fontWeight={500}>Texto Simples</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Arquivos .txt, código, logs e dados não formatados
                  </Typography>
                </Box>
              </Box>
            </Stack>
          </Box>
          
          <Typography variant="body2" paragraph>
            Após o upload, a Claud.IA processará o documento, extraindo texto, tabelas e 
            outros elementos para que você possa fazer perguntas sobre seu conteúdo.
          </Typography>
          
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              O tamanho máximo para upload é de 100MB por arquivo.
            </Typography>
          </Alert>
        </DialogContent>
        
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setHelpDialogOpen(false)} color="primary">
            Entendi
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar para feedback */}
      <Snackbar
        open={showSnackbar}
        autoHideDuration={6000}
        onClose={() => setShowSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setShowSnackbar(false)} 
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

export default ClaudiaWelcomeScreen;