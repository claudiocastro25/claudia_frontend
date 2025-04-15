import React, { useRef, useEffect } from 'react';
import { Box, Typography, CircularProgress, Fade } from '@mui/material';
import MessageItem from './MessageItem';

/**
 * Componente para exibir a lista de mensagens
 * Extraído do ChatContainer para melhorar modularidade
 */
const MessageList = ({ 
  messages = [], 
  isTyping = false,
  documentReferences = {}, // Map de message_id -> documentos referenciados
  onViewDocument,
  onDeleteMessage
}) => {
  const messagesEndRef = useRef(null);
  
  // Scroll para o final das mensagens quando novas são adicionadas
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);
  
  return (
    <Box 
      sx={{ 
        p: { xs: 1.5, md: 3 },
        width: '100%',
        maxWidth: '850px',
        mx: 'auto',
        flex: 1,
        overflow: 'auto'
      }}
    >
      {messages.length === 0 && !isTyping ? (
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: '100%'
          }}
        >
          <Typography color="text.secondary">
            Envie uma mensagem para começar...
          </Typography>
        </Box>
      ) : (
        <>
          {messages.map((message) => (
            <MessageItem 
              key={message.message_id || `msg-${message.created_at}`}
              message={message}
              documentReferences={documentReferences[message.message_id] || []}
              onViewDocument={onViewDocument}
              onDelete={onDeleteMessage ? () => onDeleteMessage(message.message_id) : null}
            />
          ))}
          
          {/* Indicador de digitação */}
          {isTyping && (
            <Fade in={true}>
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
                    bgcolor: theme => theme.palette.mode === 'dark' 
                      ? 'rgba(99, 102, 241, 0.2)'
                      : 'rgba(99, 102, 241, 0.1)',
                    width: 'fit-content'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', gap: '3px', mr: 1 }}>
                      {[0, 1, 2].map(i => (
                        <Box
                          key={i}
                          component="span"
                          sx={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: 'primary.main',
                            display: 'inline-block',
                            animation: 'pulse 1s infinite',
                            animationDelay: `${i * 0.2}s`,
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
                      ))}
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Claud.IA está escrevendo...
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Fade>
          )}
          
          <div ref={messagesEndRef} />
        </>
      )}
    </Box>
  );
};

export default MessageList;