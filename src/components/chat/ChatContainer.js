import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Snackbar,
  Alert,
  Backdrop,
  CircularProgress,
  useTheme,
  useMediaQuery,
  ClickAwayListener,
  Typography
} from '@mui/material';
import { alpha } from '@mui/material/styles';

// Componentes
import ClaudiaSidebar from '../layout/ClaudiaSidebar';
import ClaudiaWelcomeScreen from './ClaudiaWelcomeScreen';
import DocumentPanel from '../documents/DocumentPanel';
import VisualizationDrawer from '../visualization/VisualizationDrawer';
import ConversationHeader from './ConversationHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ProcessingFeedback from '../documents/ProcessingFeedback';

// Contextos
import { useAuth } from '../../contexts/AuthContext';
import { useDocumentContext } from '../../contexts/DocumentContext';
import { useVisualizationContext } from '../../contexts/VisualizationContext';

// Utils e Serviços
import { createConversation, getConversations, getConversation, sendMessage } from '../../services/chatService';
import { extractConversationsFromResponse, extractMessagesFromResponse } from '../../utils/apiHelpers';
import { useErrorHandler } from '../../hooks/useErrorHandler';

// Constantes
import { DOCUMENT_STATUS } from '../../constants/documentStatus';

// Cache global para evitar chamadas repetidas à API
const CONVERSATION_CACHE = {};
const VISUALIZATION_LOADED = {};
let LOADING_CONVERSATION = false;
let LOADING_VISUALIZATION = false;

/**
 * Componente principal do container de chat
 * Corrigido para eliminar loops e chamadas repetidas
 */
const ChatContainer = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const { currentUser } = useAuth();
  
  // Refs para controle
  const lastConversationId = useRef(null);
  const requestCount = useRef(0);
  
  // Contextos
  const { 
    uploadDocument,
    processorStatus,
    viewDocument,
    uploadStatus,
    loadConversationDocuments,
    getActiveConversationDocuments,
    setConversation
  } = useDocumentContext();
  
  const {
    processMessageForVisualizations,
    openVisualization,
    isDrawerOpen,
    activeVisualization,
    setConversation: setVisualizationConversation,
    loadVisualizations,
    closeDrawer
  } = useVisualizationContext();
  
  // Manipulação de erros
  const { error, handleError, clearError, showErrorMessage } = useErrorHandler();
  
  // Refs
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const documentPanelRef = useRef(null);
  const containerRef = useRef(null);
  
  // Estados
  const [sidebarExpanded, setSidebarExpanded] = useState(!isMobile);
  const [isDocumentPanelOpen, setIsDocumentPanelOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isNewChat, setIsNewChat] = useState(true);
  const [documentReferences, setDocumentReferences] = useState({});
  const [activeDocuments, setActiveDocuments] = useState([]);
  
  // Alertas
  const [alertInfo, setAlertInfo] = useState({ 
    open: false, 
    message: '', 
    severity: 'info',
    action: null,
    autoHideDuration: 6000
  });
  
  // Função segura para carregar visualizações
  const safelyLoadVisualizations = (conversationId) => {
    // Não carregar se já carregado ou já está carregando
    if (!conversationId || VISUALIZATION_LOADED[conversationId] || LOADING_VISUALIZATION) {
      return;
    }
    
    LOADING_VISUALIZATION = true;
    VISUALIZATION_LOADED[conversationId] = true;
    
    // Usar setTimeout para evitar chamadas em rápida sucessão
    setTimeout(() => {
      loadVisualizations();
      LOADING_VISUALIZATION = false;
    }, 100);
  };
  
  // Função para lidar com clique fora da sidebar
  const handleClickAway = (event) => {
    if (sidebarExpanded && isMobile) {
      const sidebarElement = document.querySelector('[data-testid="claudia-sidebar"]');
      if (sidebarElement && !sidebarElement.contains(event.target)) {
        setSidebarExpanded(false);
      }
    }
  };

  // Carregar conversas ao montar o componente
  useEffect(() => {
    const loadConversations = async () => {
      try {
        setIsLoading(true);
        clearError();
        
        const response = await getConversations();
        const conversationsData = extractConversationsFromResponse(response);
        
        setConversations(conversationsData || []);
      } catch (error) {
        handleError(error, 'Não foi possível carregar o histórico de conversas');
        setAlertInfo({
          open: true,
          message: 'Não foi possível carregar o histórico de conversas',
          severity: 'error'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    if (currentUser) {
      loadConversations();
    }
  }, [currentUser, handleError, clearError]);
  
  // Carregar mensagens quando a conversa muda
  useEffect(() => {
    const loadMessages = async () => {
      if (!currentConversation) return;
      
      const conversationId = currentConversation.conversation_id;
      
      // Evitar requisições repetidas para a mesma conversa
      if (lastConversationId.current === conversationId) {
        return;
      }
      
      // Verificar se temos dados em cache
      if (CONVERSATION_CACHE[conversationId]) {
        console.log('Usando dados em cache para conversa:', conversationId);
        
        const cached = CONVERSATION_CACHE[conversationId];
        setMessages(cached.messages || []);
        setDocumentReferences(cached.references || {});
        setIsNewChat(false);
        
        // Atualizar contextos
        setConversation(conversationId);
        setVisualizationConversation(conversationId);
        
        // Carregar documentos e visualizações de forma segura
        loadConversationDocuments(conversationId);
        safelyLoadVisualizations(conversationId);
        
        // Atualizar documentos ativos com atraso para evitar loops
        setTimeout(() => {
          try {
            const docsResponse = getActiveConversationDocuments();
            setActiveDocuments(docsResponse || []);
          } catch (error) {
            console.warn("Erro ao obter documentos ativos:", error);
          }
        }, 200);
        
        lastConversationId.current = conversationId;
        return;
      }
      
      // Evitar chamadas simultâneas
      if (LOADING_CONVERSATION) {
        return;
      }
      
      LOADING_CONVERSATION = true;
      lastConversationId.current = conversationId;
      
      try {
        setIsLoading(true);
        clearError();
        
        requestCount.current += 1;
        console.log(`Carregando conversa (${requestCount.current}):`, conversationId);
        
        const response = await getConversation(conversationId);
        const messagesData = extractMessagesFromResponse(response) || [];
        
        // Armazenar em cache
        const newReferences = {};
        messagesData.forEach(message => {
          if (message.referenced_documents && message.referenced_documents.length > 0) {
            newReferences[message.message_id] = message.referenced_documents;
          }
        });
        
        CONVERSATION_CACHE[conversationId] = {
          messages: messagesData,
          references: newReferences,
          timestamp: Date.now()
        };
        
        setMessages(messagesData);
        setIsNewChat(false);
        setDocumentReferences(newReferences);
        
        // Atualizar contextos com atraso para evitar loops
        setTimeout(() => {
          setConversation(conversationId);
          setVisualizationConversation(conversationId);
        }, 50);
        
        // Carregar documentos e visualizações com atraso para evitar loops
        setTimeout(() => {
          loadConversationDocuments(conversationId);
          safelyLoadVisualizations(conversationId);
          
          // Atualizar documentos ativos
          try {
            const docsResponse = getActiveConversationDocuments();
            setActiveDocuments(docsResponse || []);
          } catch (error) {
            console.warn("Erro ao obter documentos ativos:", error);
          }
        }, 200);
        
      } catch (error) {
        handleError(error, 'Não foi possível carregar as mensagens desta conversa');
        
        // Verificar se o erro é de conversa não encontrada
        if (error.notFound || error.code === 404 || 
            (error.status === 'error' && error.message?.includes('not found'))) {
          
          setAlertInfo({
            open: true,
            message: 'A conversa selecionada não existe ou foi excluída. Iniciando uma nova conversa.',
            severity: 'warning'
          });
          
          // Limpar conversa atual e iniciar nova
          setCurrentConversation(null);
          setMessages([]);
          setIsNewChat(true);
          setActiveDocuments([]);
          setDocumentReferences({});
          lastConversationId.current = null;
          
          // Atualizar lista de conversas
          try {
            const conversationsResponse = await getConversations();
            const conversationsData = extractConversationsFromResponse(conversationsResponse);
            setConversations(conversationsData || []);
          } catch (convError) {
            handleError(convError, 'Erro ao atualizar lista de conversas');
          }
        } else {
          // Erro normal
          setAlertInfo({
            open: true,
            message: 'Não foi possível carregar as mensagens desta conversa',
            severity: 'error'
          });
        }
      } finally {
        setIsLoading(false);
        LOADING_CONVERSATION = false;
      }
    };
    
    if (currentConversation) {
      loadMessages();
    }
  }, [currentConversation, loadConversationDocuments, getActiveConversationDocuments, 
      setConversation, setVisualizationConversation, loadVisualizations, handleError, clearError]);
  
  // Scroll para o final das mensagens
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);
  
  // Manipulador para visualizar documento
  const handleViewDocument = (documentId) => {
    if (!isDocumentPanelOpen) {
      setIsDocumentPanelOpen(true);
    }
    
    if (documentPanelRef.current) {
      documentPanelRef.current.focusDocument(documentId);
    } else {
      viewDocument(documentId);
    }
  };
  
  // Criar nova conversa com mensagem inicial
  const createNewConversationWithMessage = async (content) => {
    // Evitar mensagens vazias
    if (!content || content.trim() === '') return null;
    
    // Evitar enviar se já estiver processando
    if (isTyping) return null;
    
    try {
      setIsTyping(true);
      clearError();
      
      // Recolher a sidebar no mobile
      if (isMobile && sidebarExpanded) {
        setSidebarExpanded(false);
      }
      
      // Criar título a partir do conteúdo
      let title = content.length > 30 
        ? `${content.substring(0, 30)}...` 
        : content;
        
      if (title.length < 10) {
        title = "Nova conversa";
      }
      
      console.log("Criando nova conversa com mensagem:", content.substring(0, 20) + "...");
      
      // Criar conversa
      const conversationResponse = await createConversation(title);
      
      if (!conversationResponse || !conversationResponse.data) {
        throw new Error('Falha ao criar nova conversa - resposta inválida');
      }
      
      const newConversation = conversationResponse.data?.conversation || conversationResponse.data;
      
      if (!newConversation || !newConversation.conversation_id) {
        throw new Error('Falha ao criar nova conversa - ID da conversa não encontrado');
      }
      
      console.log("Nova conversa criada:", newConversation.conversation_id);
      
      // IMPORTANTE: Atualizar estado de conversação primeiro
      const conversationId = newConversation.conversation_id;
      lastConversationId.current = conversationId;
      
      // Adicionar mensagem temporária do usuário
      const tempUserMessage = {
        message_id: `temp-${Date.now()}`,
        conversation_id: conversationId,
        content,
        role: 'user',
        created_at: new Date().toISOString()
      };
      
      // Garantir que as atualizações de estado ocorram na ordem correta
      setCurrentConversation(newConversation);
      setConversations(prev => [newConversation, ...prev]);
      setIsNewChat(false);
      setMessages([tempUserMessage]);
      
      // Definir conversa nos contextos com atraso para evitar loops
      setTimeout(() => {
        setConversation(conversationId);
        setVisualizationConversation(conversationId);
      }, 50);
      
      // Enviar mensagem para o servidor
      const messageResponse = await sendMessage(
        conversationId, 
        content
      );
      
      // Atualizar mensagens com a resposta do servidor
      if (messageResponse && messageResponse.data) {
        // Extrair mensagens da resposta
        let userMessage, assistantMessage;
        
        if (messageResponse.data.userMessage && messageResponse.data.assistantMessage) {
          ({ userMessage, assistantMessage } = messageResponse.data);
        } else if (messageResponse.data?.data?.userMessage && messageResponse.data?.data?.assistantMessage) {
          ({ userMessage, assistantMessage } = messageResponse.data.data);
        } else {
          userMessage = tempUserMessage;
          assistantMessage = {
            message_id: `fallback-${Date.now()}`,
            conversation_id: conversationId,
            content: 'Não foi possível processar a resposta do assistente.',
            role: 'assistant',
            created_at: new Date().toISOString()
          };
        }
        
        // Capturar referências de documentos
        const newReferences = {};
        if (assistantMessage.referenced_documents && assistantMessage.referenced_documents.length > 0) {
          newReferences[assistantMessage.message_id] = assistantMessage.referenced_documents;
          setDocumentReferences(newReferences);
        }
        
        const newMessages = [userMessage, assistantMessage];
        setMessages(newMessages);
        
        // Atualizar cache
        CONVERSATION_CACHE[conversationId] = {
          messages: newMessages,
          references: newReferences,
          timestamp: Date.now()
        };
        
        // Verificar visualizações na mensagem do assistente com atraso para evitar loops
        setTimeout(() => {
          if (typeof processMessageForVisualizations === 'function') {
            try {
              const vizResult = processMessageForVisualizations(
                assistantMessage.content,
                assistantMessage.message_id
              );
              
              if (vizResult && vizResult.hasVisualization) {
                openVisualization(vizResult.visualization);
              }
            } catch (error) {
              console.warn("Erro ao processar visualização:", error);
            }
          }
        }, 100);
      }
      
      return newConversation;
    } catch (error) {
      handleError(error, 'Erro ao criar conversa');
      setAlertInfo({
        open: true,
        message: 'Não foi possível criar a conversa ou enviar a mensagem',
        severity: 'error'
      });
      return null;
    } finally {
      setIsTyping(false);
    }
  };
  
  // Enviar mensagem para conversa existente
  const sendMessageToConversation = async (conversationId, content) => {
    // Validações
    if (!conversationId || !content || content.trim() === '') return;
    if (isTyping) return; // Evitar enviar durante digitação
    
    try {
      setIsTyping(true);
      clearError();
      
      // Adicionar mensagem temporária do usuário
      const tempUserMessage = {
        message_id: `temp-${Date.now()}`,
        conversation_id: conversationId,
        content,
        role: 'user',
        created_at: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, tempUserMessage]);
      
      // Enviar mensagem para o servidor
      const response = await sendMessage(conversationId, content);
      
      // Atualizar mensagens com a resposta do servidor
      if (response && response.data) {
        // Extrair mensagens da resposta
        let userMessage, assistantMessage;
        
        if (response.data.userMessage && response.data.assistantMessage) {
          ({ userMessage, assistantMessage } = response.data);
        } else if (response.data?.data?.userMessage && response.data?.data?.assistantMessage) {
          ({ userMessage, assistantMessage } = response.data.data);
        } else {
          userMessage = tempUserMessage;
          assistantMessage = {
            message_id: `fallback-${Date.now()}`,
            conversation_id: conversationId,
            content: 'Não foi possível processar a resposta do assistente.',
            role: 'assistant',
            created_at: new Date().toISOString()
          };
        }
        
        // Capturar referências de documentos
        if (assistantMessage.referenced_documents && assistantMessage.referenced_documents.length > 0) {
          setDocumentReferences(prev => ({
            ...prev,
            [assistantMessage.message_id]: assistantMessage.referenced_documents
          }));
          
          // Atualizar referências no cache
          if (CONVERSATION_CACHE[conversationId]) {
            if (!CONVERSATION_CACHE[conversationId].references) {
              CONVERSATION_CACHE[conversationId].references = {};
            }
            
            CONVERSATION_CACHE[conversationId].references[assistantMessage.message_id] = 
              assistantMessage.referenced_documents;
          }
        }
        
        // Substituir mensagem temporária e adicionar resposta
        const updatedMessages = prev => {
          const filtered = prev.filter(msg => msg.message_id !== tempUserMessage.message_id);
          return [...filtered, userMessage, assistantMessage];
        };
        
        setMessages(updatedMessages);
        
        // Atualizar mensagens no cache
        if (CONVERSATION_CACHE[conversationId]) {
          CONVERSATION_CACHE[conversationId].messages = updatedMessages(CONVERSATION_CACHE[conversationId].messages || []);
          CONVERSATION_CACHE[conversationId].timestamp = Date.now();
        }
        
        // Verificar visualizações na mensagem do assistente
        setTimeout(() => {
          if (typeof processMessageForVisualizations === 'function') {
            try {
              const vizResult = processMessageForVisualizations(
                assistantMessage.content,
                assistantMessage.message_id
              );
              
              if (vizResult && vizResult.hasVisualization) {
                openVisualization(vizResult.visualization);
              }
            } catch (error) {
              console.warn("Erro ao processar visualização:", error);
            }
          }
        }, 100);
      }
    } catch (error) {
      handleError(error, 'Erro ao enviar mensagem');
      
      // Verificar se o erro é de conversa não encontrada
      if (error.notFound || error.code === 404 || 
          (error.status === 'error' && error.message?.includes('not found'))) {
        
        setAlertInfo({
          open: true,
          message: 'A conversa selecionada não existe ou foi excluída. Iniciando uma nova conversa.',
          severity: 'warning'
        });
        
        // Limpar conversa atual e iniciar nova
        setCurrentConversation(null);
        setMessages([]);
        setIsNewChat(true);
        setActiveDocuments([]);
        setDocumentReferences({});
        lastConversationId.current = null;
        
        // Atualizar lista de conversas
        try {
          const conversationsResponse = await getConversations();
          const conversationsData = extractConversationsFromResponse(conversationsResponse);
          setConversations(conversationsData || []);
        } catch (convError) {
          handleError(convError, 'Erro ao atualizar lista de conversas');
        }
      } else {
        // Erro normal
        setAlertInfo({
          open: true,
          message: 'Não foi possível enviar a mensagem',
          severity: 'error'
        });
      }
    } finally {
      setIsTyping(false);
    }
  };
  
  // Manipulador principal para envio de mensagens
  const handleSendMessage = async (content) => {
    if (!content || content.trim() === '') return;
    
    try {
      if (isNewChat || !currentConversation) {
        // Criar nova conversa com mensagem inicial
        await createNewConversationWithMessage(content);
      } else if (currentConversation) {
        // Enviar mensagem para conversa existente
        await sendMessageToConversation(currentConversation.conversation_id, content);
      }
    } catch (error) {
      handleError(error, 'Erro ao processar mensagem');
    }
  };
  
  // Iniciar nova conversa
  const handleNewChat = () => {
    setCurrentConversation(null);
    setMessages([]);
    setIsNewChat(true);
    setActiveDocuments([]);
    setDocumentReferences({});
    lastConversationId.current = null;
    
    // Atualizar contextos com atraso para evitar loops
    setTimeout(() => {
      setConversation(null);
      setVisualizationConversation(null);
    }, 50);
    
    // Fechar sidebar no mobile
    if (isMobile && sidebarExpanded) {
      setSidebarExpanded(false);
    }
  };
  
  // Selecionar conversa existente
  const handleSelectConversation = (conversation) => {
    // Evitar reselecionar a mesma conversa
    if (currentConversation && 
        currentConversation.conversation_id === conversation.conversation_id) {
      // Apenas fechar sidebar no mobile
      if (isMobile && sidebarExpanded) {
        setSidebarExpanded(false);
      }
      return;
    }
    
    setCurrentConversation(conversation);
    setIsNewChat(false);
    
    // Fechar sidebar no mobile
    if (isMobile && sidebarExpanded) {
      setSidebarExpanded(false);
    }
  };
  
  // Manipular prompt selecionado
  const handlePromptSelected = async (prompt) => {
    if (!prompt || prompt.trim() === '') return;
    
    console.log("Prompt selecionado:", prompt);
    
    try {
      // Criar nova conversa com o prompt
      await createNewConversationWithMessage(prompt);
    } catch (error) {
      handleError(error, 'Erro ao processar exemplo');
    }
  };
  
  // Alternar painel de documentos
  const handleToggleDocumentPanel = () => {
    setIsDocumentPanelOpen(!isDocumentPanelOpen);
  };
  
  // Fechar alerta
  const handleCloseAlert = () => {
    setAlertInfo(prev => ({ ...prev, open: false }));
  };
  
  // Manipular seleção de arquivo
  const handleFileSelect = (event) => {
    if (event.target.files && event.target.files.length > 0 && currentConversation) {
      const file = event.target.files[0];
      handleDocumentUpload(file);
    }
  };
  
  // Upload de documento
  const handleDocumentUpload = async (file) => {
    if (!file || !currentConversation) return;
    
    // Verificar disponibilidade do processador
    if (!processorStatus.available) {
      setAlertInfo({
        open: true,
        message: 'O serviço de processamento de documentos não está disponível no momento.',
        severity: 'warning'
      });
      return;
    }
    
    try {
      const result = await uploadDocument(file);
      
      if (result.success) {
        // Mostrar mensagem de sucesso
        setAlertInfo({
          open: true,
          message: `Documento "${file.name}" processado com sucesso!`,
          severity: 'success'
        });
        
        // Recarregar documentos associados
        loadConversationDocuments(currentConversation.conversation_id);
        
        // Adicionar mensagem informativa à conversa
        await sendMessageToConversation(
          currentConversation.conversation_id, 
          `Documento carregado: ${file.name}. Agora você pode me fazer perguntas sobre ele.`
        );
      } else {
        throw new Error(result.error || 'Erro durante o processamento do documento');
      }
    } catch (error) {
      handleError(error, `Erro ao processar "${file.name}"`);
      
      setAlertInfo({
        open: true,
        message: `Erro ao processar "${file.name}": ${error.message || 'Erro desconhecido'}`,
        severity: 'error'
      });
    }
  };
  
  // Manipular upload concluído no DocumentPanel
  const handleUploadComplete = (documentId, filename) => {
    // Mostrar notificação
    setAlertInfo({
      open: true,
      message: `Documento "${filename}" processado com sucesso!`,
      severity: 'success'
    });
    
    // Recarregar documentos associados
    if (currentConversation) {
      loadConversationDocuments(currentConversation.conversation_id);
    }
  };

  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <Box 
        ref={containerRef}
        sx={{ 
          height: '100vh', 
          display: 'flex', 
          bgcolor: theme.palette.background.default,
          position: 'relative',
        }}
      >
        {/* Input de arquivo oculto */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileSelect}
          accept=".pdf,.docx,.xlsx,.xls,.csv,.json,.txt,.jpg,.jpeg,.png"
        />
        
        {/* Sidebar */}
        <ClaudiaSidebar
          data-testid="claudia-sidebar"
          conversations={conversations}
          currentConversation={currentConversation}
          onNewChat={handleNewChat}
          onSelectConversation={handleSelectConversation}
          onLogout={() => {
            // Handle logout
          }}
          onToggleSidebar={() => setSidebarExpanded(!sidebarExpanded)}
          expanded={sidebarExpanded}
          alwaysShowExpandButton={true}
        />
        
        {/* Conteúdo principal - SIMPLIFICADO */}
        <Box
          component="main"
          sx={{ 
            flexGrow: 1, 
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          {/* IMPORTANTE: Verificar diretamente o currentConversation */}
          {!currentConversation ? (
            <ClaudiaWelcomeScreen 
              onStartChat={handleNewChat} 
              onPromptSelected={handlePromptSelected} 
              onUpload={() => fileInputRef.current?.click()}
              processorAvailable={processorStatus.available}
              sidebarWidth={280}
              sidebarExpanded={sidebarExpanded}
            />
          ) : (
            <Box 
              sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                height: '100%',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Cabeçalho da conversa */}
              <ConversationHeader 
                conversation={currentConversation}
                documentsCount={activeDocuments.length}
                messagesCount={messages.length}
                onBack={() => setSidebarExpanded(true)}
                onOpenDocuments={handleToggleDocumentPanel}
              />
              
              {/* Área de chat */}
              <Box 
                sx={{ 
                  flex: 1,
                  display: 'flex',
                  overflow: 'hidden',
                  position: 'relative',
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? alpha(theme.palette.background.paper, 0.5) 
                    : alpha(theme.palette.grey[50], 0.8)
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files.length > 0 && currentConversation) {
                    handleDocumentUpload(e.dataTransfer.files[0]);
                  }
                }}
              >
                {/* Lista de mensagens */}
                <Box 
                  sx={{ 
                    flex: 1,
                    overflow: 'auto',
                    height: '100%',
                    pr: isDocumentPanelOpen && !isSmall ? 2 : 0,
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  {/* Mostrar feedback de processamento se houver upload ativo */}
                  {uploadStatus.active && (
                    <Box sx={{ px: 2, pt: 2 }}>
                      <ProcessingFeedback 
                        status={uploadStatus.status}
                        progress={uploadStatus.progress}
                        filename={uploadStatus.filename}
                        error={uploadStatus.error}
                      />
                    </Box>
                  )}
                  
                  {/* Lista de mensagens */}
                  <MessageList 
                    messages={messages}
                    isTyping={isTyping}
                    documentReferences={documentReferences}
                    onViewDocument={handleViewDocument}
                    messagesEndRef={messagesEndRef}
                  />
                </Box>
                
                {/* Painel de documentos */}
                {(!isSmall || isDocumentPanelOpen) && (
                  <Box
                    sx={{
                      display: isDocumentPanelOpen ? 'block' : 'none',
                      width: isSmall ? '100%' : 350,
                      height: '100%',
                      position: isSmall ? 'absolute' : 'relative',
                      right: 0,
                      top: 0,
                      zIndex: 10,
                      bgcolor: 'background.paper',
                      borderLeft: !isSmall ? '1px solid' : 'none',
                      borderColor: 'divider',
                      boxShadow: isSmall ? 24 : 'none'
                    }}
                  >
                    <DocumentPanel 
                      ref={documentPanelRef}
                      conversationId={currentConversation?.conversation_id}
                      onClose={() => setIsDocumentPanelOpen(false)}
                      fullScreen={isSmall}
                      onUploadComplete={handleUploadComplete}
                    />
                  </Box>
                )}
              </Box>
              
              {/* Input de mensagem */}
              <Box 
                sx={{ 
                  p: 2, 
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  bgcolor: theme.palette.background.paper,
                }}
              >
                <MessageInput 
                  onSendMessage={handleSendMessage} 
                  onAttachFile={handleFileSelect}
                  disabled={isTyping || isLoading}
                  isTyping={isTyping}
                  processorAvailable={processorStatus.available}
                  conversationId={currentConversation?.conversation_id}
                  onViewDocument={handleViewDocument}
                  onOpenDocumentUploader={handleToggleDocumentPanel}
                />
              </Box>
            </Box>
          )}
        </Box>
        
        {/* Notificações */}
        <Snackbar 
          open={alertInfo.open} 
          autoHideDuration={alertInfo.autoHideDuration} 
          onClose={handleCloseAlert}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          sx={{ mb: 1 }}
        >
          <Alert 
            onClose={handleCloseAlert} 
            severity={alertInfo.severity} 
            sx={{ width: '100%' }}
            action={alertInfo.action}
          >
            {alertInfo.message}
          </Alert>
        </Snackbar>
        
        {/* Overlay de carregamento */}
        <Backdrop
          sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
          open={isLoading}
        >
          <CircularProgress color="inherit" />
          <Typography sx={{ ml: 2, color: 'white' }}>
            Carregando...
          </Typography>
        </Backdrop>

        {/* Drawer de visualização */}
        <VisualizationDrawer
          open={isDrawerOpen}
          onClose={closeDrawer}
          visualization={activeVisualization}
          conversationId={currentConversation?.conversation_id}
        />
      </Box>
    </ClickAwayListener>
  );
};

export default ChatContainer;