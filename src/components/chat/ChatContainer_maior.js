import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Box, 
  Snackbar,
  Alert,
  Backdrop,
  CircularProgress,
  useTheme,
  useMediaQuery,
  ClickAwayListener,
  Typography,
  Fade
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
import { 
  createConversation, 
  getConversations, 
  getConversation, 
  sendMessage, 
  clearConversationCache 
} from '../../services/chatService';
import { extractConversationsFromResponse, extractMessagesFromResponse } from '../../utils/apiHelpers';
import { useErrorHandler } from '../../hooks/useErrorHandler';

// Constantes
import { DOCUMENT_STATUS } from '../../constants/documentStatus';

/**
 * Hook personalizado para limitar a frequência de chamadas
 */
const useThrottle = (callback, delay) => {
  const lastCall = useRef(0);
  const timeoutRef = useRef(null);
  
  return useCallback((...args) => {
    const now = Date.now();
    const elapsed = now - lastCall.current;
    
    if (elapsed >= delay) {
      lastCall.current = now;
      callback(...args);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        lastCall.current = Date.now();
        callback(...args);
      }, delay - elapsed);
    }
  }, [callback, delay]);
};

/**
 * Componente principal do container de chat
 * Totalmente otimizado e com UI/UX aprimorada
 */
const ChatContainer = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const { currentUser } = useAuth();
  
  // Refs para rastreamento de estado
  const previousConversationId = useRef(null);
  const isMounted = useRef(true);
  const conversationLoadInProgress = useRef(false);
  
  // Contextos
  const { 
    uploadDocument,
    processorStatus,
    viewDocument,
    uploadStatus,
    loadConversationDocuments,
    getActiveConversationDocuments,
    setConversation: setDocumentConversation
  } = useDocumentContext();
  
  const {
    processMessageForVisualizations,
    openVisualization,
    isDrawerOpen,
    activeVisualization,
    setConversation: setVisualizationConversation,
    loadVisualizations,
    closeDrawer,
    isLoadingVisualizations
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
  
  // Efeito de cleanup quando componente desmonta
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Função para lidar com clique fora da sidebar
  const handleClickAway = useCallback((event) => {
    if (sidebarExpanded && isMobile) {
      const sidebarElement = document.querySelector('[data-testid="claudia-sidebar"]');
      if (sidebarElement && !sidebarElement.contains(event.target)) {
        setSidebarExpanded(false);
      }
    }
  }, [sidebarExpanded, isMobile]);

  // Função para carregar conversas limitada por throttle
  const loadConversationsThrottled = useThrottle(async () => {
    if (!currentUser || !isMounted.current) return;
    
    try {
      setIsLoading(true);
      clearError();
      
      const response = await getConversations();
      
      if (!isMounted.current) return;
      
      const conversationsData = extractConversationsFromResponse(response);
      
      setConversations(conversationsData || []);
    } catch (error) {
      if (!isMounted.current) return;
      
      handleError(error, 'Não foi possível carregar o histórico de conversas');
      setAlertInfo({
        open: true,
        message: 'Não foi possível carregar o histórico de conversas',
        severity: 'error'
      });
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, 1000);

  // Carregar conversas ao montar o componente
  useEffect(() => {
    if (currentUser) {
      loadConversationsThrottled();
    }
  }, [currentUser, loadConversationsThrottled]);
  
  // Função para carregar mensagens de uma conversa
  const loadMessages = useCallback(async (conversationId) => {
    if (!conversationId || conversationLoadInProgress.current) return;
    
    // Verificar se a conversa já está carregada
    if (previousConversationId.current === conversationId && messages.length > 0) {
      return;
    }
    
    conversationLoadInProgress.current = true;
    
    try {
      setIsLoading(true);
      clearError();
      
      const response = await getConversation(conversationId);
      
      if (!isMounted.current) return;
      
      const messagesData = extractMessagesFromResponse(response) || [];
      
      setMessages(messagesData);
      setIsNewChat(false);
      
      // Carregar referências de documentos
      const newReferences = {};
      messagesData.forEach(message => {
        if (message.referenced_documents && message.referenced_documents.length > 0) {
          newReferences[message.message_id] = message.referenced_documents;
        }
      });
      
      setDocumentReferences(newReferences);
      
      // Atualizar contextos (apenas se necessário)
      if (previousConversationId.current !== conversationId) {
        setDocumentConversation(conversationId);
        setVisualizationConversation(conversationId);
        
        // Carregar documentos e visualizações uma única vez por conversa
        loadConversationDocuments(conversationId);
        loadVisualizations();
        
        // Atualizar documentos ativos
        const docsResponse = getActiveConversationDocuments();
        setActiveDocuments(docsResponse || []);
        
        // Atualizar referência
        previousConversationId.current = conversationId;
      }
      
    } catch (error) {
      if (!isMounted.current) return;
      
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
        previousConversationId.current = null;
        
        // Atualizar lista de conversas
        loadConversationsThrottled();
      } else {
        // Erro normal
        setAlertInfo({
          open: true,
          message: 'Não foi possível carregar as mensagens desta conversa',
          severity: 'error'
        });
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
      conversationLoadInProgress.current = false;
    }
  }, [
    clearError, 
    getActiveConversationDocuments, 
    handleError, 
    loadConversationDocuments, 
    loadConversationsThrottled, 
    loadVisualizations, 
    messages.length, 
    setDocumentConversation, 
    setVisualizationConversation
  ]);
  
  // Carregar mensagens quando a conversa muda
  useEffect(() => {
    if (currentConversation && currentConversation.conversation_id) {
      loadMessages(currentConversation.conversation_id);
    }
  }, [currentConversation, loadMessages]);
  
  // Manipulador para visualizar documento
  const handleViewDocument = useCallback((documentId) => {
    if (!isDocumentPanelOpen) {
      setIsDocumentPanelOpen(true);
    }
    
    if (documentPanelRef.current) {
      documentPanelRef.current.focusDocument(documentId);
    } else {
      viewDocument(documentId);
    }
  }, [isDocumentPanelOpen, viewDocument]);
  
  // Criar nova conversa com mensagem inicial
  const createNewConversationWithMessage = useCallback(async (content) => {
    if (!content.trim() || isTyping) return null;
    
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
      
      // Criar conversa
      const conversationResponse = await createConversation(title);
      
      if (!isMounted.current) return null;
      
      if (!conversationResponse || !conversationResponse.data) {
        throw new Error('Falha ao criar nova conversa - resposta inválida');
      }
      
      const newConversation = conversationResponse.data?.conversation || conversationResponse.data;
      
      if (!newConversation || !newConversation.conversation_id) {
        throw new Error('Falha ao criar nova conversa - ID da conversa não encontrado');
      }
      
      // Atualizar estado
      setCurrentConversation(newConversation);
      setConversations(prev => [newConversation, ...prev]);
      setIsNewChat(false);
      previousConversationId.current = newConversation.conversation_id;
      
      // Definir conversa nos contextos
      setDocumentConversation(newConversation.conversation_id);
      setVisualizationConversation(newConversation.conversation_id);
      
      // Adicionar mensagem temporária do usuário
      const tempUserMessage = {
        message_id: `temp-${Date.now()}`,
        conversation_id: newConversation.conversation_id,
        content,
        role: 'user',
        created_at: new Date().toISOString()
      };
      
      setMessages([tempUserMessage]);
      
      // Enviar mensagem para o servidor
      const messageResponse = await sendMessage(
        newConversation.conversation_id, 
        content
      );
      
      if (!isMounted.current) return null;
      
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
            conversation_id: newConversation.conversation_id,
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
        }
        
        setMessages([userMessage, assistantMessage]);
        
        // Verificar visualizações na mensagem do assistente
        if (typeof processMessageForVisualizations === 'function') {
          const vizResult = processMessageForVisualizations(
            assistantMessage.content,
            assistantMessage.message_id
          );
          
          if (vizResult && vizResult.hasVisualization) {
            openVisualization(vizResult.visualization);
          }
        }
      }
      
      // Limpar cache de conversas para garantir dados atualizados
      clearConversationCache(newConversation.conversation_id);
      
      return newConversation;
    } catch (error) {
      if (!isMounted.current) return null;
      
      handleError(error, 'Erro ao criar conversa');
      setAlertInfo({
        open: true,
        message: 'Não foi possível criar a conversa ou enviar a mensagem',
        severity: 'error'
      });
      return null;
    } finally {
      if (isMounted.current) {
        setIsTyping(false);
      }
    }
  }, [
    isTyping, 
    clearError, 
    isMobile, 
    sidebarExpanded, 
    setDocumentConversation, 
    setVisualizationConversation, 
    processMessageForVisualizations, 
    openVisualization, 
    handleError
  ]);
  
  // Enviar mensagem para conversa existente
  const sendMessageToConversation = useCallback(async (conversationId, content) => {
    if (!conversationId || !content.trim() || isTyping) return;
    
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
      
      if (!isMounted.current) return;
      
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
        }
        
        // Substituir mensagem temporária e adicionar resposta
        setMessages(prev => {
          const filtered = prev.filter(msg => msg.message_id !== tempUserMessage.message_id);
          return [...filtered, userMessage, assistantMessage];
        });
        
        // Verificar visualizações na mensagem do assistente
        if (typeof processMessageForVisualizations === 'function') {
          const vizResult = processMessageForVisualizations(
            assistantMessage.content,
            assistantMessage.message_id
          );
          
          if (vizResult && vizResult.hasVisualization) {
            openVisualization(vizResult.visualization);
          }
        }
        
        // Limpar cache da conversa para garantir dados atualizados
        clearConversationCache(conversationId);
      }
    } catch (error) {
      if (!isMounted.current) return;
      
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
        previousConversationId.current = null;
        
        // Atualizar lista de conversas
        loadConversationsThrottled();
      } else {
        // Erro normal
        setAlertInfo({
          open: true,
          message: 'Não foi possível enviar a mensagem',
          severity: 'error'
        });
      }
    } finally {
      if (isMounted.current) {
        setIsTyping(false);
      }
    }
  }, [
    isTyping, 
    clearError, 
    processMessageForVisualizations, 
    openVisualization, 
    handleError, 
    loadConversationsThrottled
  ]);
  
  // Manipulador principal para envio de mensagens
  const handleSendMessage = useCallback(async (content) => {
    if (!content || content.trim() === '') return;
    
    try {
      if (isNewChat) {
        // Criar nova conversa com mensagem inicial
        await createNewConversationWithMessage(content);
      } else if (currentConversation) {
        // Enviar mensagem para conversa existente
        await sendMessageToConversation(currentConversation.conversation_id, content);
      }
    } catch (error) {
      handleError(error, 'Erro ao processar mensagem');
    }
  }, [
    isNewChat, 
    currentConversation, 
    createNewConversationWithMessage, 
    sendMessageToConversation, 
    handleError
  ]);
  
  // Iniciar nova conversa
  const handleNewChat = useCallback(() => {
    setCurrentConversation(null);
    setMessages([]);
    setIsNewChat(true);
    setActiveDocuments([]);
    setDocumentReferences({});
    setDocumentConversation(null);
    setVisualizationConversation(null);
    previousConversationId.current = null;
    
    // Fechar sidebar no mobile
    if (isMobile && sidebarExpanded) {
      setSidebarExpanded(false);
    }
  }, [isMobile, sidebarExpanded, setDocumentConversation, setVisualizationConversation]);
  
  // Selecionar conversa existente
  const handleSelectConversation = useCallback((conversation) => {
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
    
    // Fechar sidebar no mobile
    if (isMobile && sidebarExpanded) {
      setSidebarExpanded(false);
    }
  }, [currentConversation, isMobile, sidebarExpanded]);
  
  // Manipular prompt selecionado
  const handlePromptSelected = useCallback(async (prompt) => {
    if (!prompt || prompt.trim() === '') return;
    
    try {
      await createNewConversationWithMessage(prompt);
    } catch (error) {
      handleError(error, 'Erro ao processar exemplo');
    }
  }, [createNewConversationWithMessage, handleError]);
  
  // Alternar painel de documentos
  const handleToggleDocumentPanel = useCallback(() => {
    setIsDocumentPanelOpen(!isDocumentPanelOpen);
  }, [isDocumentPanelOpen]);
  
  // Fechar alerta
  const handleCloseAlert = useCallback(() => {
    setAlertInfo(prev => ({ ...prev, open: false }));
  }, []);
  
  // Manipular seleção de arquivo
  const handleFileSelect = useCallback((event) => {
    if (event.target.files && event.target.files.length > 0 && currentConversation) {
      const file = event.target.files[0];
      handleDocumentUpload(file);
    }
  }, [currentConversation]);
  
  // Upload de documento
  const handleDocumentUpload = useCallback(async (file) => {
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
      
      if (!isMounted.current) return;
      
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
      if (!isMounted.current) return;
      
      handleError(error, `Erro ao processar "${file.name}"`);
      
      setAlertInfo({
        open: true,
        message: `Erro ao processar "${file.name}": ${error.message || 'Erro desconhecido'}`,
        severity: 'error'
      });
    }
  }, [
    currentConversation, 
    processorStatus.available, 
    uploadDocument, 
    loadConversationDocuments, 
    sendMessageToConversation, 
    handleError
  ]);
  
  // Manipular upload concluído no DocumentPanel
  const handleUploadComplete = useCallback((documentId, filename) => {
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
  }, [currentConversation, loadConversationDocuments]);
  
  // Estilo de transição suave para componentes
  const fadeTransition = useMemo(() => ({
    enter: {
      opacity: 0,
      transform: 'translateY(10px)'
    },
    enterActive: {
      opacity: 1,
      transform: 'translateY(0)',
      transition: 'opacity 0.2s ease-out, transform 0.2s ease-out'
    },
    exit: {
      opacity: 0,
      transform: 'translateY(10px)',
      transition: 'opacity 0.2s ease-in, transform 0.2s ease-in'
    }
  }), []);
  
  // Renderizar conteúdo principal
  const renderContent = useCallback(() => {
    if (isNewChat) {
      return (
        <Fade in={true} timeout={400}>
          <Box>
            <ClaudiaWelcomeScreen 
              onStartChat={handleNewChat} 
              onPromptSelected={handlePromptSelected} 
              onUpload={() => fileInputRef.current?.click()}
              processorAvailable={processorStatus.available}
              sidebarWidth={280}
              sidebarExpanded={sidebarExpanded}
            />
          </Box>
        </Fade>
      );
    }

    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.2s ease-in-out'
        }}
        component={Fade}
        in={true}
        timeout={300}
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
              : alpha(theme.palette.grey[50], 0.8),
            transition: 'background-color 0.3s ease'
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
              flexDirection: 'column',
              transition: 'padding 0.3s ease'
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
                boxShadow: isSmall ? 24 : 'none',
                transition: 'width 0.3s ease, box-shadow 0.3s ease'
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
    );
  }, [
    isNewChat,
    sidebarExpanded,
    handleNewChat,
    handlePromptSelected,
    processorStatus.available,
    currentConversation,
    activeDocuments.length,
    messages.length,
    handleToggleDocumentPanel,
    theme.palette.mode,
    theme.palette.background.paper,
    theme.palette.grey,
    isDocumentPanelOpen,
    isSmall,
    uploadStatus.active,
    uploadStatus.status,
    uploadStatus.progress,
    uploadStatus.filename,
    uploadStatus.error,
    isTyping,
    documentReferences,
    handleViewDocument,
    handleFileSelect,
    isLoading,
    handleSendMessage,
    handleDocumentUpload,
    handleUploadComplete
  ]);
  
  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <Box 
        ref={containerRef}
        sx={{ 
          height: '100vh', 
          display: 'flex', 
          bgcolor: theme.palette.background.default,
          position: 'relative',
          overflow: 'hidden'
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
        
        {/* Conteúdo principal */}
        <Box
          component="main"
          sx={{ 
            flexGrow: 1, 
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
            position: 'relative',
            transition: 'all 0.3s ease'
          }}
        >
          {renderContent()}
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
            sx={{ 
              width: '100%',
              boxShadow: 4,
              borderRadius: 2
            }}
            action={alertInfo.action}
          >
            {alertInfo.message}
          </Alert>
        </Snackbar>
        
        {/* Overlay de carregamento */}
        <Backdrop
          sx={{ 
            color: '#fff', 
            zIndex: (theme) => theme.zIndex.drawer + 1,
            backdropFilter: 'blur(3px)'
          }}
          open={isLoading}
        >
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress color="inherit" size={40} />
            <Typography sx={{ mt: 2, color: 'white', fontWeight: 500 }}>
              Carregando...
            </Typography>
          </Box>
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