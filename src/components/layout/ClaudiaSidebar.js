import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Avatar,
  Badge,
  Divider,
  Tooltip,
  Button,
  Drawer,
  useTheme,
  useMediaQuery,
  ClickAwayListener
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  PanelLeft,
  FileText,
  Settings,
  User,
  LogOut,
  Search,
  Folder,
  History,
  Star
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import ClaudIAEyeLogo from '../../components/layout/ClaudiaLogo'; // Novo logo

// Combined sidebar component that adapts between compact and expanded modes
const ClaudiaSidebar = ({
  conversations = [],
  currentConversation,
  onNewChat,
  onSelectConversation,
  onLogout,
  onToggleSidebar,
  expanded = false
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [searchTerm, setSearchTerm] = useState('');
  const [hoverIndex, setHoverIndex] = useState(null);
  
  // Filter conversations based on search term
  const filteredConversations = conversations.filter(
    conv => conv.title && conv.title.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Format relative time (e.g., "2 hours ago")
  const formatRelativeTime = (date) => {
    if (!date) return '';
    try {
      return formatDistanceToNow(new Date(date), { 
        addSuffix: true, 
        locale: ptBR 
      });
    } catch (e) {
      return '';
    }
  };
  
  // Determine which conversations to display based on sidebar state
  const displayedConversations = expanded 
    ? filteredConversations 
    : filteredConversations.slice(0, 8);
    
  // Função especial para iniciar nova conversa E recolher a sidebar
  const handleNewChat = () => {
    onNewChat();
    if (isMobile && expanded) {
      onToggleSidebar();
    }
  };
  
  // Função para selecionar conversa E recolher a sidebar no mobile
  const handleSelectConversation = (conversation) => {
    onSelectConversation(conversation);
    if (isMobile && expanded) {
      onToggleSidebar();
    }
  };

  // Handler para cliques fora da sidebar quando expandida
  const handleClickAway = () => {
    if (expanded && isMobile) {
      onToggleSidebar();
    }
  };
  
  return (
    <>
      {/* Compact Sidebar - Always visible */}
      {!expanded && (
        <Box
          sx={{
            width: 70,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: theme.palette.mode === 'dark' 
              ? alpha(theme.palette.background.paper, 0.8) 
              : alpha(theme.palette.grey[50], 0.8),
            py: 2,
            position: 'relative',
            zIndex: 10,
            boxShadow: theme.palette.mode === 'dark' 
              ? 'none' 
              : '4px 0 8px -4px rgba(0, 0, 0, 0.05)',
          }}
        >
          {/* New chat button */}
          <Tooltip title="Nova conversa" placement="right">
            <IconButton
              color="primary"
              size="large"
              onClick={handleNewChat}
              sx={{
                width: 48,
                height: 48,
                mx: 'auto',
                mb: 2,
                background: 'linear-gradient(135deg, #5B52F3 0%, #7C64F9 100%)',
                color: 'white',
                '&:hover': {
                  background: 'linear-gradient(135deg, #4A43D9 0%, #6B55E4 100%)',
                }
              }}
            >
              <Plus size={24} />
            </IconButton>
          </Tooltip>
          
          <Divider sx={{ mb: 2, width: '80%', mx: 'auto' }} />
          
          {/* Conversation list */}
          <Box sx={{ 
            flex: 1, 
            overflow: 'auto', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
            py: 1
          }}>
            {displayedConversations.length === 0 ? (
              <Box sx={{ textAlign: 'center', px: 1, mt: 2 }}>
                <MessageSquare 
                  size={24} 
                  color={theme.palette.text.disabled} 
                  style={{ marginBottom: 8, opacity: 0.6, margin: '0 auto' }} 
                />
              </Box>
            ) : (
              displayedConversations.map((conversation, index) => {
                const isActive = currentConversation?.conversation_id === conversation.conversation_id;
                const hasDocuments = conversation.document_count > 0;
                
                return (
                  <Tooltip
                    key={conversation.conversation_id}
                    title={conversation.title || 'Conversa sem título'}
                    placement="right"
                  >
                    <Box
                      component={motion.div}
                      whileHover={{ scale: 1.05 }}
                      sx={{ width: '100%', px: 1, mb: 1 }}
                      onMouseEnter={() => setHoverIndex(index)}
                      onMouseLeave={() => setHoverIndex(null)}
                    >
                      <IconButton
                        onClick={() => handleSelectConversation(conversation)}
                        sx={{
                          width: 44,
                          height: 44,
                          position: 'relative',
                          borderRadius: '12px',
                          mx: 'auto',
                          display: 'flex',
                          bgcolor: isActive 
                            ? alpha(theme.palette.primary.main, 0.1)
                            : 'transparent',
                          border: isActive 
                            ? `1px solid ${alpha(theme.palette.primary.main, 0.4)}`
                            : '1px solid transparent',
                          '&:hover': {
                            bgcolor: alpha(theme.palette.primary.main, 0.05)
                          }
                        }}
                      >
                        <MessageSquare 
                          size={20} 
                          color={isActive 
                            ? theme.palette.primary.main 
                            : theme.palette.text.secondary} 
                        />
                        
                        {/* Badge for documents */}
                        {hasDocuments && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 2,
                              right: 2,
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: theme.palette.primary.main,
                              border: '2px solid',
                              borderColor: 'background.paper'
                            }}
                          />
                        )}
                      </IconButton>
                    </Box>
                  </Tooltip>
                );
              })
            )}
          </Box>
          
          {/* MODIFICADO: Sempre mostra botão "Ver todas" independente do número de conversas */}
          <Tooltip title="Ver todas as conversas" placement="right">
            <IconButton
              size="small"
              onClick={onToggleSidebar}
              sx={{ 
                mt: 1, 
                mb: 2, 
                color: 'primary.main',
                width: 40,
                height: 40,
                borderRadius: '50%',
                mx: 'auto',
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.05)
                }
              }}
            >
              <ChevronRight size={20} />
            </IconButton>
          </Tooltip>
          
          <Divider sx={{ mt: 1, width: '80%', mx: 'auto' }} />
          
          {/* User avatar */}
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Tooltip title="Configurações" placement="right">
              <IconButton sx={{ color: 'text.secondary' }}>
                <Settings size={20} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      )}
      
      {/* Expanded Sidebar */}
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={expanded}
          onClose={onToggleSidebar}
          ModalProps={{
            keepMounted: true, // Better performance on mobile
          }}
          sx={{
            '& .MuiDrawer-paper': {
              width: 280,
              boxSizing: 'border-box',
              border: 'none',
              boxShadow: theme.palette.mode === 'dark' 
                ? 'none' 
                : '0 4px 20px rgba(0, 0, 0, 0.08)',
              bgcolor: theme.palette.background.paper,
            },
          }}
        >
          <SidebarContent 
            conversations={filteredConversations}
            currentConversation={currentConversation}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            formatRelativeTime={formatRelativeTime}
            onSelectConversation={handleSelectConversation}
            onNewChat={handleNewChat}
            onToggleSidebar={onToggleSidebar}
            onLogout={onLogout}
            theme={theme}
          />
        </Drawer>
      ) : (
        <Drawer
          variant="persistent"
          open={expanded}
          sx={{
            width: expanded ? 280 : 0,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: 280,
              boxSizing: 'border-box',
              border: 'none',
              boxShadow: theme.palette.mode === 'dark' 
                ? 'none' 
                : '0 4px 20px rgba(0, 0, 0, 0.08)',
              bgcolor: theme.palette.background.paper,
              transition: theme.transitions.create(['width', 'margin'], {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
            },
          }}
        >
          <SidebarContent 
            conversations={filteredConversations}
            currentConversation={currentConversation}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            formatRelativeTime={formatRelativeTime}
            onSelectConversation={handleSelectConversation}
            onNewChat={handleNewChat}
            onToggleSidebar={onToggleSidebar}
            onLogout={onLogout}
            theme={theme}
          />
        </Drawer>
      )}
    </>
  );
};

// Extraí o conteúdo da sidebar para um componente para melhor reutilização
const SidebarContent = ({
  conversations,
  currentConversation,
  searchTerm,
  setSearchTerm,
  formatRelativeTime,
  onSelectConversation,
  onNewChat,
  onToggleSidebar,
  onLogout,
  theme
}) => {
  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column' 
    }}>
      {/* Header */}
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        alignItems: 'center',
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}>
        <Box sx={{ flex: 1 }}>
          {/* Novo logo do olho que pisca */}
          <ClaudIAEyeLogo 
            size="medium" 
            showText={true} 
            withAnimation={true} 
            blinkInterval={10}
          />
        </Box>
        
        <IconButton 
          size="small" 
          onClick={onToggleSidebar}
          sx={{ color: 'text.secondary' }}
        >
          <ChevronLeft size={20} />
        </IconButton>
      </Box>
      
      {/* New Chat Button */}
      <Box sx={{ p: 2 }}>
        <Button
          fullWidth
          variant="contained"
          startIcon={<Plus size={18} />}
          onClick={onNewChat}
          disableElevation
          sx={{
            py: 1,
            borderRadius: '10px',
            textTransform: 'none',
            background: 'linear-gradient(90deg, #5B52F3 0%, #7C64F9 100%)',
            '&:hover': {
              background: 'linear-gradient(90deg, #4A43D9 0%, #6B55E4 100%)'
            }
          }}
        >
          Nova Conversa
        </Button>
      </Box>
      
      {/* Search */}
      <Box sx={{ px: 2, mb: 1 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            bgcolor: theme.palette.mode === 'dark' 
              ? alpha(theme.palette.common.white, 0.05) 
              : alpha(theme.palette.common.black, 0.05),
            borderRadius: '10px',
            p: 0.5,
            pl: 1.5
          }}
        >
          <Search size={18} color={theme.palette.text.secondary} style={{ opacity: 0.7 }} />
          <input
            type="text"
            placeholder="Buscar conversas..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: theme.palette.text.primary,
              width: '100%',
              padding: '8px 12px',
              fontSize: '0.875rem',
              fontFamily: theme.typography.fontFamily
            }}
          />
          {searchTerm && (
            <IconButton 
              size="small" 
              onClick={() => setSearchTerm('')}
              sx={{ color: 'text.secondary', p: 0.5 }}
            >
              <ChevronRight size={18} />
            </IconButton>
          )}
        </Box>
      </Box>
      
      {/* Folders/Categories */}
      <Box sx={{ px: 2, mb: 1 }}>
        <Typography 
          variant="caption" 
          color="text.secondary" 
          sx={{ fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}
        >
          Categorias
        </Typography>
        
        <List disablePadding dense>
          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              sx={{ 
                borderRadius: '8px',
                py: 0.5
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <History size={18} />
              </ListItemIcon>
              <ListItemText primary="Recentes" />
              <Badge badgeContent={conversations.length} color="primary" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              sx={{ 
                borderRadius: '8px',
                py: 0.5
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Star size={18} />
              </ListItemIcon>
              <ListItemText primary="Favoritos" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              sx={{ 
                borderRadius: '8px',
                py: 0.5
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <FileText size={18} />
              </ListItemIcon>
              <ListItemText primary="Com documentos" />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
      
      <Divider sx={{ my: 1 }} />
      
      {/* Conversation list */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 1 }}>
        <Typography 
          variant="caption" 
          color="text.secondary" 
          sx={{ 
            fontWeight: 500, 
            textTransform: 'uppercase', 
            letterSpacing: 0.5,
            px: 1,
            mb: 1,
            display: 'block'
          }}
        >
          Conversas ({conversations.length})
        </Typography>
        
        {conversations.length === 0 ? (
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <MessageSquare 
              size={24} 
              color={theme.palette.text.disabled} 
              style={{ marginBottom: 8, opacity: 0.6, margin: '0 auto' }} 
            />
            <Typography variant="body2" color="text.secondary">
              {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhuma conversa'}
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {conversations.map((conversation) => {
              const isActive = currentConversation?.conversation_id === conversation.conversation_id;
              const hasDocuments = conversation.document_count > 0;
              
              return (
                <ListItem 
                  key={conversation.conversation_id} 
                  disablePadding 
                  sx={{ mb: 0.5 }}
                >
                  <ListItemButton
                    selected={isActive}
                    onClick={() => onSelectConversation(conversation)}
                    sx={{
                      borderRadius: '8px',
                      py: 1,
                      '&.Mui-selected': {
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.15),
                        }
                      }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Badge
                        variant="dot"
                        color="primary"
                        invisible={!hasDocuments}
                      >
                        <MessageSquare size={18} />
                      </Badge>
                    </ListItemIcon>
                    <ListItemText 
                      primary={conversation.title || 'Conversa sem título'} 
                      secondary={formatRelativeTime(conversation.updated_at || conversation.created_at)}
                      primaryTypographyProps={{
                        noWrap: true,
                        variant: 'body2',
                        fontWeight: isActive ? 500 : 400,
                      }}
                      secondaryTypographyProps={{
                        noWrap: true,
                        variant: 'caption',
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        )}
      </Box>
      
      {/* User profile */}
      <Box sx={{ 
        p: 2, 
        borderTop: '1px solid', 
        borderColor: 'divider', 
        display: 'flex', 
        alignItems: 'center' 
      }}>
        <Avatar sx={{ width: 32, height: 32, mr: 1 }}>
          <User size={18} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" noWrap fontWeight={500}>
            Usuário
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            usuario@email.com
          </Typography>
        </Box>
        <Tooltip title="Sair">
          <IconButton 
            size="small" 
            onClick={onLogout}
            sx={{ color: 'text.secondary' }}
          >
            <LogOut size={18} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default ClaudiaSidebar;