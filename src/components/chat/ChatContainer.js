import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  CircularProgress,
  Snackbar,
  Alert,
  Backdrop,
  useTheme,
  useMediaQuery,
  Fade,
  ClickAwayListener
} from '@mui/material';
import { alpha } from '@mui/material/styles';

// Components
import ClaudiaSidebar from '../layout/ClaudiaSidebar';
import MessageItem from './MessageItem';
import MessageInput from './MessageInput';
import ClaudiaWelcomeScreen from './ClaudiaWelcomeScreen';
import DocumentPanel from '../documents/DocumentPanel';
import DataVisualization from '../visualization/DataVisualization';
import VisualizationContainer from '../visualization/VisualizationContainer';
import VisualizationDrawer from '../visualization/VisualizationDrawer';
import ProcessingFeedback from '../documents/ProcessingFeedback';

// Services
import { createConversation, getConversations, getConversation, sendMessage } from '../../services/chatService';
import { 
  checkDocumentProcessorHealth, 
  uploadDocument, 
  pollDocumentStatus,
  getUserDocuments
} from '../../services/documentService';
import { useAuth } from '../../contexts/AuthContext';

// Hooks para RAG e Visualização
import { useRAG } from '../../hooks/useRAG';
import { useDocuments } from '../../hooks/useDocuments';
import { useVisualization } from '../../hooks/useVisualization';

// Função auxiliar para extrair a conversa de diferentes estruturas de resposta
const extractConversationFromResponse = (response) => {
  if (!response) return null;
  
  // Caso 1: { data: { conversation: {...} } }
  if (response.data?.conversation) {
    return response.data.conversation;
  }
  
  // Caso 2: { data: { data: { conversation: {...} } } }
  if (response.data?.data?.conversation) {
    return response.data.data.conversation;
  }
  
  // Caso 3: Adaptador que coloca em { data: { data: { ... } } }
  if (response.data?.data) {
    // Se conversation_id estiver diretamente em data
    if (response.data.data.conversation_id) {
      return response.data.data;
    }
  }

  // Caso 4: Adaptador que remove o nível intermediário
  if (response.conversation_id) {
    return response;
  }
  
  console.error('Estrutura de resposta não reconhecida:', response);
  return null;
};

// Função auxiliar para extrair mensagens de diferentes estruturas de resposta
const extractMessagesFromResponse = (response) => {
  if (!response) return [];

  // Caso 1: { data: { messages: [...] } }
  if (response.data?.messages) {
    return response.data.messages;
  }
  
  // Caso 2: { data: { data: { messages: [...] } } }
  if (response.data?.data?.messages) {
    return response.data.data.messages;
  }
  
  // Caso 3: Adaptador que coloca as mensagens diretamente em data
  if (Array.isArray(response.data)) {
    return response.data;
  }
  
  console.error('Estrutura de resposta de mensagens não reconhecida:', response);
  return [];
};

const ChatContainer = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const { currentUser } = useAuth();
  
  // Refs
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const documentPanelRef = useRef(null);
  const containerRef = useRef(null); // Ref para o container principal
  
  // State
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
  const [showVisualization, setShowVisualization] = useState(false);
  const [visualizationData, setVisualizationData] = useState(null);
  
  // Notification state
  const [alertInfo, setAlertInfo] = useState({ 
    open: false, 
    message: '', 
    severity: 'info',
    action: null,
    autoHideDuration: 6000
  });
  
  // Document processor status
  const [processorStatus, setProcessorStatus] = useState({ 
    available: false, 
    checked: false,
    message: 'Verificando disponibilidade do processador de documentos...'
  });
  
  // Upload status
  const [uploadStatus, setUploadStatus] = useState({
    active: false,
    documentId: null,
    filename: null,
    error: null,
    progress: 0,
    status: null
  });
  
  // Hooks de RAG e visualização
  const { 
    searchRelevantContext, 
    processAssistantResponse, 
    documentContext, 
    isSearching,
    referenceInfo,
    sourceDocuments
  } = useRAG(currentConversation?.conversation_id);
  
  const {
    documents,
    loadDocuments,
    uploadDocument: uploadDocumentHook,
    viewDocument,
    getProcessingMessage
  } = useDocuments(currentConversation?.conversation_id);
  
  const {
    processMessageForVisualizations,
    extractVisualizationFromMessage,
    visualizations,
    activeVisualization,
    isDrawerOpen,
    openVisualization,
    closeDrawer,
    loadVisualizations
  } = useVisualization(currentConversation?.conversation_id);

  // Função para lidar com clique fora da sidebar quando ela está expandida
  const handleClickAway = (event) => {
    if (sidebarExpanded && isMobile) {
      // Verificar se o clique não foi dentro da sidebar
      const sidebarElement = document.querySelector('[data-testid="claudia-sidebar"]');
      if (sidebarElement && !sidebarElement.contains(event.target)) {
        setSidebarExpanded(false);
      }
    }
  };

  // Load conversations on component mount
  useEffect(() => {
    const loadConversations = async () => {
      try {
        setIsLoading(true);
        const response = await getConversations();
        
        // Extrair conversas da resposta
        let conversationsData = [];
        if (response.data?.conversations) {
          conversationsData = response.data.conversations;
        } else if (response.data?.data?.conversations) {
          conversationsData = response.data.data.conversations;
        } else {
          console.warn('Formato de resposta inesperado para conversas:', response);
        }
        
        setConversations(conversationsData || []);
        
        // Check document processor health
        checkProcessorHealth();
      } catch (error) {
        console.error('Erro ao carregar conversas:', error);
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
  }, [currentUser]);
  
  // Load messages when conversation changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!currentConversation) return;
      
      try {
        setIsLoading(true);
        const response = await getConversation(currentConversation.conversation_id);
        
        // Extrair mensagens da resposta
        const messagesData = extractMessagesFromResponse(response) || [];
        
        setMessages(messagesData);
        setIsNewChat(false);
        
        // Load document references
        const newReferences = {};
        messagesData.forEach(message => {
          if (message.referenced_documents && message.referenced_documents.length > 0) {
            newReferences[message.message_id] = message.referenced_documents;
          }
        });
        setDocumentReferences(newReferences);
        
        // Load documents associated with the conversation
        loadAssociatedDocuments(currentConversation.conversation_id);
        
        // Load visualizations for this conversation
        if (typeof loadVisualizations === 'function') {
          loadVisualizations();
        }
      } catch (error) {
        console.error('Erro ao carregar mensagens:', error);
        
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
            if (conversationsResponse && conversationsResponse.data) {
              setConversations(conversationsResponse.data.conversations || []);
            }
          } catch (convError) {
            console.error('Erro ao atualizar lista de conversas:', convError);
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
  }, [currentConversation, loadVisualizations]);
  
  // Load documents associated with a conversation
  const loadAssociatedDocuments = async (conversationId) => {
    try {
      const response = await getUserDocuments(conversationId);
      if (response.status === 'success' && response.data) {
        const documents = response.data.documents || [];
        
        // Update active documents
        const activeDocumentsData = documents.filter(doc => doc.status === 'completed');
        setActiveDocuments(activeDocumentsData);
      }
    } catch (error) {
      console.error('Erro ao carregar documentos associados:', error);
    }
  };
  
  // Check document processor health
  const checkProcessorHealth = async () => {
    try {
      const healthStatus = await checkDocumentProcessorHealth();
      setProcessorStatus({ 
        available: healthStatus.status === 'available',
        checked: true,
        message: healthStatus.message
      });
    } catch (error) {
      console.error('Erro ao verificar estado do processador de documentos:', error);
      setProcessorStatus({ 
        available: false, 
        checked: true,
        message: 'Serviço de processamento indisponível'
      });
    }
  };
  
  // Scroll to the end of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);
  
  // Handle document view
  const handleViewDocument = (documentId) => {
    if (!isDocumentPanelOpen) {
      setIsDocumentPanelOpen(true);
    }
    
    if (documentPanelRef.current) {
      documentPanelRef.current.focusDocument(documentId);
    }
  };
  
  // Create a new conversation with an initial message
  const createNewConversationWithMessage = async (content) => {
    try {
      setIsTyping(true);
      
      // Recolher a sidebar no mobile quando iniciar uma nova conversa
      if (isMobile && sidebarExpanded) {
        setSidebarExpanded(false);
      }
      
      // Buscar contexto relevante dos documentos (RAG)
      let contextData = null;
      if (activeDocuments.length > 0 && typeof searchRelevantContext === 'function') {
        contextData = await searchRelevantContext(content);
      }
      
      // Create conversation
      let title = content.length > 30 
        ? `${content.substring(0, 30)}...` 
        : content;
        
      if (title.length < 10) {
        title = "Nova conversa";
      }
      
      const conversationResponse = await createConversation(title);
      
      // Verificar e extrair a resposta da conversa
      if (!conversationResponse || !conversationResponse.data) {
        throw new Error('Falha ao criar nova conversa - resposta inválida');
      }
      
      const newConversation = conversationResponse.data?.conversation || conversationResponse.data;
      
      if (!newConversation || !newConversation.conversation_id) {
        console.error('Resposta de conversa inválida:', conversationResponse);
        throw new Error('Falha ao criar nova conversa - ID da conversa não encontrado');
      }
      
      // Update state
      setCurrentConversation(newConversation);
      setConversations(prev => [newConversation, ...prev]);
      setIsNewChat(false);
      
      // Add temporary user message
      const tempUserMessage = {
        message_id: `temp-${Date.now()}`,
        conversation_id: newConversation.conversation_id,
        content,
        role: 'user',
        created_at: new Date().toISOString()
      };
      
      setMessages([tempUserMessage]);
      
      // Send message to server with document context
      const messageResponse = await sendMessage(
        newConversation.conversation_id, 
        content,
        contextData?.context
      );
      
      // Update messages with server response
      if (messageResponse && messageResponse.data) {
        // Extrair mensagens da resposta
        let userMessage, assistantMessage;
        
        if (messageResponse.data.userMessage && messageResponse.data.assistantMessage) {
          // Formato padrão
          ({ userMessage, assistantMessage } = messageResponse.data);
        } else if (messageResponse.data?.data?.userMessage && messageResponse.data?.data?.assistantMessage) {
          // Formato adaptado
          ({ userMessage, assistantMessage } = messageResponse.data.data);
        } else {
          console.warn('Formato de resposta não reconhecido:', messageResponse);
          userMessage = tempUserMessage;
          assistantMessage = {
            message_id: `fallback-${Date.now()}`,
            conversation_id: newConversation.conversation_id,
            content: 'Não foi possível processar a resposta do assistente.',
            role: 'assistant',
            created_at: new Date().toISOString()
          };
        }
        
        // Capture document references
        if (assistantMessage.referenced_documents && assistantMessage.referenced_documents.length > 0) {
          setDocumentReferences(prev => ({
            ...prev,
            [assistantMessage.message_id]: assistantMessage.referenced_documents
          }));
        }
        
        setMessages([userMessage, assistantMessage]);
        
        // Process assistant response for RAG references
        if (typeof processAssistantResponse === 'function') {
          processAssistantResponse(assistantMessage.content);
        }
        
        // Check for visualization data in the assistant's message
        if (typeof processMessageForVisualizations === 'function') {
          const vizResult = processMessageForVisualizations(
            assistantMessage.content,
            assistantMessage.message_id
          );
          
          if (vizResult && vizResult.hasVisualization) {
            setVisualizationData(vizResult.visualization);
            setShowVisualization(true);
          }
        }
      }
      
      return newConversation;
    } catch (error) {
      console.error('Erro ao criar conversa:', error);
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
  
  // Send a message to an existing conversation
  const sendMessageToConversation = async (conversationId, content) => {
    try {
      setIsTyping(true);
      
      // Buscar contexto relevante dos documentos (RAG)
      let contextData = null;
      if (activeDocuments.length > 0 && typeof searchRelevantContext === 'function') {
        contextData = await searchRelevantContext(content);
      }
      
      // Add temporary user message
      const tempUserMessage = {
        message_id: `temp-${Date.now()}`,
        conversation_id: conversationId,
        content,
        role: 'user',
        created_at: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, tempUserMessage]);
      
      // Send message to server with document context
      const response = await sendMessage(
        conversationId, 
        content,
        contextData?.context
      );
      
      // Update messages with server response
      if (response && response.data) {
        // Extrair mensagens da resposta
        let userMessage, assistantMessage;
        
        if (response.data.userMessage && response.data.assistantMessage) {
          // Formato padrão
          ({ userMessage, assistantMessage } = response.data);
        } else if (response.data?.data?.userMessage && response.data?.data?.assistantMessage) {
          // Formato adaptado
          ({ userMessage, assistantMessage } = response.data.data);
        } else {
          console.warn('Formato de resposta de mensagem não reconhecido:', response);
          userMessage = tempUserMessage;
          assistantMessage = {
            message_id: `fallback-${Date.now()}`,
            conversation_id: conversationId,
            content: 'Não foi possível processar a resposta do assistente.',
            role: 'assistant',
            created_at: new Date().toISOString()
          };
        }
        
        // Capture document references
        if (assistantMessage.referenced_documents && assistantMessage.referenced_documents.length > 0) {
          setDocumentReferences(prev => ({
            ...prev,
            [assistantMessage.message_id]: assistantMessage.referenced_documents
          }));
        }
        
        // Replace temporary message and add response
        setMessages(prev => {
          const filtered = prev.filter(msg => msg.message_id !== tempUserMessage.message_id);
          return [...filtered, userMessage, assistantMessage];
        });
        
        // Process assistant response for RAG references
        if (typeof processAssistantResponse === 'function') {
          processAssistantResponse(assistantMessage.content);
        }
        
        // Check for visualization data in the assistant's message
        if (typeof processMessageForVisualizations === 'function') {
          const vizResult = processMessageForVisualizations(
            assistantMessage.content,
            assistantMessage.message_id
          );
          
          if (vizResult && vizResult.hasVisualization) {
            setVisualizationData(vizResult.visualization);
            setShowVisualization(true);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      
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
          if (conversationsResponse && conversationsResponse.data) {
            setConversations(conversationsResponse.data.conversations || []);
          }
        } catch (convError) {
          console.error('Erro ao atualizar lista de conversas:', convError);
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
  
  // Main handler for sending messages
  const handleSendMessage = async (content) => {
    if (!content || content.trim() === '') return;
    
    try {
      if (isNewChat) {
        // Create new conversation with initial message
        await createNewConversationWithMessage(content);
      } else if (currentConversation) {
        // Send message to existing conversation
        await sendMessageToConversation(currentConversation.conversation_id, content);
      }
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
    }
  };
  
  // Start a new conversation
  const handleNewChat = () => {
    setCurrentConversation(null);
    setMessages([]);
    setIsNewChat(true);
    setActiveDocuments([]);
    setDocumentReferences({});
    setShowVisualization(false);
    setVisualizationData(null);
    
    // Close sidebar on mobile
    if (isMobile && sidebarExpanded) {
      setSidebarExpanded(false);
    }
  };
  
  // Select an existing conversation
  const handleSelectConversation = (conversation) => {
    setCurrentConversation(conversation);
    
    // Close sidebar on mobile
    if (isMobile && sidebarExpanded) {
      setSidebarExpanded(false);
    }
    
    // Reset visualization
    setShowVisualization(false);
    setVisualizationData(null);
  };
  
  // Handle a selected prompt
  const handlePromptSelected = async (prompt) => {
    if (!prompt || prompt.trim() === '') return;
    
    try {
      await createNewConversationWithMessage(prompt);
    } catch (error) {
      console.error('Erro ao processar exemplo:', error);
    }
  };
  
  // Toggle document panel
  const handleToggleDocumentPanel = () => {
    setIsDocumentPanelOpen(!isDocumentPanelOpen);
  };
  
  // Close alert
  const handleCloseAlert = () => {
    setAlertInfo(prev => ({ ...prev, open: false }));
  };
  
  // Handle file selection
  const handleFileSelect = (event) => {
    if (event.target.files && event.target.files.length > 0 && currentConversation) {
      const file = event.target.files[0];
      handleDocumentUpload(file);
    }
  };
  
  // Upload a document
  const handleDocumentUpload = async (file) => {
    if (!file || !currentConversation) return;
    
    // Check processor availability
    if (!processorStatus.available) {
      setAlertInfo({
        open: true,
        message: 'O serviço de processamento de documentos não está disponível no momento.',
        severity: 'warning'
      });
      return;
    }
    
    try {
      // Update state to show progress
      setUploadStatus({
        active: true,
        documentId: null,
        filename: file.name,
        error: null,
        progress: 10,
        status: 'uploading'
      });
      
      // Upload document
      const response = await uploadDocument(file, currentConversation.conversation_id);
      
      // Update progress
      setUploadStatus(prev => ({
        ...prev,
        progress: 40,
        status: 'processing'
      }));
      
      // Get document ID - tentar diferentes estruturas possíveis
      let documentId = null;
      if (response?.documentId) {
        documentId = response.documentId;
      } else if (response?.document_id) {
        documentId = response.document_id;
      } else if (response?.data?.documentId) {
        documentId = response.data.documentId;
      } else if (response?.data?.document_id) {
        documentId = response.data.document_id;
      } else if (response?.data?.data?.documentId) {
        documentId = response.data.data.documentId;
      } else if (response?.data?.data?.document_id) {
        documentId = response.data.data.document_id;
      }
      
      if (!documentId) {
        throw new Error('Não foi possível obter o ID do documento após o upload');
      }
      
      // Update state with document ID
      setUploadStatus(prev => ({
        ...prev,
        documentId,
        progress: 60,
        status: 'analyzing'
      }));
      
      // Poll for document status
      const pollResult = await pollDocumentStatus(documentId);
      
      if (pollResult.success) {
        // Upload complete
        setUploadStatus(prev => ({
          ...prev,
          active: false,
          progress: 100,
          status: 'completed'
        }));
        
        // Show success message
        setAlertInfo({
          open: true,
          message: `Documento "${file.name}" processado com sucesso!`,
          severity: 'success'
        });
        
        // Reload associated documents
        loadAssociatedDocuments(currentConversation.conversation_id);
        
        // Add informational message to conversation
        await sendMessageToConversation(
          currentConversation.conversation_id, 
          `Documento carregado: ${file.name}. Agora você pode me fazer perguntas sobre ele.`
        );
      } else {
        // Error in processing
        setUploadStatus(prev => ({
          ...prev,
          status: 'error'
        }));
        throw new Error(pollResult.error || 'Erro durante o processamento do documento');
      }
    } catch (error) {
      console.error('Erro no upload do documento:', error);
      
      // Update state with error
      setUploadStatus({
        active: false,
        documentId: null,
        filename: file.name,
        error: error.message || 'Erro desconhecido',
        progress: 0,
        status: 'error'
      });
      
      // Show error message
      setAlertInfo({
        open: true,
        message: `Erro ao processar "${file.name}": ${error.message || 'Erro desconhecido'}`,
        severity: 'error'
      });
    }
  };
  
  // Handle upload complete in DocumentPanel
  const handleUploadComplete = (documentId, filename) => {
    // Show notification
    setAlertInfo({
      open: true,
      message: `Documento "${filename}" processado com sucesso!`,
      severity: 'success'
    });
    
    // Reload associated documents
    if (currentConversation) {
      loadAssociatedDocuments(currentConversation.conversation_id);
    }
  };
  
  // Close visualization
  const handleCloseVisualization = () => {
    setShowVisualization(false);
  };
  
  // Render message list
  const MessageList = () => {
    return (
      <Box sx={{ 
        p: { xs: 1.5, md: 3 },
        width: '100%',
        maxWidth: '850px',
        mx: 'auto'
      }}>
        {messages.map((message, index) => (
          <React.Fragment key={message.message_id || `msg-${index}`}>
            <MessageItem 
              message={message}
              documentReferences={documentReferences[message.message_id] || []}
              onViewDocument={handleViewDocument}
            />
          </React.Fragment>
        ))}
        
        {/* Typing indicator */}
        {isTyping && (
          <Box sx={{ 
            display: 'flex', 
            py: 2,
            pl: 2
          }}>
            <Box
              sx={{
                px: 2,
                py: 1,
                borderRadius: '18px',
                backgroundColor: theme.palette.mode === 'dark' 
                  ? alpha(theme.palette.primary.dark, 0.2) 
                  : alpha(theme.palette.primary.light, 0.1),
                width: 'fit-content'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box
                  component="span"
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: theme.palette.primary.main,
                    display: 'inline-block',
                    marginRight: '3px',
                    animation: 'pulse 1s infinite',
                    '@keyframes pulse': {
                      '0%, 100%': {
                        transform: 'scale(1)',
                      },
                      '50%': {
                        transform: 'scale(1.2)',
                      },
                    },
                  }}
                />
                <Box
                  component="span"
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: theme.palette.primary.main,
                    display: 'inline-block',
                    marginRight: '3px',
                    animation: 'pulse 1s infinite',
                    animationDelay: '0.2s',
                  }}
                />
                <Box
                  component="span"
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: theme.palette.primary.main,
                    display: 'inline-block',
                    animation: 'pulse 1s infinite',
                    animationDelay: '0.4s',
                  }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  Assistente está escrevendo...
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
        
        <div ref={messagesEndRef} />
      </Box>
    );
  };
  
  // Main content rendering
  const renderContent = () => {
    if (isNewChat) {
      return (
        <ClaudiaWelcomeScreen 
          onStartChat={handleNewChat} 
          onPromptSelected={handlePromptSelected} 
          onUpload={() => fileInputRef.current?.click()}
          processorAvailable={processorStatus.available}
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
        {/* Chat area */}
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
          {/* Message list */}
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
            {/* Visualização de processamento de documentos */}
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
            
            {/* Visualization */}
            {showVisualization && visualizationData && (
              <Fade in={showVisualization}>
                <Box sx={{ p: 2 }}>
                  <VisualizationContainer 
                    data={visualizationData.data}
                    type={visualizationData.type || 'bar'}
                    title={visualizationData.title || "Visualização de Dados"}
                    options={visualizationData.options || {}}
                  />
                </Box>
              </Fade>
            )}
            
            {/* Messages */}
            <MessageList />
          </Box>
          
          {/* Document panel */}
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
        
        {/* Message input */}
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
        {/* Hidden file input */}
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
          alwaysShowExpandButton={true}  // Adicionado para sempre mostrar o botão de expandir
        />
        
        {/* Main content */}
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
        
        {/* Notifications */}
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
        
        {/* Loading overlay */}
        <Backdrop
          sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
          open={isLoading}
        >
          <CircularProgress color="inherit" />
        </Backdrop>

        {/* Visualization Drawer */}
        <VisualizationDrawer
          open={showVisualization}
          onClose={() => setShowVisualization(false)}
          customVisualizations={visualizationData ? [visualizationData] : null}
          conversationId={currentConversation?.conversation_id}
          messageId={visualizationData?.messageId}
        />
      </Box>
    </ClickAwayListener>
  );
};

export default ChatContainer;