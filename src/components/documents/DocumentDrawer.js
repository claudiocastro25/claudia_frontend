Plano de Implementação Detalhado
1. Área de Visualização (Frontend)
Modificar ChatContainer.js

Adicionar estado para controlar a exibição da área de visualização (showVisualizationDrawer)
Integrar o novo componente VisualizationDrawer
Adicionar handlers para abrir/fechar a gaveta de visualizações
Adicionar lógica para detectar quando o assistente envia conteúdo visualizável

Modificar VisualizationContainer.js

Adicionar suporte para mais tipos de visualizações (tabelas, grafos, imagens SVG)
Implementar funcionalidades de exportação (PNG, SVG, CSV)
Adicionar opção de favoritar visualização
Melhorar a UI para ser mais integrada ao estilo da aplicação

Criar VisualizationDrawer.js
jsximport React, { useState } from 'react';
import { Box, Drawer, IconButton, Typography, Tabs, Tab } from '@mui/material';
import { Close, Download, Bookmark, Share } from '@mui/icons-material';
import VisualizationContainer from './VisualizationContainer';

const VisualizationDrawer = ({ 
  open, 
  onClose, 
  visualizationData = [], 
  onExport, 
  onFavorite 
}) => {
  const [activeTab, setActiveTab] = useState(0);
  
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 600 }, p: 0 }
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%' 
      }}>
        {/* Header */}
        <Box sx={{ 
          p: 2, 
          display: 'flex', 
          alignItems: 'center', 
          borderBottom: '1px solid', 
          borderColor: 'divider' 
        }}>
          <Typography variant="h6" sx={{ flex: 1 }}>
            Visualizações
          </Typography>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
        
        {/* Tabs for multiple visualizations */}
        {visualizationData.length > 1 && (
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider' }}
          >
            {visualizationData.map((data, index) => (
              <Tab 
                key={index} 
                label={data.title || `Visualização ${index + 1}`} 
              />
            ))}
          </Tabs>
        )}
        
        {/* Visualization content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {visualizationData.length > 0 ? (
            <VisualizationContainer 
              data={visualizationData[activeTab]?.data || []}
              title={visualizationData[activeTab]?.title}
              type={visualizationData[activeTab]?.type}
              options={visualizationData[activeTab]?.options}
            />
          ) : (
            <Typography variant="body1" color="text.secondary" align="center">
              Nenhuma visualização disponível
            </Typography>
          )}
        </Box>
        
        {/* Action buttons */}
        <Box sx={{ 
          p: 2, 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: 1,
          borderTop: '1px solid', 
          borderColor: 'divider' 
        }}>
          <IconButton 
            onClick={() => onFavorite(visualizationData[activeTab])}
            color="primary"
            title="Favoritar visualização"
          >
            <Bookmark />
          </IconButton>
          <IconButton 
            onClick={() => onExport(visualizationData[activeTab], 'png')}
            color="primary"
            title="Exportar como imagem"
          >
            <Download />
          </IconButton>
          <IconButton 
            onClick={() => onExport(visualizationData[activeTab], 'csv')}
            color="primary"
            title="Exportar dados"
          >
            <Share />
          </IconButton>
        </Box>
      </Box>
    </Drawer>
  );
};

export default VisualizationDrawer;
2. Correção das Telas de Documentos
Modificar DocumentPanel.js

Corrigir a exibição de documentos associados à conversa
Adicionar opção de filtrar por tipo de documento
Melhorar a UI para mostrar mais informações (tamanho, data, etc.)
Adicionar preview de documentos quando disponível

Modificar DocumentChip.js

Atualizar para mostrar um ícone maior e mais claro do tipo de documento
Adicionar tooltip com informações detalhadas
Melhorar a interação para abrir o documento

Modificar MessageItem.js

Adicionar um componente dedicado para exibir documentos referenciados
Estilizar a exibição de documentos anexos para ser mais visual
Facilitar a navegação para visualizar documentos

Criar DocumentReference.js
jsximport React from 'react';
import { Box, Typography, Chip, Card, CardContent, CardActionArea } from '@mui/material';
import { 
  PictureAsPdf, Description, TableChart, Image, DataObject, Article 
} from '@mui/icons-material';

const getDocumentIcon = (fileType) => {
  switch (fileType?.toLowerCase()) {
    case 'pdf': return <PictureAsPdf color="error" />;
    case 'docx':
    case 'doc': return <Description color="primary" />;
    case 'xlsx':
    case 'xls':
    case 'csv': return <TableChart color="success" />;
    case 'json': return <DataObject color="warning" />;
    case 'jpg':
    case 'jpeg':
    case 'png': return <Image color="secondary" />;
    default: return <Article color="action" />;
  }
};

const DocumentReference = ({ documents = [], onViewDocument }) => {
  if (!documents || documents.length === 0) return null;
  
  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Documentos referenciados ({documents.length})
      </Typography>
      
      <Box 
        sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 1.5
        }}
      >
        {documents.map((doc, index) => (
          <Card 
            key={doc.document_id || index}
            variant="outlined"
            sx={{ 
              width: 120, 
              transition: 'all 0.2s',
              '&:hover': {
                boxShadow: 2,
                transform: 'translateY(-2px)'
              }
            }}
          >
            <CardActionArea onClick={() => onViewDocument(doc)}>
              <Box 
                sx={{ 
                  height: 80, 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 2,
                  svg: { fontSize: 40 }
                }}
              >
                {getDocumentIcon(doc.file_type)}
              </Box>
              <CardContent sx={{ py: 1, px: 1 }}>
                <Typography 
                  variant="caption" 
                  component="div" 
                  noWrap
                  title={doc.filename}
                >
                  {doc.filename}
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>
    </Box>
  );
};

export default DocumentReference;
3. Feedback de Processamento Amigável
Modificar DocumentUploader.js

Adicionar um componente de feedback visual durante o upload e processamento
Implementar mensagens amigáveis e animadas durante o processo
Criar uma barra de progresso mais detalhada

Criar ProcessingFeedback.js
jsximport React, { useState, useEffect } from 'react';
import { 
  Box, Typography, LinearProgress, Paper, 
  Fade, Alert, Avatar
} from '@mui/material';
import { 
  CloudUpload, BarChart, Search, Check, 
  DataObject, Psychology
} from '@mui/icons-material';

// Mensagens amigáveis para cada fase do processamento
const PROCESSING_MESSAGES = [
  {
    phase: 'uploading',
    messages: [
      "Enviando seu documento para a nuvem...",
      "Preparando o arquivo para processamento...",
      "Estabelecendo conexão segura para envio...",
      "Já recebi uma parte do seu documento...",
      "Quase lá! Finalizando o upload..."
    ],
    icon: <CloudUpload color="primary" />
  },
  {
    phase: 'processing',
    messages: [
      "Analisando a estrutura do documento...",
      "Reconhecendo o conteúdo das páginas...",
      "Extraindo informações valiosas...",
      "Organizando os dados para análise...",
      "Identificando conceitos importantes..."
    ],
    icon: <Search color="primary" />
  },
  {
    phase: 'analyzing',
    messages: [
      "Aplicando inteligência para compreender o conteúdo...",
      "Relacionando informações entre diferentes partes...",
      "Descobrindo padrões interessantes nos dados...",
      "Preparando visualizações e resumos...",
      "Fazendo as conexões finais entre os conceitos..."
    ],
    icon: <Psychology color="primary" />
  },
  {
    phase: 'structuring',
    messages: [
      "Estruturando dados para melhor compreensão...",
      "Preparando tabelas e gráficos para visualização...",
      "Refinando a apresentação da informação...",
      "Gerando insights a partir dos dados...",
      "Otimizando para consultas rápidas..."
    ],
    icon: <BarChart color="primary" />
  },
  {
    phase: 'finalizing',
    messages: [
      "Finalizando o processamento...",
      "Validando a qualidade da extração...",
      "Tudo pronto para suas perguntas!",
      "Documento processado com sucesso!",
      "Pronto para explorar o conteúdo!"
    ],
    icon: <Check color="success" />
  }
];

const ProcessingFeedback = ({ status, progress, filename, error }) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('uploading');
  
  // Definir a fase atual com base no progresso
  useEffect(() => {
    if (progress < 20) setCurrentPhase('uploading');
    else if (progress < 40) setCurrentPhase('processing');
    else if (progress < 60) setCurrentPhase('analyzing');
    else if (progress < 80) setCurrentPhase('structuring');
    else setCurrentPhase('finalizing');
  }, [progress]);
  
  // Rotacionar as mensagens a cada 4 segundos
  useEffect(() => {
    if (status === 'error') return;
    
    const interval = setInterval(() => {
      const phaseMessages = PROCESSING_MESSAGES.find(p => p.phase === currentPhase)?.messages || [];
      setMessageIndex(prev => (prev + 1) % phaseMessages.length);
    }, 4000);
    
    return () => clearInterval(interval);
  }, [currentPhase, status]);
  
  // Selecionar a mensagem atual
  const currentMessages = PROCESSING_MESSAGES.find(p => p.phase === currentPhase)?.messages || [];
  const currentMessage = currentMessages[messageIndex] || "Processando documento...";
  const currentIcon = PROCESSING_MESSAGES.find(p => p.phase === currentPhase)?.icon;
  
  if (status === 'error') {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Erro ao processar "{filename}": {error}
      </Alert>
    );
  }

  if (status === 'completed') {
    return (
      <Alert severity="success" sx={{ mb: 2 }}>
        Documento "{filename}" processado com sucesso!
      </Alert>
    );
  }
  
  return (
    <Fade in={status === 'uploading' || status === 'processing'}>
      <Paper 
        elevation={0} 
        variant="outlined"
        sx={{ 
          p: 2, 
          mb: 2, 
          borderRadius: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        <Box sx={{ 
          mb: 2, 
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          gap: 2
        }}>
          <Avatar sx={{ bgcolor: 'primary.light' }}>
            {currentIcon}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Processando: {filename}
            </Typography>
            <Fade in key={currentMessage}>
              <Typography variant="body2" color="text.secondary">
                {currentMessage}
              </Typography>
            </Fade>
          </Box>
        </Box>
        
        <LinearProgress 
          variant="determinate" 
          value={progress} 
          sx={{ 
            width: '100%', 
            height: 6,
            borderRadius: 3
          }} 
        />
        
        <Typography 
          variant="caption" 
          color="text.secondary" 
          align="right" 
          sx={{ width: '100%', mt: 1 }}
        >
          {Math.round(progress)}% completo
        </Typography>
      </Paper>
    </Fade>
  );
};

export default ProcessingFeedback;
4. Exibição de Documentos e Drawer de Documentos
Modificar DocumentPanel.js

Criar uma visualização em grade com ícones grandes
Adicionar preview do conteúdo quando disponível
Melhorar a navegação entre documentos
Adicionar opções de filtro por tipo e estado

Modificar MessageItem.js

Integrar o novo componente DocumentReference
Garantir que documentos específicos sejam destacados
Melhorar a exibição das referências

Criar DocumentDrawer.js
jsximport React, { useState, useEffect } from 'react';
import { 
  Box, 
  Drawer, 
  Typography, 
  IconButton, 
  Divider, 
  Grid,
  Card, 
  CardContent, 
  CardActionArea,
  CardMedia,
  Badge,
  Chip,
  Tabs,
  Tab,
  Button,
  TextField,
  InputAdornment
} from '@mui/material';
import { 
  Close, 
  PictureAsPdf, 
  Description, 
  TableChart, 
  Search,
  FilterList,
  SortByAlpha,
  Delete
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const DocumentDrawer = ({ 
  open, 
  onClose, 
  documents = [], 
  onViewDocument, 
  onDeleteDocument,
  conversationId 
}) => {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredDocs, setFilteredDocs] = useState(documents);
  
  // Filtrar documentos quando a consulta ou a aba mudar
  useEffect(() => {
    let filtered = [...documents];
    
    // Filtrar por tipo (aba)
    if (activeTab !== 'all') {
      filtered = filtered.filter(doc => 
        doc.file_type?.toLowerCase() === activeTab.toLowerCase()
      );
    }
    
    // Filtrar por consulta de pesquisa
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc => 
        doc.filename?.toLowerCase().includes(query) || 
        doc.file_type?.toLowerCase().includes(query)
      );
    }
    
    setFilteredDocs(filtered);
  }, [documents, activeTab, searchQuery]);
  
  // Contagem por tipo de documento para mostrar nas abas
  const docCounts = documents.reduce((acc, doc) => {
    const type = doc.file_type?.toLowerCase() || 'other';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, { all: documents.length });
  
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 500, md: 650 }, p: 0 }
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%' 
      }}>
        {/* Header */}
        <Box sx={{ 
          p: 2, 
          display: 'flex', 
          alignItems: 'center', 
          borderBottom: '1px solid', 
          borderColor: 'divider' 
        }}>
          <Typography variant="h6" sx={{ flex: 1 }}>
            Documentos ({documents.length})
          </Typography>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
        
        {/* Search and filters */}
        <Box sx={{ 
          p: 2, 
          display: 'flex', 
          alignItems: 'center', 
          borderBottom: '1px solid', 
          borderColor: 'divider' 
        }}>
          <TextField
            size="small"
            placeholder="Buscar documentos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ flex: 1, mr: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <IconButton size="small" sx={{ mr: 1 }}>
            <FilterList fontSize="small" />
          </IconButton>
          <IconButton size="small">
            <SortByAlpha fontSize="small" />
          </IconButton>
        </Box>
        
        {/* Tabs for filtering by type */}
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ 
            px: 2,
            borderBottom: '1px solid', 
            borderColor: 'divider' 
          }}
        >
          <Tab 
            label={`Todos (${docCounts.all || 0})`} 
            value="all" 
          />
          {docCounts.pdf && (
            <Tab 
              label={`PDF (${docCounts.pdf})`} 
              value="pdf" 
              icon={<PictureAsPdf fontSize="small" color="error" />}
              iconPosition="start"
            />
          )}
          {docCounts.docx && (
            <Tab 
              label={`DOCX (${docCounts.docx})`} 
              value="docx" 
              icon={<Description fontSize="small" color="primary" />}
              iconPosition="start"
            />
          )}
          {docCounts.xlsx && (
            <Tab 
              label={`XLSX (${docCounts.xlsx})`} 
              value="xlsx" 
              icon={<TableChart fontSize="small" color="success" />}
              iconPosition="start"
            />
          )}
          {/* Add more tabs for other document types */}
        </Tabs>
        
        {/* Document grid */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {filteredDocs.length > 0 ? (
            <Grid container spacing={2}>
              {filteredDocs.map((doc) => (
                <Grid item xs={6} sm={4} md={4} key={doc.document_id}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card 
                      variant="outlined"
                      sx={{ 
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'all 0.2s',
                        '&:hover': {
                          boxShadow: 3,
                          transform: 'translateY(-4px)'
                        }
                      }}
                    >
                      <CardActionArea 
                        onClick={() => onViewDocument(doc)}
                        sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                      >
                        <Box 
                          sx={{ 
                            p: 3,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: 100
                          }}
                        >
                          {doc.file_type === 'pdf' && <PictureAsPdf sx={{ fontSize: 60 }} color="error" />}
                          {(doc.file_type === 'docx' || doc.file_type === 'doc') && 
                            <Description sx={{ fontSize: 60 }} color="primary" />}
                          {(doc.file_type === 'xlsx' || doc.file_type === 'xls' || doc.file_type === 'csv') && 
                            <TableChart sx={{ fontSize: 60 }} color="success" />}
                          {/* Add more icons for other types */}
                        </Box>
                        
                        <CardContent sx={{ pt: 1, pb: 1, flex: 1 }}>
                          <Typography 
                            variant="subtitle2" 
                            component="div" 
                            gutterBottom
                            noWrap
                            title={doc.original_filename || doc.filename}
                          >
                            {doc.original_filename || doc.filename}
                          </Typography>
                          
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            mt: 0.5
                          }}>
                            <Chip 
                              label={doc.file_type.toUpperCase()} 
                              size="small"
                              color={
                                doc.file_type === 'pdf' ? 'error' :
                                doc.file_type === 'docx' ? 'primary' :
                                doc.file_type === 'xlsx' ? 'success' :
                                'default'
                              }
                              variant="outlined"
                              sx={{ height: 20, '& .MuiChip-label': { px: 1, fontSize: '0.625rem' } }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              {doc.status === 'completed' ? 'Pronto' : doc.status}
                            </Typography>
                          </Box>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 4
            }}>
              <Box sx={{ 
                mb: 2, 
                color: 'text.disabled',
                '& svg': { fontSize: 60 }
              }}>
                <Description fontSize="large" />
              </Box>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                {searchQuery 
                  ? 'Nenhum documento corresponde à sua busca' 
                  : 'Nenhum documento encontrado'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {searchQuery 
                  ? 'Tente outros termos de busca' 
                  : 'Adicione documentos à conversa para começar'}
              </Typography>
            </Box>
          )}
        </Box>
        
        {/* Footer actions */}
        <Box sx={{ 
          p: 2, 
          borderTop: '1px solid', 
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <Button 
            variant="outlined" 
            color="error" 
            startIcon={<Delete />}
            onClick={() => {
              /* Implementar lógica para excluir documentos selecionados */
              onDeleteDocument && onDeleteDocument(null);
            }}
          >
            Remover selecionados
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

export default DocumentDrawer;