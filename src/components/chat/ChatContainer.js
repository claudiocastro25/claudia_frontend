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
  Fade
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

// Services
import { createConversation, getConversations, getConversation, sendMessage } from '../../services/chatService';
import { 
  checkDocumentProcessorHealth, 
  uploadDocument, 
  pollDocumentStatus,
  getUserDocuments
} from '../../services/documentService';
import { useAuth } from '../../contexts/AuthContext';

const ChatContainer = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const { currentUser } = useAuth();
  
  // Refs
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const documentPanelRef = useRef(null);
  
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
    progress: 0
  });
  
  // Load conversations on component mount
  useEffect(() => {
    const loadConversations = async () => {
      try {
        setIsLoading(true);
        const response = await getConversations();
        setConversations(response.data.conversations || []);
        
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
        const messagesData = response.data.messages || [];
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
      } catch (error) {
        console.error('Erro ao carregar mensagens:', error);
        setAlertInfo({
          open: true,
          message: 'Não foi possível carregar as mensagens desta conversa',
          severity: 'error'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    if (currentConversation) {
      loadMessages();
    }
  }, [currentConversation]);
  
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
      
      // Create conversation
      let title = content.length > 30 
        ? `${content.substring(0, 30)}...` 
        : content;
        
      if (title.length < 10) {
        title = "Nova conversa";
      }
      
      const conversationResponse = await createConversation(title);
      
      if (!conversationResponse || !conversationResponse.data || !conversationResponse.data.conversation) {
        throw new Error('Falha ao criar nova conversa');
      }
      
      const newConversation = conversationResponse.data.conversation;
      
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
      
      // Send message to server
      const messageResponse = await sendMessage(newConversation.conversation_id, content);
      
      // Update messages with server response
      if (messageResponse && messageResponse.data) {
        const { userMessage, assistantMessage } = messageResponse.data;
        
        // Capture document references
        if (assistantMessage.referenced_documents && assistantMessage.referenced_documents.length > 0) {
          setDocumentReferences(prev => ({
            ...prev,
            [assistantMessage.message_id]: assistantMessage.referenced_documents
          }));
        }
        
        setMessages([userMessage, assistantMessage]);
        
        // Check for visualization data in the assistant's message
        checkForVisualizationData(assistantMessage.content);
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
      
      // Add temporary user message
      const tempUserMessage = {
        message_id: `temp-${Date.now()}`,
        conversation_id: conversationId,
        content,
        role: 'user',
        created_at: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, tempUserMessage]);
      
      // Send message to server
      const response = await sendMessage(conversationId, content);
      
      // Update messages with server response
      if (response && response.data) {
        const { userMessage, assistantMessage } = response.data;
        
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
        
        // Check for visualization data in the assistant's message
        checkForVisualizationData(assistantMessage.content);
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setAlertInfo({
        open: true,
        message: 'Não foi possível enviar a mensagem',
        severity: 'error'
      });
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
    if (isMobile) {
      setSidebarExpanded(false);
    }
  };
  
  // Select an existing conversation
  const handleSelectConversation = (conversation) => {
    setCurrentConversation(conversation);
    
    // Close sidebar on mobile
    if (isMobile) {
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
        progress: 10
      });
      
      // Upload document
      const response = await uploadDocument(file, currentConversation.conversation_id);
      
      // Update progress
      setUploadStatus(prev => ({
        ...prev,
        progress: 40
      }));
      
      // Get document ID
      const documentId = response?.documentId || response?.document_id || null;
      if (!documentId) {
        throw new Error('Não foi possível obter o ID do documento após o upload');
      }
      
      // Update state with document ID
      setUploadStatus(prev => ({
        ...prev,
        documentId,
        progress: 60
      }));
      
      // Poll for document status
      const pollResult = await pollDocumentStatus(documentId);
      
      if (pollResult.success) {
        // Upload complete
        setUploadStatus(prev => ({
          ...prev,
          active: false,
          progress: 100
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
        progress: 0
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
  
  // Check for visualization data in the assistant's message
  const checkForVisualizationData = (content) => {
    try {
      // Look for JSON data wrapped in visualization markers
      const regex = /```visualization\s*([\s\S]*?)\s*```/;
      const match = content.match(regex);
      
      if (match && match[1]) {
        const dataString = match[1].trim();
        const data = JSON.parse(dataString);
        
        if (Array.isArray(data) && data.length > 0) {
          setVisualizationData(data);
          setShowVisualization(true);
        }
      }
    } catch (error) {
      console.error('Error parsing visualization data:', error);
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
            {/* Visualization */}
            {showVisualization && visualizationData && (
              <Fade in={showVisualization}>
                <Box sx={{ p: 2 }}>
                  <VisualizationContainer 
                    data={visualizationData} 
                    title="Data Visualization"
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
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      bgcolor: theme.palette.background.default 
    }}>
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
        conversations={conversations}
        currentConversation={currentConversation}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onLogout={() => {
          // Handle logout
        }}
        onToggleSidebar={() => setSidebarExpanded(!sidebarExpanded)}
        expanded={sidebarExpanded}
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
    </Box>
  );
};

export default ChatContainer;