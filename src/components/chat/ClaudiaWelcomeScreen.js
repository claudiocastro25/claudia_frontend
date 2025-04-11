import React, { useState, useEffect } from 'react';
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
  Fade
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
  Send
} from 'lucide-react';
import ClaudIAEyeLogo from '../../components/layout/ClaudiaLogo'; // Importe o componente do logo com o olho

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

// Document types supported
const DOCUMENT_TYPES = [
  { label: "PDF", icon: <FileText size={14} /> },
  { label: "Word", icon: <FileText size={14} /> },
  { label: "Excel", icon: <Table size={14} /> },
  { label: "Imagem", icon: <FileImage size={14} /> },
  { label: "CSV", icon: <Table size={14} /> },
  { label: "Texto", icon: <MessageSquare size={14} /> },
];

const ClaudiaWelcomeScreen = ({ 
  onStartChat, 
  onPromptSelected, 
  onUpload, 
  processorAvailable = true,
  sidebarWidth = 280,
  sidebarExpanded = true
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('documents');
  const [currentSuggestion, setCurrentSuggestion] = useState(0);
  
  // Get the current prompts based on active tab
  const currentPrompts = EXAMPLE_PROMPTS[activeTab] || [];
  
  // Effect for auto-rotating suggestions - mais lenta (8s)
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
  
  // Handle sending the message
  const handleSendMessage = () => {
    if (message.trim() && onPromptSelected) {
      onPromptSelected(message);
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
    if (onPromptSelected && currentPrompts[currentSuggestion]) {
      onPromptSelected(currentPrompts[currentSuggestion]);
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
          
          {/* Chips de documentos no estilo da imagem */}
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
              <Chip
                key={index}
                icon={type.icon}
                label={type.label}
                variant="outlined"
                size="small"
                sx={{
                  borderRadius: '16px',
                  mb: 1,
                  px: 1,
                  bgcolor: alpha(theme.palette.background.paper, 0.7),
                  borderColor: alpha(theme.palette.primary.main, 0.3),
                  '& .MuiChip-icon': {
                    color: theme.palette.primary.main
                  }
                }}
              />
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
            
            {/* Carousel de sugestões mais leve */}
            <Box 
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
              }}
            >
              <IconButton onClick={handlePreviousSuggestion} size="small">
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
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                    onClick={handleSelectCurrentSuggestion}
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
              
              <IconButton onClick={handleNextSuggestion} size="small">
                <ChevronRight size={20} />
              </IconButton>
            </Box>
            
            {/* Campo de mensagem estilo da imagem */}
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
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.background.paper, 0.8),
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
                  '&:hover': {
                    backgroundColor: message.trim() ? theme.palette.primary.dark : undefined
                  }
                }}
              >
                <Send size={18} />
              </IconButton>
            </Box>
            
            {/* Botões no estilo da imagem */}
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
                  '&:hover': {
                    backgroundImage: 'linear-gradient(90deg, #4A43D9 0%, #6B55E4 100%)',
                    boxShadow: '0 4px 12px rgba(91, 82, 243, 0.3)',
                  }
                }}
              >
                Iniciar Conversa
              </Button>
              
              <Button
                variant="outlined"
                disabled={!processorAvailable}
                onClick={onUpload}
                startIcon={<FileUp size={18} />}
                fullWidth={isTablet}
                sx={{ 
                  borderRadius: '10px',
                  py: 1.5,
                  px: 3,
                  ml: isTablet ? 0 : 2,
                  textTransform: 'none',
                  fontWeight: 500,
                  borderColor: theme.palette.mode === 'dark' 
                    ? alpha(theme.palette.primary.main, 0.7)
                    : theme.palette.primary.main,
                  color: theme.palette.primary.main,
                  '&:hover': {
                    borderColor: theme.palette.primary.dark,
                    backgroundColor: alpha(theme.palette.primary.main, 0.04)
                  }
                }}
              >
                Upload de Documento
              </Button>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default ClaudiaWelcomeScreen;