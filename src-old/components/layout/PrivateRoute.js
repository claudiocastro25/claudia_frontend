import React from 'react';
import { Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { isAuthenticated } from '../../services/authService';

// Componente simplificado que não depende de useAuth para funcionar
const PrivateRoute = ({ children }) => {
  // Verificar a autenticação diretamente sem hook
  const authenticated = isAuthenticated();
  
  // Se não estiver autenticado, redirecionar para a página de login
  if (!authenticated) {
    return <Navigate to="/login" />;
  }
  
  // Se estiver autenticado, renderizar os componentes filhos
  return children;
};

export default PrivateRoute;