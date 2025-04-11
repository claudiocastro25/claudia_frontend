import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Divider,
  Tabs,
  Tab,
  Button,
  useTheme,
  Card,
  CardContent,
  Stack,
  Chip,
  Tooltip,
  Alert,
  ListItem,
  ListItemIcon,
  ListItemText,
  List,
  TextField, // Added TextField import
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Download as DownloadIcon,
  ColorLens as ColorLensIcon,
  TextFormat as TextFormatIcon,
  Smartphone as SmartphoneIcon,
  Computer as ComputerIcon,
  Print as PrintIcon,
  Info as InfoIcon,
  BrandingWatermark as LogoIcon,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';

// Import the logo component
import ClaudIAEyeLogo from './ClaudiaLogo';

// Página de Guia da Marca Claud.IA (Manual de Identidade Visual)
const ClaudiaBrandGuidelines = () => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Cores da marca
  const brandColors = {
    primary: {
      main: '#5B52F3',
      light: '#7C64F9',
      dark: '#4A43D9',
      contrastText: '#FFFFFF'
    },
    secondary: {
      main: '#6366F1',
      light: '#818CF8',
      dark: '#4F46E5',
      contrastText: '#FFFFFF'
    },
    tertiary: {
      main: '#EC4899',
      light: '#F472B6',
      dark: '#DB2777',
      contrastText: '#FFFFFF'
    },
    accent: {
      main: '#10B981',
      light: '#34D399',
      dark: '#059669',
      contrastText: '#FFFFFF'
    },
    neutral: {
      100: '#F9FAFB',
      200: '#F3F4F6',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
    }
  };

  const ColorBox = styled(Box)(({ color }) => ({
    width: '100%',
    height: 60,
    backgroundColor: color,
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing(1),
    transition: 'transform 0.2s',
    cursor: 'pointer',
    '&:hover': {
      transform: 'scale(1.05)',
    }
  }));

  const CodeSnippet = styled(Box)(({ theme }) => ({
    backgroundColor: theme.palette.mode === 'dark' ? '#1E1F22' : '#FAFBFC',
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(2),
    fontFamily: 'monospace',
    fontSize: '0.875rem',
    overflowX: 'auto',
    border: `1px solid ${theme.palette.mode === 'dark' ? '#2D2E32' : '#E8EAED'}`,
  }));

  const LogoExample = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(3),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    minHeight: 120,
    textAlign: 'center',
    borderRadius: theme.shape.borderRadius,
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
    transition: 'transform 0.3s, box-shadow 0.3s',
    cursor: 'pointer',
    '&:hover': {
      transform: 'translateY(-5px)',
      boxShadow: '0 5px 15px rgba(0,0,0,0.12)',
    }
  }));

  const TabContent = ({ children, index, value, ...props }) => {
    return (
      <Box
        role="tabpanel"
        hidden={value !== index}
        id={`tabpanel-${index}`}
        aria-labelledby={`tab-${index}`}
        {...props}
        sx={{ py: 4 }}
      >
        {value === index && children}
      </Box>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <ClaudIAEyeLogo size="xlarge" showText={true} withAnimation={true} />
        </Box>
        <Typography variant="h3" component="h1" gutterBottom fontWeight={700}>
          Manual de Identidade Visual
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 700, mx: 'auto' }}>
          Guia completo de uso da marca Claud.IA, incluindo logo, tipografia, 
          cores e aplicações em diferentes contextos.
        </Typography>
      </Box>

      {/* Navigation Tabs */}
      <Paper sx={{ mb: 4, borderRadius: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          variant="scrollable"
          scrollButtons="auto"
          sx={{ 
            borderBottom: 1, 
            borderColor: 'divider',
            '& .MuiTab-root': {
              py: 2,
              minHeight: 64
            } 
          }}
        >
          <Tab 
            label="Logo" 
            icon={<LogoIcon />} 
            iconPosition="start" 
            sx={{ textTransform: 'none', fontWeight: 500 }}
          />
          <Tab 
            label="Cores" 
            icon={<ColorLensIcon />} 
            iconPosition="start" 
            sx={{ textTransform: 'none', fontWeight: 500 }}
          />
          <Tab 
            label="Tipografia" 
            icon={<TextFormatIcon />} 
            iconPosition="start" 
            sx={{ textTransform: 'none', fontWeight: 500 }}
          />
          <Tab 
            label="Aplicações" 
            icon={<DashboardIcon />} 
            iconPosition="start" 
            sx={{ textTransform: 'none', fontWeight: 500 }}
          />
        </Tabs>
      </Paper>

      {/* Logo Section */}
      <TabContent value={activeTab} index={0}>
        <Typography variant="h4" gutterBottom fontWeight={600}>
          Logo
        </Typography>
        <Typography paragraph>
          O logo Claud.IA consiste em um olho estilizado que representa a inteligência artificial observadora
          e o texto Claud.IA com tratamento tipográfico especial. O olho possui animações sutis
          que trazem vida à marca.
        </Typography>

        <Box sx={{ mt: 4, mb: 6 }}>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            Tamanhos
          </Typography>
          <Typography paragraph>
            O logo Claud.IA está disponível em 4 tamanhos padrão para garantir
            legibilidade e impacto visual em diferentes contextos.
          </Typography>

          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid item xs={12} sm={6} md={3}>
              <LogoExample>
                <ClaudIAEyeLogo size="small" showText={true} withAnimation={true} />
                <Typography variant="subtitle2" sx={{ mt: 2 }}>
                  Pequeno
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  24px
                </Typography>
              </LogoExample>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <LogoExample>
                <ClaudIAEyeLogo size="medium" showText={true} withAnimation={true} />
                <Typography variant="subtitle2" sx={{ mt: 2 }}>
                  Médio
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  32px
                </Typography>
              </LogoExample>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <LogoExample>
                <ClaudIAEyeLogo size="large" showText={true} withAnimation={true} />
                <Typography variant="subtitle2" sx={{ mt: 2 }}>
                  Grande
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  48px
                </Typography>
              </LogoExample>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <LogoExample>
                <ClaudIAEyeLogo size="xlarge" showText={true} withAnimation={true} />
                <Typography variant="subtitle2" sx={{ mt: 2 }}>
                  Extra grande
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  64px
                </Typography>
              </LogoExample>
            </Grid>
          </Grid>

          <Typography variant="h6" sx={{ mt: 4, mb: 2 }} fontWeight={600}>
            Uso do Logo em Código
          </Typography>
          <CodeSnippet>
            {`// Importar o componente
import ClaudIAEyeLogo from './ClaudiaLogo';

// Implementação básica
<ClaudIAEyeLogo size="medium" showText={true} />

// Tamanhos disponíveis: "small", "medium", "large", "xlarge"
// Animações ativadas
<ClaudIAEyeLogo size="large" showText={true} withAnimation={true} />`}
          </CodeSnippet>
        </Box>

        <Box sx={{ mt: 6, mb: 6 }}>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            Variações do Logo
          </Typography>
          <Typography paragraph>
            O logo pode ser utilizado em diferentes configurações, dependendo do contexto.
          </Typography>

          <Grid container spacing={4} sx={{ mt: 2 }}>
            <Grid item xs={12} sm={6} md={4}>
              <LogoExample>
                <ClaudIAEyeLogo size="large" showText={true} withAnimation={true} />
                <Typography variant="subtitle2" sx={{ mt: 2 }}>
                  Logo Completo
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Ícone + texto
                </Typography>
              </LogoExample>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <LogoExample>
                <ClaudIAEyeLogo size="large" showText={false} withAnimation={true} />
                <Typography variant="subtitle2" sx={{ mt: 2 }}>
                  Apenas Ícone
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Para espaços reduzidos
                </Typography>
              </LogoExample>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <LogoExample sx={{ bgcolor: '#1F2937', color: 'white' }}>
                <ClaudIAEyeLogo size="large" showText={true} withAnimation={true} textColor="white" />
                <Typography variant="subtitle2" sx={{ mt: 2, color: 'white' }}>
                  Fundo Escuro
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  Adaptação para contraste
                </Typography>
              </LogoExample>
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ mt: 6, mb: 3 }}>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            Área de Segurança e Uso Indevido
          </Typography>
          <Typography paragraph>
            Para preservar a integridade da marca, observe as seguintes diretrizes:
          </Typography>

          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom color="success.main" fontWeight={600} sx={{ display: 'flex', alignItems: 'center' }}>
                  <CheckIcon sx={{ mr: 1 }} /> Uso Correto
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon sx={{ color: 'success.main' }}>
                      <CheckIcon />
                    </ListItemIcon>
                    <ListItemText primary="Manter proporções originais do logo" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon sx={{ color: 'success.main' }}>
                      <CheckIcon />
                    </ListItemIcon>
                    <ListItemText primary="Respeitar área de segurança (mínimo de 20px ao redor)" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon sx={{ color: 'success.main' }}>
                      <CheckIcon />
                    </ListItemIcon>
                    <ListItemText primary="Utilizar sobre fundos que garantam contraste" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon sx={{ color: 'success.main' }}>
                      <CheckIcon />
                    </ListItemIcon>
                    <ListItemText primary="Manter as animações quando possível" />
                  </ListItem>
                </List>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom color="error.main" fontWeight={600} sx={{ display: 'flex', alignItems: 'center' }}>
                  <CancelIcon sx={{ mr: 1 }} /> Uso Incorreto
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon sx={{ color: 'error.main' }}>
                      <CancelIcon />
                    </ListItemIcon>
                    <ListItemText primary="Distorcer ou alterar proporções" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon sx={{ color: 'error.main' }}>
                      <CancelIcon />
                    </ListItemIcon>
                    <ListItemText primary="Alterar as cores para fora da paleta oficial" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon sx={{ color: 'error.main' }}>
                      <CancelIcon />
                    </ListItemIcon>
                    <ListItemText primary="Colocar sobre fundos com baixo contraste" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon sx={{ color: 'error.main' }}>
                      <CancelIcon />
                    </ListItemIcon>
                    <ListItemText primary="Adicionar sombras ou efeitos não autorizados" />
                  </ListItem>
                </List>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        <Alert severity="info" sx={{ mt: 4 }}>
          <Typography variant="body2">
            Os arquivos do logo em diferentes formatos (SVG, PNG, PDF) estão disponíveis para download 
            no repositório de design.
          </Typography>
          <Button 
            startIcon={<DownloadIcon />} 
            variant="outlined" 
            size="small" 
            sx={{ mt: 1 }}
          >
            Baixar arquivos do logo
          </Button>
        </Alert>
      </TabContent>

      {/* Colors Section */}
      <TabContent value={activeTab} index={1}>
        <Typography variant="h4" gutterBottom fontWeight={600}>
          Cores da Marca
        </Typography>
        <Typography paragraph>
          A paleta de cores da Claud.IA foi cuidadosamente selecionada para transmitir inovação,
          confiabilidade e modernidade. A cor principal é baseada em tons de roxo/azul que representam
          tecnologia e inteligência.
        </Typography>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            Cores Principais
          </Typography>
          <Grid container spacing={4}>
            {/* Primary Color */}
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <ColorBox color={brandColors.primary.main} />
                  <Typography variant="subtitle1" fontWeight={600}>Primária</Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Chip label="HEX" size="small" />
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {brandColors.primary.main}
                    </Typography>
                  </Stack>
                  <Divider sx={{ my: 1.5 }} />
                  <Typography variant="caption" color="text.secondary">
                    Usado no gradiente do olho e nos elementos principais de UI.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Secondary Color */}
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <ColorBox color={brandColors.secondary.main} />
                  <Typography variant="subtitle1" fontWeight={600}>Secundária</Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Chip label="HEX" size="small" />
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {brandColors.secondary.main}
                    </Typography>
                  </Stack>
                  <Divider sx={{ my: 1.5 }} />
                  <Typography variant="caption" color="text.secondary">
                    Complementa a cor primária em botões e links.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Tertiary Color */}
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <ColorBox color={brandColors.tertiary.main} />
                  <Typography variant="subtitle1" fontWeight={600}>Terciária</Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Chip label="HEX" size="small" />
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {brandColors.tertiary.main}
                    </Typography>
                  </Stack>
                  <Divider sx={{ my: 1.5 }} />
                  <Typography variant="caption" color="text.secondary">
                    Usado para destaques e chamadas de ação.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Accent Color */}
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <ColorBox color={brandColors.accent.main} />
                  <Typography variant="subtitle1" fontWeight={600}>Destaque</Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Chip label="HEX" size="small" />
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {brandColors.accent.main}
                    </Typography>
                  </Stack>
                  <Divider sx={{ my: 1.5 }} />
                  <Typography variant="caption" color="text.secondary">
                    Para elementos de sucesso e confirmação.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ mt: 6 }}>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            Paleta de Neutros
          </Typography>
          <Typography paragraph>
            Nossa escala de cinzas para fundos, textos e separadores.
          </Typography>

          <Grid container spacing={2}>
            {Object.entries(brandColors.neutral).map(([key, value]) => (
              <Grid item xs={6} sm={4} md={3} key={key}>
                <Box sx={{ mb: 2 }}>
                  <ColorBox color={value} />
                  <Typography variant="body2" fontWeight={500}>{`Neutro ${key}`}</Typography>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{value}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Box sx={{ mt: 6 }}>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            Gradientes
          </Typography>
          <Typography paragraph>
            Os gradientes são elementos importantes da identidade visual Claud.IA,
            especialmente no logo e em elementos de destaque.
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Paper sx={{ overflow: 'hidden', borderRadius: 2 }}>
                <Box 
                  sx={{ 
                    height: 100, 
                    background: `linear-gradient(135deg, ${brandColors.primary.main}, ${brandColors.primary.light})`,
                    mb: 2
                  }} 
                />
                <Box sx={{ p: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600}>Gradiente Principal</Typography>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block', mt: 1 }}>
                    {`linear-gradient(135deg, ${brandColors.primary.main}, ${brandColors.primary.light})`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Usado no logo e elementos de destaque.
                  </Typography>
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ overflow: 'hidden', borderRadius: 2 }}>
                <Box 
                  sx={{ 
                    height: 100, 
                    background: `linear-gradient(135deg, ${brandColors.secondary.main}, ${brandColors.tertiary.main})`,
                    mb: 2
                  }} 
                />
                <Box sx={{ p: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600}>Gradiente Secundário</Typography>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block', mt: 1 }}>
                    {`linear-gradient(135deg, ${brandColors.secondary.main}, ${brandColors.tertiary.main})`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Para botões de ação e elementos interativos.
                  </Typography>
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ overflow: 'hidden', borderRadius: 2 }}>
                <Box 
                  sx={{ 
                    height: 100, 
                    background: `linear-gradient(135deg, ${brandColors.primary.dark}, ${brandColors.tertiary.main})`,
                    mb: 2
                  }} 
                />
                <Box sx={{ p: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600}>Gradiente Alternativo</Typography>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block', mt: 1 }}>
                    {`linear-gradient(135deg, ${brandColors.primary.dark}, ${brandColors.tertiary.main})`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Para backgrounds de seções especiais.
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" sx={{ mt: 4, mb: 2 }} fontWeight={600}>
            Implementação de Cores
          </Typography>
          <CodeSnippet>
            {`// Definição do tema de cores
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '${brandColors.primary.main}',
      light: '${brandColors.primary.light}',
      dark: '${brandColors.primary.dark}',
      contrastText: '${brandColors.primary.contrastText}'
    },
    secondary: {
      main: '${brandColors.secondary.main}',
      light: '${brandColors.secondary.light}',
      dark: '${brandColors.secondary.dark}',
      contrastText: '${brandColors.secondary.contrastText}'
    },
    // Cores adicionais em customPalette para manter compatibilidade MUI
    customPalette: {
      tertiary: {
        main: '${brandColors.tertiary.main}',
        light: '${brandColors.tertiary.light}',
        dark: '${brandColors.tertiary.dark}'
      },
      accent: {
        main: '${brandColors.accent.main}',
        light: '${brandColors.accent.light}',
        dark: '${brandColors.accent.dark}'
      }
    }
  }
});`}
          </CodeSnippet>
        </Box>
      </TabContent>

      {/* Typography Section */}
      <TabContent value={activeTab} index={2}>
        <Typography variant="h4" gutterBottom fontWeight={600}>
          Tipografia
        </Typography>
        <Typography paragraph>
          A tipografia é um elemento fundamental da identidade Claud.IA, contribuindo para a
          comunicação clara e moderna da marca.
        </Typography>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            Fontes Principais
          </Typography>
          
          <Grid container spacing={4} sx={{ mt: 2 }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom fontWeight={600}>
                  Montserrat
                </Typography>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Fonte principal para títulos e logo
                </Typography>
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ fontFamily: "'Montserrat', sans-serif", mb: 2 }}>
                  <Typography sx={{ fontSize: '2rem', fontWeight: 800, mb: 1 }}>
                    Montserrat Black (800)
                  </Typography>
                  <Typography sx={{ fontSize: '1.75rem', fontWeight: 700, mb: 1 }}>
                    Montserrat Bold (700)
                  </Typography>
                  <Typography sx={{ fontSize: '1.5rem', fontWeight: 600, mb: 1 }}>
                    Montserrat SemiBold (600)
                  </Typography>
                  <Typography sx={{ fontSize: '1.25rem', fontWeight: 500, mb: 1 }}>
                    Montserrat Medium (500)
                  </Typography>
                  <Typography sx={{ fontSize: '1rem', fontWeight: 400, mb: 1 }}>
                    Montserrat Regular (400)
                  </Typography>
                </Box>
                
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="caption">
                    Recomendamos a Montserrat para todas as instâncias do logo e títulos principais.
                  </Typography>
                </Alert>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom fontWeight={600}>
                  Inter
                </Typography>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Fonte secundária para corpo de texto
                </Typography>
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ fontFamily: "'Inter', sans-serif", mb: 2 }}>
                  <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, mb: 1 }}>
                    Inter Bold (700)
                  </Typography>
                  <Typography sx={{ fontSize: '1.15rem', fontWeight: 600, mb: 1 }}>
                    Inter SemiBold (600)
                  </Typography>
                  <Typography sx={{ fontSize: '1rem', fontWeight: 500, mb: 1 }}>
                    Inter Medium (500)
                  </Typography>
                  <Typography sx={{ fontSize: '0.95rem', fontWeight: 400, mb: 1 }}>
                    Inter Regular (400)
                  </Typography>
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 300, mb: 1 }}>
                    Inter Light (300)
                  </Typography>
                </Box>
                
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="caption">
                    Inter é a fonte recomendada para corpo de texto, UI e conteúdo extenso.
                  </Typography>
                </Alert>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ mt: 6 }}>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            Hierarquia Tipográfica
          </Typography>
          <Typography paragraph>
            A hierarquia ajuda a organizar o conteúdo e guiar o usuário pela interface.
          </Typography>

          <Paper sx={{ p: 3, mt: 2 }}>
            <Box sx={{ mb: 4 }}>
              <Typography variant="h1" gutterBottom>
                Título H1
              </Typography>
              <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                Montserrat (800) | 2.5rem (40px) | Line-height: 1.2
              </Typography>
            </Box>
            
            <Box sx={{ mb: 4 }}>
              <Typography variant="h2" gutterBottom>
                Título H2
              </Typography>
              <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                Montserrat (700) | 2rem (32px) | Line-height: 1.3
              </Typography>
            </Box>
            
            <Box sx={{ mb: 4 }}>
              <Typography variant="h3" gutterBottom>
                Título H3
              </Typography>
              <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                Montserrat (700) | 1.75rem (28px) | Line-height: 1.3
              </Typography>
            </Box>
            
            <Box sx={{ mb: 4 }}>
              <Typography variant="h4" gutterBottom>
                Título H4
              </Typography>
              <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                Montserrat (600) | 1.5rem (24px) | Line-height: 1.4
              </Typography>
            </Box>
            
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom>
                Título H5
              </Typography>
              <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                Montserrat (600) | 1.25rem (20px) | Line-height: 1.4
              </Typography>
            </Box>
            
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                Título H6
              </Typography>
              <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                Montserrat (600) | 1.125rem (18px) | Line-height: 1.5
              </Typography>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Subtítulo 1
              </Typography>
              <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                Inter (600) | 1rem (16px) | Line-height: 1.5
              </Typography>
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Subtítulo 2
              </Typography>
              <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                Inter (500) | 0.875rem (14px) | Line-height: 1.6
              </Typography>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="body1" gutterBottom>
                Corpo de texto 1 - Este é o estilo principal para parágrafos e conteúdos extensos.
                Use este estilo para a maior parte do texto informativo em sua aplicação.
              </Typography>
              <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                Inter (400) | 1rem (16px) | Line-height: 1.6
              </Typography>
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Corpo de texto 2 - Este estilo é utilizado para textos secundários, legendas extensas
                e informações auxiliares que não precisam de tanto destaque quanto o texto principal.
              </Typography>
              <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                Inter (400) | 0.875rem (14px) | Line-height: 1.6
              </Typography>
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="caption" display="block" gutterBottom>
                Texto de legenda - Utilizado para legendas pequenas, notas de rodapé e informações auxiliares.
              </Typography>
              <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                Inter (400) | 0.75rem (12px) | Line-height: 1.4
              </Typography>
            </Box>
          </Paper>
        </Box>

        <Box sx={{ mt: 6 }}>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            Implementação no Material UI
          </Typography>
          <CodeSnippet>
            {`// Configuração de tipografia no tema
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  typography: {
    fontFamily: "'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif",
    h1: {
      fontFamily: "'Montserrat', sans-serif",
      fontWeight: 800,
      fontSize: '2.5rem',
      lineHeight: 1.2
    },
    h2: {
      fontFamily: "'Montserrat', sans-serif",
      fontWeight: 700,
      fontSize: '2rem',
      lineHeight: 1.3
    },
    h3: {
      fontFamily: "'Montserrat', sans-serif",
      fontWeight: 700,
      fontSize: '1.75rem',
      lineHeight: 1.3
    },
    h4: {
      fontFamily: "'Montserrat', sans-serif",
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.4
    },
    h5: {
      fontFamily: "'Montserrat', sans-serif",
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.4
    },
    h6: {
      fontFamily: "'Montserrat', sans-serif",
      fontWeight: 600,
      fontSize: '1.125rem',
      lineHeight: 1.5
    },
    subtitle1: {
      fontWeight: 600,
      fontSize: '1rem',
      lineHeight: 1.5
    },
    subtitle2: {
      fontWeight: 500,
      fontSize: '0.875rem',
      lineHeight: 1.6
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6
    },
    button: {
      fontWeight: 500,
      textTransform: 'none'
    }
  }
});`}
          </CodeSnippet>
        </Box>
      </TabContent>

      {/* Applications Section */}
      <TabContent value={activeTab} index={3}>
        <Typography variant="h4" gutterBottom fontWeight={600}>
          Aplicações
        </Typography>
        <Typography paragraph>
          Exemplos de como aplicar a identidade visual da Claud.IA em diversos contextos e plataformas.
        </Typography>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            Web e Mobile
          </Typography>
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <ComputerIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6" fontWeight={600}>
                    Web
                  </Typography>
                </Box>
                <Box sx={{ mb: 3, p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, p: 1, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
                    <ClaudIAEyeLogo size="small" showText={true} withAnimation={true} />
                    <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
                      <Button size="small" color="primary" variant="text">Início</Button>
                      <Button size="small" color="primary" variant="text">Recursos</Button>
                      <Button size="small" color="primary" variant="contained">Login</Button>
                    </Box>
                  </Box>
                  <Box sx={{ p: 1, textAlign: 'center', height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                    <Typography variant="h5" fontWeight={600} gutterBottom>
                      Título da Página
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Conteúdo do site com tipografia e cores da marca
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="body2">
                  Para aplicações web, mantenha consistência usando a tipografia e cores 
                  em todos os elementos de UI, garantindo contraste adequado e alinhamento
                  com as diretrizes da marca.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <SmartphoneIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6" fontWeight={600}>
                    Mobile
                  </Typography>
                </Box>
                <Box sx={{ mb: 3, p: 1, border: '1px dashed', borderColor: 'divider', borderRadius: 1, width: 160, mx: 'auto' }}>
                  <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'center' }}>
                      <ClaudIAEyeLogo size="small" showText={true} withAnimation={true} />
                    </Box>
                    <Box sx={{ p: 1, height: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography variant="caption" fontWeight={500} sx={{ mb: 1, textAlign: 'center' }}>
                        Aplicativo Mobile
                      </Typography>
                      <Button 
                        variant="contained" 
                        size="small" 
                        sx={{ 
                          mb: 1, 
                          fontSize: '0.7rem',
                          background: `linear-gradient(135deg, ${brandColors.primary.main}, ${brandColors.primary.light})`,
                        }}
                      >
                        Ação Principal
                      </Button>
                      <Button 
                        variant="outlined" 
                        size="small" 
                        sx={{ fontSize: '0.7rem' }}
                      >
                        Ação Secundária
                      </Button>
                    </Box>
                  </Box>
                </Box>
                <Typography variant="body2">
                  Em aplicativos móveis, priorize a versão reduzida do logo em 
                  espaços limitados. Mantenha a identidade visual com a paleta 
                  de cores oficial e a hierarquia de tipografia adequada para 
                  telas menores.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ mt: 6 }}>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            Design System e Componentes
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom fontWeight={600}>
                  Botões
                </Typography>
                <Box sx={{ mt: 2, mb: 3 }}>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    fullWidth 
                    sx={{ mb: 2 }}
                  >
                    Botão Primário
                  </Button>
                  <Button 
                    variant="outlined" 
                    color="primary" 
                    fullWidth 
                    sx={{ mb: 2 }}
                  >
                    Botão Secundário
                  </Button>
                  <Button 
                    variant="text" 
                    color="primary" 
                    fullWidth
                  >
                    Botão de Texto
                  </Button>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Botões seguem a hierarquia visual da marca, com cantos arredondados e 
                  tipografia consistente.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom fontWeight={600}>
                  Cards e Painéis
                </Typography>
                <Box 
                  sx={{ 
                    mt: 2, 
                    mb: 3, 
                    p: 2, 
                    borderRadius: 2, 
                    border: '1px solid', 
                    borderColor: 'divider',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                  }}
                >
                  <Typography variant="subtitle1" gutterBottom fontWeight={600}>
                    Título do Card
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    Conteúdo com informações relevantes seguindo o padrão de tipografia.
                  </Typography>
                  <Button size="small" color="primary">
                    Ação
                  </Button>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Cards e painéis utilizam sombras sutis e bordas consistentes 
                  com o estilo da marca.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom fontWeight={600}>
                  Formulários
                </Typography>
                <Box sx={{ mt: 2, mb: 3 }}>
                  <TextField 
                    label="Campo de texto" 
                    variant="outlined" 
                    size="small"
                    fullWidth
                    sx={{ mb: 2 }}
                  />
                  <TextField 
                    label="Campo com erro" 
                    variant="outlined"
                    size="small" 
                    fullWidth
                    error
                    helperText="Mensagem de erro"
                    sx={{ mb: 2 }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Inputs e formulários seguem as cores e estilos da marca para 
                  manter a consistência visual.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ mt: 6 }}>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            Outros Materiais
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <PrintIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6" fontWeight={600}>
                    Material Impresso
                  </Typography>
                </Box>
                <Box sx={{ mb: 3 }}>
                  <img 
                    src="/api/placeholder/500/250" 
                    alt="Exemplo de cartão de visita e papelaria" 
                    style={{ 
                      width: '100%', 
                      height: 'auto', 
                      borderRadius: '8px', 
                      objectFit: 'cover' 
                    }} 
                  />
                </Box>
                <Typography variant="body2">
                  Para materiais impressos como cartões de visita, folhetos e apresentações,
                  utilize sempre a versão de alta resolução do logo e mantenha a área de 
                  proteção adequada ao redor dele.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <InfoIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6" fontWeight={600}>
                    Redes Sociais
                  </Typography>
                </Box>
                <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 120,
                      height: 120,
                      borderRadius: '50%',
                      bgcolor: 'background.paper',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid',
                      borderColor: 'divider'
                    }}
                  >
                    <ClaudIAEyeLogo size="large" showText={false} withAnimation={true} />
                  </Box>
                  <Box
                    sx={{
                      width: 120,
                      height: 120,
                      borderRadius: 2,
                      bgcolor: 'background.paper',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid',
                      borderColor: 'divider',
                      background: `linear-gradient(135deg, ${brandColors.primary.main}, ${brandColors.tertiary.main})`
                    }}
                  >
                    <ClaudIAEyeLogo size="medium" showText={true} textColor="white" withAnimation={true} />
                  </Box>
                </Box>
                <Typography variant="body2">
                  Para perfis em redes sociais, utilize a versão do logo mais adequada
                  para cada plataforma - circular para perfis e quadrada para posts.
                  Mantenha a consistência visual em todas as comunicações.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        <Alert severity="info" sx={{ mt: 6 }}>
          <Typography variant="subtitle2" gutterBottom fontWeight={600}>
            Download dos Assets
          </Typography>
          <Typography variant="body2" paragraph>
            Acesse nosso repositório de design para obter todos os elementos visuais
            da marca em alta resolução, incluindo logotipos, paletas de cores e templates.
          </Typography>
          <Button 
            startIcon={<DownloadIcon />} 
            variant="outlined" 
            color="primary"
          >
            Baixar pacote de brand assets
          </Button>
        </Alert>
      </TabContent>
    </Container>
  );
};

export default ClaudiaBrandGuidelines;