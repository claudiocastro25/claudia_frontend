import React, { useState, useEffect } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { keyframes } from '@mui/system';

// Definição da animação de piscar
const blinkAnimation = keyframes`
  0%, 97% {
    transform: scaleY(1);
  }
  98.5% {
    transform: scaleY(0.15);
  }
  100% {
    transform: scaleY(1);
  }
`;

const ClaudIAEyeLogo = ({ 
  size = 'medium', 
  showText = true, 
  textColor,
  withAnimation = true,
  blinkInterval = 10
}) => {
  const theme = useTheme();
  const [shouldBlink, setShouldBlink] = useState(false);
  const isDarkMode = theme.palette.mode === 'dark';
  
  // Define sizes based on the size prop
  const logoSizes = {
    small: { icon: 24, text: 'body1', spacing: 1, eyeWidth: 20, eyeHeight: 12 },
    medium: { icon: 32, text: 'h6', spacing: 1.5, eyeWidth: 28, eyeHeight: 16 },
    large: { icon: 48, text: 'h5', spacing: 2, eyeWidth: 40, eyeHeight: 22 },
    xlarge: { icon: 64, text: 'h4', spacing: 2.5, eyeWidth: 56, eyeHeight: 30 }
  };
  
  const { icon: iconSize, text: textVariant, spacing, eyeWidth, eyeHeight } = logoSizes[size] || logoSizes.medium;
  
  // Use the provided textColor or default to appropriate color based on theme
  const textColorValue = textColor || (isDarkMode ? 'white' : 'text.primary');
  
  // Gradient colors for the logo - roxo Claud.IA
  const gradientStart = '#5B52F3';
  const gradientEnd = '#7C64F9';
  
  // Efeito para controlar a animação de piscar
  useEffect(() => {
    if (!withAnimation) return;
    
    // Piscar após 3 segundos do montagem
    const timeout = setTimeout(() => {
      setShouldBlink(true);
    }, 3000);
    
    // Configurar o intervalo para piscar regularmente
    const interval = setInterval(() => {
      setShouldBlink(true);
      
      // Reset do estado para permitir que a animação ocorra novamente
      setTimeout(() => {
        setShouldBlink(false);
      }, 800); // Delay maior após piscar
      
    }, blinkInterval * 1000);
    
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [withAnimation, blinkInterval]);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      {/* Container do logo com proporção fixa */}
      <Box
        sx={{
          width: iconSize,
          height: iconSize,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mr: showText ? spacing : 0,
        }}
      >
        {/* Círculo de fundo branco com sombra melhorada */}
        <Box
          sx={{
            position: 'absolute',
            width: iconSize,
            height: iconSize,
            borderRadius: '50%',
            bgcolor: 'white',
            boxShadow: `0 4px 20px rgba(91, 82, 243, 0.2), 
                       0 2px 8px rgba(0, 0, 0, 0.1)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        />
        
        {/* Olho (forma oval roxa) com sombra interna */}
        <Box
          sx={{
            width: eyeWidth,
            height: eyeHeight,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`,
            position: 'relative',
            overflow: 'hidden',
            boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.1)',
            animation: shouldBlink ? `${blinkAnimation} 0.6s ease-in-out` : 'none',
            transformOrigin: 'center',
          }}
        >
          {/* Pupila (círculo branco) */}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: eyeHeight * 0.45,
              height: eyeHeight * 0.45,
              borderRadius: '50%',
              bgcolor: 'white',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.25)',
            }}
          />
          
          {/* Brilho principal do olho */}
          <Box
            sx={{
              position: 'absolute',
              top: '25%',
              left: '65%',
              width: eyeHeight * 0.25,
              height: eyeHeight * 0.25,
              borderRadius: '50%',
              bgcolor: 'rgba(255,255,255,0.8)',
              filter: 'blur(0.5px)',
            }}
          />
          
          {/* Brilho secundário do olho */}
          <Box
            sx={{
              position: 'absolute',
              top: '40%',
              left: '30%',
              width: eyeHeight * 0.15,
              height: eyeHeight * 0.15,
              borderRadius: '50%',
              bgcolor: 'rgba(255,255,255,0.5)',
              filter: 'blur(0.5px)',
            }}
          />
        </Box>
      </Box>
      
      {/* Texto "Claud.IA" com cor adaptativa e IA em gradiente */}
      {showText && (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'row', 
          alignItems: 'center',
          letterSpacing: '0.2px' // Espaçamento melhorado
        }}>
          {/* Parte "Claud" em preto/branco conforme o tema */}
          <Typography
            variant={textVariant}
            component="span"
            sx={{
              fontFamily: "'Montserrat', 'Roboto', sans-serif",
              fontWeight: 700,
              color: textColorValue,
              letterSpacing: '0.3px',
              display: 'inline-block',
              mr: 0
            }}
          >
            Claud
          </Typography>
          
          {/* Ponto "." - mantém a mesma cor que o Claud */}
          <Typography
            variant={textVariant}
            component="span"
            sx={{
              fontFamily: "'Montserrat', 'Roboto', sans-serif",
              fontWeight: 600,
              color: textColorValue,
              letterSpacing: '0.3px',
              display: 'inline-block',
              mr: 0
            }}
          >
            .
          </Typography>
          
          {/* "IA" em degradê */}
          <Typography
            variant={textVariant}
            component="span"
            sx={{
              fontFamily: "'Montserrat', 'Roboto', sans-serif",
              fontWeight: 800,
              background: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '0.3px',
              display: 'inline-block',
              textTransform: 'uppercase'
            }}
          >
            IA
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ClaudIAEyeLogo;