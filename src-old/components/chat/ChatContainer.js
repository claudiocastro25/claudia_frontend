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
  ClickAwayListener,
  Tooltip,
  Badge,
  Chip,
  Button
} from '@mui/material';
import { alpha } from '@mui/material/styles';

// Components
import ClaudiaSidebar from '../layout/ClaudiaSidebar';
import MessageItem from './MessageItem';
import MessageInput from './MessageInput';
import ClaudiaWelcomeScreen from './ClaudiaWelcomeScreen';
import DocumentPanel from '../documents/DocumentPanel';
import VisualizationContainer from '../visualization/VisualizationContainer';
import VisualizationDrawer from '../visualization/VisualizationDrawer';
import EnhancedProcessingFeedback from '../documents/EnhancedProcessingFeedback';
import DocumentUploader from '../documents/DocumentUploader';
import EnhancedDocumentChip from '../documents/EnhancedDocumentChip';

// Services
import { createConversation, getConversations, getConversation, sendMessage } from '../../services/chatService';
import { 
  checkDocumentProcessorHealth, 
  uploadDocument, 
  pollDocumentStatus,
  getUserDocuments,
  associateDocumentWithConversation
} from '../../services/documentService';
import { useAuth } from '../../contexts/AuthContext';

// Hooks para RAG e Visualização
import { useRAG } from '../../hooks/useRAG';
import { useDocuments } from '../../hooks/useDocuments';
import { useVisualization } from '../../hooks/useVisualization';

// Ícones
import { 
  ArrowUpward as ArrowUpwardIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Check as CheckIcon
} from '@mui/icons-material';

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

// Componente principal
const ChatContainer = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const { currentUser } = useAuth();
  
  // Refs
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const documentPanelRef = useRef(null);
  const containerRef = useRef(null);
  
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
  const [processingDocuments, setProcessingDocuments] = useState([]);
  const [showVisualization, setShowVisualization] = useState(false);
  const [visualizationData, setVisualizationData] = useState(null);
  const [newDocsAvailable, setNewDocsAvailable] = useState(false);
  
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
  
  // Upload status with completion timestamp
  const [uploadStatus, setUploadStatus] = useState({
    active: false,
    documentId: null,
    filename: null,
    error: null,
    progress: 0,
    status: null,
    completedAt: null
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
        
        // Reset new docs notification
        setNewDocsAvailable(false);
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
          setProcessingDocuments([]);
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
  
  // Event listener para explicar ao usuário que um documento foi carregado
  useEffect(() => {
    const handleDocumentExplain = (event) => {
      const { conversationId, documentId, filename, message } = event.detail;
      
      // Verificar se é para a conversa atual
      if (conversationId === currentConversation?.conversation_id) {
        console.log(`Explicando documento carregado: ${documentId} (${filename})`);
        
        // Enviar mensagem informativa ao usuário
        sendMessageToConversation(conversationId, message);
        
        // Forçar recarga dos documentos também
        loadAssociatedDocuments(conversationId);
      }
    };
    
    // Registrar o listener
    window.addEventListener('document-explain-upload', handleDocumentExplain);
    
    // Expor função de envio para componentes filhos
    window.sendMessageToConversation = sendMessageToConversation;
    
    // Limpar ao desmontar
    return () => {
      window.removeEventListener('document-explain-upload', handleDocumentExplain);
      delete window.sendMessageToConversation;
    };
  }, [currentConversation]);
  
  // Função para carregar documentos associados a uma conversa - VERSÃO MELHORADA
  const loadAssociatedDocuments = async (conversationId) => {
    try {
      // Adicionar logs para depuração
      console.log(`Carregando documentos para conversa: ${conversationId}`);
      
      const response = await getUserDocuments(conversationId);
      console.log('Resposta completa de getUserDocuments:', response);
      
      if (response.status === 'success' && response.data) {
        const documents = response.data.documents || [];
        console.log(`Total de documentos encontrados: ${documents.length}`, documents);
        
        // Modificar o modo como processamos os documentos ativos
        if (documents.length > 0) {
          // Mapear para garantir que o campo original_filename seja usado preferencialmente
          const processedDocs = documents.map(doc => ({
            ...doc,
            displayName: doc.original_filename || doc.filename || `Documento ${doc.document_id.slice(0, 8)}`
          }));
          
          // Ativos são apenas os documentos com status completed
          const activeDocumentsData = processedDocs.filter(doc => doc.status === 'completed');
          console.log(`Documentos ativos encontrados: ${activeDocumentsData.length}`, activeDocumentsData);
          
          // Atualizar o estado
          setActiveDocuments(activeDocumentsData);
          
          // Separate processing documents
          const processingDocs = processedDocs.filter(doc => 
            doc.status === 'processing' || doc.status === 'pending'
          );
          setProcessingDocuments(processingDocs);
          
          // Se o DocumentPanel estiver aberto, podemos forçar uma atualização
          if (documentPanelRef.current && typeof documentPanelRef.current.refreshDocuments === 'function') {
            documentPanelRef.current.refreshDocuments();
          }
          
          // Se houver documentos em processamento, verificar novamente em breve
          if (processingDocs.length > 0) {
            console.log(`Há ${processingDocs.length} documentos em processamento, agendando verificação adicional...`);
            
            // Agendar verificação adicional após um tempo
            setTimeout(() => {
              console.log('Executando verificação adicional para documentos em processamento...');
              loadAssociatedDocuments(conversationId);
            }, 5000); // verificar novamente em 5 segundos
          }
        
          // Verificar se encontramos novos documentos concluídos
          if (currentConversation?.conversation_id === conversationId) {
            const prevActiveCount = activeDocuments.length;
            if (activeDocumentsData.length > prevActiveCount) {
              // Temos novos documentos disponíveis!
              setNewDocsAvailable(true);
              
              // Notificação visual
              setAlertInfo({
                open: true,
                message: `${activeDocumentsData.length - prevActiveCount} novo(s) documento(s) disponível(is) para consulta`,
                severity: 'success',
                action: (
                  <Tooltip title="Abrir painel de documentos">
                    <RefreshIcon 
                      sx={{ cursor: 'pointer' }} 
                      onClick={() => setIsDocumentPanelOpen(true)}
                    />
                  </Tooltip>
                )
              });
            }
          }
        } else {
          setActiveDocuments([]);
          setProcessingDocuments([]);
        }
      } else {
        console.warn('Resposta não contém dados ou status não é success:', response);
      }
    } catch (error) {
      console.error('Erro ao carregar documentos associados:', error);
    }
  };
  
  // Event listener para recarregar documentos quando um novo documento for carregado
  useEffect(() => {
    const handleDocumentUploaded = (event) => {
      const { documentId, conversationId, filename, status, delayed } = event.detail;
      
      if (conversationId === currentConversation?.conversation_id) {
        console.log(`Evento de documento carregado detectado: ${documentId}${delayed ? ' (recarregamento adicional)' : ''}`);
        
        // Recarregar a lista de documentos
        loadAssociatedDocuments(conversationId);
        
        // CORREÇÃO: Verificar associação e reforçar se necessário
        try {
          associateDocumentWithConversation(documentId, conversationId)
            .then(() => console.log(`Associação reforçada para documento ${documentId}`))
            .catch(err => console.warn('Erro ao reforçar associação:', err));
        } catch (e) {
          console.warn('Erro ao tentar reforçar associação:', e);
        }
        
        // Mostrar notificação apenas se for um upload concluído e não for um recarregamento atrasado
        if (status === 'completed' && !delayed) {
          setAlertInfo({
            open: true,
            message: `Documento "${filename || 'carregado'}" processado com sucesso!`,
            severity: 'success',
            action: (
              <Button 
                size="small" 
                color="inherit" 
                onClick={() => setIsDocumentPanelOpen(true)}
              >
                Ver Documentos
              </Button>
            )
          });
        }
      }
    };
    
    // Registrar o listener
    window.addEventListener('document-uploaded', handleDocumentUploaded);
    
    // Limpar ao desmontar
    return () => {
      window.removeEventListener('document-uploaded', handleDocumentUploaded);
    };
  }, [currentConversation]);
  
  // Check document processor health
  const checkProcessorHealth = async () => {
    try {
      const healthStatus = await checkDocumentProcessorHealth();
      console.log('Status do processador completo:', healthStatus);
      
      // CORREÇÃO: Usar a propriedade 'available' diretamente em vez de verificar status === 'available'
      setProcessorStatus({ 
        available: healthStatus.available === true,
        checked: true,
        message: healthStatus.message || 'Serviço de processamento disponível'
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
    
    // Reset new docs notification
    setNewDocsAvailable(false);
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
  
  // Send a message to an existing conversation - VERSÃO MELHORADA
  const sendMessageToConversation = async (conversationId, content) => {
    try {
      setIsTyping(true);
      
      // Verificar se a mensagem é sobre documento recém carregado
      const isDocumentMessage = content.includes("Documento carregado:") || 
                               content.includes("foi carregado") ||
                               content.includes("novo documento");
      
      // Buscar contexto relevante dos documentos (RAG)
      let contextData = null;
      if (activeDocuments.length > 0 && typeof searchRelevantContext === 'function') {
        console.log(`Buscando contexto RAG para mensagem: "${content}"`);
        // Para mensagens sobre documentos, forçar recarga antes
        if (isDocumentMessage) {
          await loadAssociatedDocuments(conversationId);
        }
        
        contextData = await searchRelevantContext(content);
        
        if (contextData && contextData.context) {
          console.log(`Contexto RAG encontrado: ${contextData.context.length} caracteres, ${contextData.sourceDocuments?.length || 0} documentos`);
        } else {
          console.log('Nenhum contexto RAG relevante encontrado');
        }
      } else {
        console.log('Nenhum documento ativo disponível para contexto RAG ou função não disponível');
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
        
        // Se foi uma mensagem sobre documento, verificar novamente documentos
        if (isDocumentMessage) {
          setTimeout(() => {
            loadAssociatedDocuments(conversationId);
          }, 2000);
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
      setAlertInfo({
        open: true,
        message: 'Erro ao enviar mensagem: ' + (error.message || 'Erro desconhecido'),
        severity: 'error'
      });
    }
  };
  
  // Start a new conversation
  const handleNewChat = () => {
    setCurrentConversation(null);
    setMessages([]);
    setIsNewChat(true);
    setActiveDocuments([]);
    setProcessingDocuments([]);
    setDocumentReferences({});
    setShowVisualization(false);
    setVisualizationData(null);
    setNewDocsAvailable(false);
    
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
    
    // Reset new docs notification quando abrir o painel
    if (!isDocumentPanelOpen) {
      setNewDocsAvailable(false);
    }
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
  
  // Upload a document - VERSÃO MELHORADA
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
        status: 'uploading',
        completedAt: null
      });
      
      console.log(`Iniciando upload do documento ${file.name} para conversa ${currentConversation.conversation_id}`);
      
      // Upload document
      const response = await uploadDocument(file, currentConversation.conversation_id);
      console.log('Resposta do upload:', response);
      
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
      
      console.log(`Documento enviado com ID: ${documentId}, iniciando polling de status...`);
      
      // Update state with document ID
      setUploadStatus(prev => ({
        ...prev,
        documentId,
        progress: 60,
        status: 'analyzing'
      }));
      
      // CORREÇÃO: Verificar e reforçar a associação do documento com a conversa
      try {
        await associateDocumentWithConversation(documentId, currentConversation.conversation_id);
        console.log(`Associação reforçada: documento ${documentId} com conversa ${currentConversation.conversation_id}`);
      } catch (e) {
        console.warn('Erro ao reforçar associação:', e);
      }
      
      // Poll for document status
      const pollResult = await pollDocumentStatus(documentId);
      console.log(`Resultado do polling para documento ${documentId}:`, pollResult);
      
      if (pollResult.success) {
        // Upload complete
        setUploadStatus(prev => ({
          ...prev,
          active: true, // Manter como ativo para exibir a mensagem
          progress: 100,
          status: 'completed',
          completedAt: new Date().getTime() // Registrar quando completou
        }));
        
        // Configurar um timer para limpar o status só após mostrar o feedback por tempo suficiente
        setTimeout(() => {
          setUploadStatus(prev => {
            // Só limpa se o completed timestamp não mudou (evitando limpar um novo upload)
            if (prev.completedAt && (new Date().getTime() - prev.completedAt > 5000)) {
              return {
                active: false,
                documentId: null,
                filename: null,
                error: null,
                progress: 0,
                status: null,
                completedAt: null
              };
            }
            return prev;
          });
        }, 5000);
        
        // Disparar evento de documento carregado
        window.dispatchEvent(new CustomEvent('document-uploaded', { 
          detail: { 
            documentId, 
            conversationId: currentConversation.conversation_id,
            filename: file.name,
            status: 'completed'
          }
        }));
        
        // Show success message
        setAlertInfo({
          open: true,
          message: `Documento "${file.name}" processado com sucesso!`,
          severity: 'success',
          action: (
            <Button 
              color="inherit" 
              size="small" 
              onClick={() => setIsDocumentPanelOpen(true)}
            >
              Ver Documento
            </Button>
          )
        });
        
        // Reload associated documents
        await loadAssociatedDocuments(currentConversation.conversation_id);
        
        // Add informational message to conversation
        await sendMessageToConversation(
          currentConversation.conversation_id, 
          `Documento carregado: ${file.name}. Agora você pode me fazer perguntas sobre ele.`
        );
        
        // Forçar uma segunda recarga após um tempo para garantir dados atualizados
        setTimeout(() => {
          loadAssociatedDocuments(currentConversation.conversation_id);
        }, 2000);
      } else {
        // Error in processing
        setUploadStatus(prev => ({
          ...prev,
          status: 'error',
          error: pollResult.error || 'Erro durante o processamento do documento'
        }));
        throw new Error(pollResult.error || 'Erro durante o processamento do documento');
      }
    } catch (error) {
      console.error('Erro no upload do documento:', error);
      
      // Update state with error
      setUploadStatus({
        active: true, // Manter como ativo para exibir o erro
        documentId: null,
        filename: file.name,
        error: error.message || 'Erro desconhecido',
        progress: 0,
        status: 'error',
        completedAt: new Date().getTime()
      });
      
      // Configurar um timer para limpar o status de erro após tempo suficiente
      setTimeout(() => {
        setUploadStatus(prev => {
          if (prev.status === 'error' && prev.completedAt && 
              (new Date().getTime() - prev.completedAt > 5000)) {
            return {
              active: false,
              documentId: null,
              filename: null,
              error: null,
              progress: 0,
              status: null,
              completedAt: null
            };
          }
          return prev;
        });
      }, 5000);
      
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
      severity: 'success',
      action: (
        <Tooltip title="Visualizar documento">
          <InfoIcon 
            fontSize="small" 
            sx={{ cursor: 'pointer' }} 
            onClick={() => handleViewDocument(documentId)}
          />
        </Tooltip>
      )
    });
    
    // CORREÇÃO: Garantir associação com a conversa atual
    if (currentConversation) {
      // Reforçar associação
      try {
        associateDocumentWithConversation(documentId, currentConversation.conversation_id)
          .then(() => console.log(`Associação reforçada para documento ${documentId}`))
          .catch(err => console.warn('Erro ao reforçar associação:', err));
      } catch (e) {
        console.warn('Erro ao tentar reforçar associação:', e);
      }
      
      // Reload associated documents
      loadAssociatedDocuments(currentConversation.conversation_id);
      
      // Informar ao chat que um documento foi carregado
      setTimeout(() => {
        const message = `Documento "${filename}" foi carregado. Agora você pode fazer perguntas sobre ele.`;
        sendMessageToConversation(currentConversation.conversation_id, message);
      }, 1500);
    }
  };
  
  // Close visualization
  const handleCloseVisualization = () => {
    setShowVisualization(false);
  };
  
  // Forçar recarga de documentos
  const handleForceReloadDocuments = () => {
    if (currentConversation) {
      loadAssociatedDocuments(currentConversation.conversation_id);
      setAlertInfo({
        open: true,
        message: 'Recarregando lista de documentos...',
        severity: 'info',
        autoHideDuration: 2000
      });
    }
  };
  
  // Renderizar lista de documentos ativos e em processamento
  const renderDocumentChips = () => {
    if ((!activeDocuments || activeDocuments.length === 0) && 
        (!processingDocuments || processingDocuments.length === 0)) {
      return null;
    }
    
    return (
      <Box 
        sx={{ 
          px: 2, 
          py: 1, 
          display: 'flex', 
          flexWrap: 'wrap',
          alignItems: 'center',
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: theme.palette.background.paper,
          overflowX: 'auto',
          '&::-webkit-scrollbar': {
            height: 6
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: alpha(theme.palette.primary.main, 0.2),
            borderRadius: 3,
          }
        }}
      >
        <Typography 
          variant="body2" 
          color="textSecondary" 
          sx={{ mr: 1, whiteSpace: 'nowrap' }}
        >
          Documentos:
        </Typography>
        
        {/* Processar ativos primeiro */}
        {activeDocuments.map(doc => (
          <EnhancedDocumentChip 
            key={doc.document_id} 
            document={doc} 
            onClick={() => handleViewDocument(doc.document_id)}
            variant="chip"
            showProcessed={true}
          />
        ))}
        
        {/* Depois processar os que estão em processamento */}
        {processingDocuments.map(doc => (
          <EnhancedDocumentChip 
            key={doc.document_id} 
            document={doc} 
            onClick={() => {}} // Nada acontece ao clicar em docs em processamento
            variant="chip"
          />
        ))}
        
        {/* Botão para forçar recarga de documentos */}
        <Tooltip title="Recarregar documentos">
          <Chip
            icon={<RefreshIcon fontSize="small" />}
            label="Atualizar"
            variant="outlined"
            color="primary"
            size="small"
            onClick={handleForceReloadDocuments}
            sx={{ ml: 1 }}
          />
        </Tooltip>
      </Box>
    );
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
                  Claud.IA está escrevendo...
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
          conversationId={currentConversation?.conversation_id}
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
        {/* Área de documentos em chip */}
        {renderDocumentChips()}
        
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
              flexDirection: 'column',
              scrollBehavior: 'smooth'
            }}
          >
            {/* Visualização de processamento de documentos */}
            {uploadStatus.active && (
              <Box sx={{ px: 2, pt: 2 }}>
                <EnhancedProcessingFeedback 
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
            showDocumentBadge={newDocsAvailable}
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
          alwaysShowExpandButton={true}
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
          open={isDrawerOpen}
          onClose={closeDrawer}
          customVisualizations={visualizationData ? [visualizationData] : null}
          conversationId={currentConversation?.conversation_id}
          messageId={visualizationData?.messageId}
        />
      </Box>
    </ClickAwayListener>
  );
};

export default ChatContainer;