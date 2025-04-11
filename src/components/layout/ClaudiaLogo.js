import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { keyframes } from '@mui/system';

// Animação de piscar
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

// Nova animação: pulsação suave
const pulseAnimation = keyframes`
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.03);
  }
  100% {
    transform: scale(1);
  }
`;

const ClaudIAEyeLogo = ({ 
  size = 'medium', 
  showText = true, 
  textColor,
  withAnimation = true,
  blinkInterval = 10,
  followMouse = false
}) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const [shouldBlink, setShouldBlink] = useState(false);
  const [eyeDirection, setEyeDirection] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [forceLookAtCenter, setForceLookAtCenter] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const animationRef = useRef();
  
  // Novo estado para olhar automaticamente em diferentes direções
  const [autoLook, setAutoLook] = useState(false);
  const [autoLookTarget, setAutoLookTarget] = useState({ x: 0, y: 0 });
  const autoLookTimerRef = useRef(null);
  const lookDurationRef = useRef(null);

  const logoSizes = {
    small: { icon: 24, text: 'body1', spacing: 1, eyeWidth: 20, eyeHeight: 12 },
    medium: { icon: 32, text: 'h6', spacing: 1.5, eyeWidth: 28, eyeHeight: 16 },
    large: { icon: 48, text: 'h5', spacing: 2, eyeWidth: 40, eyeHeight: 22 },
    xlarge: { icon: 64, text: 'h4', spacing: 2.5, eyeWidth: 56, eyeHeight: 30 }
  };

  const { icon: iconSize, text: textVariant, spacing, eyeWidth, eyeHeight } = logoSizes[size] || logoSizes.medium;
  const textColorValue = textColor || (isDarkMode ? 'white' : 'text.primary');
  const gradientStart = '#5B52F3';
  const gradientEnd = '#7C64F9';

  // Efeito para controlar piscadas
  useEffect(() => {
    if (!withAnimation) return;

    const timeout = setTimeout(() => setShouldBlink(true), 3000);

    const interval = setInterval(() => {
      setShouldBlink(true);
      setTimeout(() => setShouldBlink(false), 800);
    }, blinkInterval * 1000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [withAnimation, blinkInterval]);

  // Efeito para controlar pulsação aleatória
  useEffect(() => {
    if (!withAnimation) return;

    const startRandomPulse = () => {
      const randomDelay = 5000 + Math.random() * 15000; // Entre 5 e 20 segundos
      setTimeout(() => {
        setIsPulsing(true);
        setTimeout(() => {
          setIsPulsing(false);
          startRandomPulse();
        }, 2000); // Duração da pulsação
      }, randomDelay);
    };

    startRandomPulse();
  }, [withAnimation]);

  // NOVA FUNÇÃO: Iniciar olhar em direção aleatória
  const startRandomLook = () => {
    // Se estiver seguindo o mouse ou sendo hover, não olhe aleatoriamente
    if (followMouse || isHovered || forceLookAtCenter) return;
    
    // Limpar timers existentes
    if (autoLookTimerRef.current) clearTimeout(autoLookTimerRef.current);
    if (lookDurationRef.current) clearTimeout(lookDurationRef.current);
    
    // Tempo até a próxima olhada aleatória (entre 3 e 10 segundos)
    const nextLookDelay = 3000 + Math.random() * 7000;
    
    autoLookTimerRef.current = setTimeout(() => {
      // Gerar uma direção aleatória para olhar, mais frequentemente para os lados
      const randomX = (Math.random() - 0.5) * 4; // -2 a 2
      // Y tem um alcance mais restrito para parecer mais natural
      const randomY = (Math.random() - 0.5) * 2.5; // -1.25 a 1.25
      
      // Ocasionalmente fazer movimentos mais óbvios para os lados
      const extraEmphasis = Math.random() > 0.7;
      const directionX = extraEmphasis ? (randomX > 0 ? 3 : -3) : randomX;
      
      setAutoLookTarget({ x: directionX, y: randomY });
      setAutoLook(true);
      
      // Quanto tempo permanece olhando naquela direção (0.8 a 2.5 segundos)
      const lookDuration = 800 + Math.random() * 1700;
      
      lookDurationRef.current = setTimeout(() => {
        // Voltar ao centro
        setAutoLook(false);
        setAutoLookTarget({ x: 0, y: 0 });
        
        // Programa a próxima olhada
        startRandomLook();
        
        // Chance adicional de piscar quando termina de olhar
        if (Math.random() > 0.6) {
          setShouldBlink(true);
          setTimeout(() => setShouldBlink(false), 200);
        }
      }, lookDuration);
    }, nextLookDelay);
  };

  // Iniciar o comportamento de olhar aleatoriamente quando o componente for montado
  useEffect(() => {
    if (withAnimation) {
      startRandomLook();
    }
    
    return () => {
      if (autoLookTimerRef.current) clearTimeout(autoLookTimerRef.current);
      if (lookDurationRef.current) clearTimeout(lookDurationRef.current);
    };
  }, [withAnimation, isHovered, followMouse, forceLookAtCenter]);

  // Efeito para seguir o mouse ou mover-se aleatoriamente
  useEffect(() => {
    let targetX = 0;
    let targetY = 0;

    const updatePosition = () => {
      setEyeDirection(prev => {
        // Se autoLook está ativo, use autoLookTarget
        if (autoLook && !followMouse && !isHovered && !forceLookAtCenter) {
          targetX = autoLookTarget.x;
          targetY = autoLookTarget.y;
        }
        
        // Velocidade de interpolação - fator de suavidade
        const lerp = 0.15;
        
        return {
          x: prev.x + (targetX - prev.x) * lerp,
          y: prev.y + (targetY - prev.y) * lerp
        };
      });
      animationRef.current = requestAnimationFrame(updatePosition);
    };

    const handleMouseMove = (e) => {
      if (!followMouse && !isHovered) return;
      
      const eyeBox = document.getElementById('claudia-eye');
      if (!eyeBox) return;

      const rect = eyeBox.getBoundingClientRect();
      const eyeCenterX = rect.left + rect.width / 2;
      const eyeCenterY = rect.top + rect.height / 2;

      const dx = e.clientX - eyeCenterX;
      const dy = e.clientY - eyeCenterY;

      const angle = Math.atan2(dy, dx);
      const offsetX = Math.cos(angle) * 2; // movimento bem sutil
      const offsetY = Math.sin(angle) * 1.5; // movimento bem sutil

      if (forceLookAtCenter) {
        targetX = 0;
        targetY = 0;
      } else {
        targetX = offsetX;
        targetY = offsetY;
      }
    };

    animationRef.current = requestAnimationFrame(updatePosition);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [followMouse, eyeWidth, eyeHeight, forceLookAtCenter, autoLook, autoLookTarget, isHovered]);

  const handleMouseEnter = () => {
    // Pausar olhar automático enquanto hover
    setIsHovered(true);
    setAutoLook(false);
    
    // Piscar ao receber hover
    setShouldBlink(true);
    setTimeout(() => setShouldBlink(false), 300);
  };
  
  const handleMouseLeave = () => {
    setIsHovered(false);
    // Reiniciar olhar automático
    startRandomLook();
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Box
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => {
          setForceLookAtCenter(true);
          setShouldBlink(true);
          setTimeout(() => {
            setForceLookAtCenter(false);
            setShouldBlink(false);
            startRandomLook();
          }, 1500);
        }}
        sx={{
          width: iconSize,
          height: iconSize,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mr: showText ? spacing : 0,
          transition: 'box-shadow 0.3s ease',
          boxShadow: isHovered ? `0 0 12px 4px rgba(123, 100, 249, 0.4)` : 'none',
          borderRadius: '50%',
          cursor: 'pointer',
          animation: isPulsing ? `${pulseAnimation} 2s ease-in-out` : 'none'
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            width: iconSize,
            height: iconSize,
            borderRadius: '50%',
            bgcolor: 'white',
            boxShadow: `0 4px 20px rgba(91, 82, 243, 0.2), 0 2px 8px rgba(0, 0, 0, 0.1)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        />

        <Box
          id="claudia-eye"
          sx={{
            width: eyeWidth,
            height: eyeHeight,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`,
            position: 'relative',
            overflow: 'hidden',
            boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.1)',
            animation: shouldBlink 
              ? `${blinkAnimation} 0.4s ease-in-out` 
              : (isPulsing ? `${pulseAnimation} 2s ease-in-out` : 'none'),
            transformOrigin: 'center',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: `calc(50% + ${eyeDirection.y}px)`,
              left: `calc(50% + ${eyeDirection.x}px)`,
              transform: 'translate(-50%, -50%)',
              width: eyeHeight * 0.45,
              height: eyeHeight * 0.45,
              borderRadius: '50%',
              bgcolor: 'white',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.25)',
            }}
          />

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

      {showText && (
        <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', letterSpacing: '0.2px' }}>
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