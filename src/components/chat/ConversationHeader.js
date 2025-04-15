import React from 'react';
import { 
  Box, 
  Typography, 
  IconButton, 
  Chip,
  Tooltip,
  useTheme,
  alpha 
} from '@mui/material';
import { 
  ArrowBack, 
  MoreVert, 
  Description, 
  ChatBubbleOutline 
} from '@mui/icons-material';

/**
 * Cabeçalho da conversa extraído do ChatContainer
 * Exibe informações sobre a conversa atual e controles principais
 */
const ConversationHeader = ({ 
  conversation, 
  documentsCount = 0,
  onBack, 
  onOpenMenu = null,
  onOpenDocuments = null,
  messagesCount = 0
}) => {
  const theme = useTheme();
  
  if (!conversation) return null;
  
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        p: 1.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: alpha(theme.palette.background.paper, 0.8),
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Botão de voltar (visível em mobile) */}
      <IconButton 
        sx={{ display: { xs: 'flex', md: 'none' }, mr: 1 }} 
        onClick={onBack}
      >
        <ArrowBack />
      </IconButton>
      
      {/* Informações da conversa */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle1" noWrap sx={{ fontWeight: 500 }}>
          {conversation.title || 'Nova Conversa'}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
          {documentsCount > 0 && (
            <Tooltip title={`${documentsCount} documento${documentsCount !== 1 ? 's' : ''} associado${documentsCount !== 1 ? 's' : ''}`}>
              <Chip
                icon={<Description fontSize="small" />}
                label={documentsCount}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ height: 20, '& .MuiChip-label': { px: 0.5, fontSize: '0.75rem' } }}
                onClick={onOpenDocuments}
              />
            </Tooltip>
          )}
          
          {messagesCount > 0 && (
            <Tooltip title={`${messagesCount} mensage${messagesCount !== 1 ? 'ns' : 'm'}`}>
              <Chip
                icon={<ChatBubbleOutline fontSize="small" />}
                label={messagesCount}
                size="small"
                color="secondary"
                variant="outlined"
                sx={{ height: 20, '& .MuiChip-label': { px: 0.5, fontSize: '0.75rem' } }}
              />
            </Tooltip>
          )}
          
          <Typography variant="caption" color="text.secondary" noWrap>
            {conversation.created_at 
              ? new Date(conversation.created_at).toLocaleString() 
              : 'Agora mesmo'}
          </Typography>
        </Box>
      </Box>
      
      {/* Menu de opções */}
      {onOpenMenu && (
        <IconButton onClick={onOpenMenu}>
          <MoreVert />
        </IconButton>
      )}
    </Box>
  );
};

export default ConversationHeader;