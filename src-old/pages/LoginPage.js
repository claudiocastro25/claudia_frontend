import React, { useState } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  Link, 
  Alert, 
  CircularProgress,
  useTheme
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { login } from '../services/authService';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import ClaudiaLogo from '../components/layout/ClaudiaLogo';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const theme = useTheme();
  
  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Email e senha são obrigatórios');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Chamar a função de login do serviço de autenticação
      const success = await login(email, password);
      
      if (success) {
        // Navegar para a página de chat se o login for bem-sucedido
        navigate('/chat');
      } else {
        setError('Credenciais inválidas');
      }
    } catch (err) {
      console.error('Erro ao fazer login:', err);
      setError(err.message || 'Falha ao fazer login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };
  
  // Cores de fundo seguras que não dependem do alpha
  const paperBgColor = theme.palette.mode === 'dark' 
    ? 'rgba(31, 41, 55, 0.9)' // Cinza escuro com transparência
    : 'rgba(255, 255, 255, 0.9)'; // Branco com transparência
  
  const inputBgColor = theme.palette.mode === 'dark'
    ? 'rgba(17, 24, 39, 0.4)' // Cinza mais escuro com transparência
    : 'rgba(243, 244, 246, 0.4)'; // Cinza claro com transparência
  
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
        background: theme.palette.mode === 'dark'
          ? 'linear-gradient(145deg, #111827 0%, #1F2937 100%)'
          : 'linear-gradient(145deg, #F9FAFB 0%, #F3F4F6 100%)',
      }}
    >
      <Container maxWidth="sm">
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 4
          }}
        >
          <ClaudiaLogo 
            size="xlarge" 
            variant="glow" 
            withAnimation={true} 
          />
          
          <Typography 
            variant="subtitle1" 
            color="text.secondary" 
            sx={{ mt: 2, textAlign: 'center', maxWidth: '80%', mx: 'auto' }}
          >
            Seu assistente inteligente para análise de documentos e visualização de dados
          </Typography>
        </Box>
        
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            borderRadius: 3,
            boxShadow: theme.palette.mode === 'dark'
              ? '0 4px 30px rgba(0, 0, 0, 0.5)'
              : '0 4px 30px rgba(0, 0, 0, 0.1)',
            backgroundColor: paperBgColor,
            backdropFilter: 'blur(10px)',
            border: '1px solid',
            borderColor: theme.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.05)'
              : 'rgba(0, 0, 0, 0.05)',
          }}
        >
          <Typography variant="h5" component="h2" fontWeight={600} gutterBottom>
            Login
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              margin="normal"
              variant="outlined"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  backgroundColor: inputBgColor
                }
              }}
            />
            
            <TextField
              label="Senha"
              type="password"
              fullWidth
              margin="normal"
              variant="outlined"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  backgroundColor: inputBgColor
                }
              }}
            />
            
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              sx={{ 
                mt: 3, 
                mb: 2, 
                py: 1.5,
                borderRadius: 2,
                background: 'linear-gradient(90deg, #6366F1 0%, #8B5CF6 100%)',
                '&:hover': {
                  background: 'linear-gradient(90deg, #4F46E5 0%, #7C3AED 100%)',
                },
                '&.Mui-disabled': {
                  background: theme.palette.mode === 'dark'
                    ? 'rgba(99, 102, 241, 0.3)'
                    : 'rgba(99, 102, 241, 0.4)',
                  color: theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.3)'
                    : 'rgba(255, 255, 255, 0.7)',
                }
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Entrar'}
            </Button>
            
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2">
                Não tem uma conta?{' '}
                <Link 
                  component={RouterLink} 
                  to="/register" 
                  sx={{ 
                    fontWeight: 500,
                    background: 'linear-gradient(90deg, #6366F1 0%, #8B5CF6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline'
                    }
                  }}
                >
                  Registre-se
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

export default LoginPage;