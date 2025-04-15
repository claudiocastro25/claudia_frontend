import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Snackbar,
  Alert,
  Backdrop,
  CircularProgress,
  useTheme,
  useMediaQuery,
  ClickAwayListener
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

/**
 * Componente principal do container de chat
 * Refatorado para utilizar os contextos e dividido em subcomponentes
 */
const ChatContainer = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const { currentUser } = useAuth();
  
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
      
      try {
        setIsLoading(true);
        clearError();
        
        const response = await getConversation(currentConversation.conversation_id);
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
        
        // Atualizar contextos
        setConversation(currentConversation.conversation_id);
        setVisualizationConversation(currentConversation.conversation_id);
        
        // Carregar documentos e visualizações para esta conversa
        loadConversationDocuments(currentConversation.conversation_id);
        loadVisualizations();
        
        // Atualizar documentos ativos
        const docsResponse = getActiveConversationDocuments();
        setActiveDocuments(docsResponse || []);
        
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
      
      // Definir conversa nos contextos
      setConversation(newConversation.conversation_id);
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
      
      return newConversation;
    } catch (error) {
      handleError(error, 'Erro ao criar conversa');
      setAlertInfo({
        open: true,
        message: 'Não foi possível criar a conversa ou enviar a mensagem',
        severity: 'error'
      });
      throw error;
    } finally {
      setIsTyping(false);
    }
  };
  
  // Enviar mensagem para conversa existente
  const sendMessageToConversation = async (conversationId, content) => {
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
  };
  
  // Iniciar nova conversa
  const handleNewChat = () => {
    setCurrentConversation(null);
    setMessages([]);
    setIsNewChat(true);
    setActiveDocuments([]);
    setDocumentReferences({});
    setConversation(null);
    setVisualizationConversation(null);
    
    // Fechar sidebar no mobile
    if (isMobile && sidebarExpanded) {
      setSidebarExpanded(false);
    }
  };
  
  // Selecionar conversa existente
  const handleSelectConversation = (conversation) => {
    setCurrentConversation(conversation);
    
    // Fechar sidebar no mobile
    if (isMobile && sidebarExpanded) {
      setSidebarExpanded(false);
    }
  };
  
  // Manipular prompt selecionado
  const handlePromptSelected = async (prompt) => {
    if (!prompt || prompt.trim() === '') return;
    
    try {
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
  
  // Renderizar conteúdo principal
  const renderContent = () => {
    if (isNewChat) {
      return (
        <ClaudiaWelcomeScreen 
          onStartChat={handleNewChat} 
          onPromptSelected={handlePromptSelected} 
          onUpload={() => fileInputRef.current?.click()}
          processorAvailable={processorStatus.available}
          sidebarWidth={280}
          sidebarExpanded={sidebarExpanded}
        />
      );
    }

    return (
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
    );
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
        
        {/* Conteúdo principal */}
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