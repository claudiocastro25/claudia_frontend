import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  IconButton, 
  Tooltip, 
  Tabs, 
  Tab, 
  Menu, 
  MenuItem, 
  ListItemIcon, 
  ListItemText,
  Button,
  useTheme
} from '@mui/material';
import { alpha } from '@mui/material/styles'; // Importação adicionada
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer, 
  ScatterChart, 
  Scatter
} from 'recharts';
import { 
  BarChart2, 
  TrendingUp, 
  PieChart as PieIcon, 
  Download,
  ChevronUp, 
  ChevronDown, 
  TableProperties, 
  MoreVertical,
  FileText,
  Copy,
  Image,
  Layers,
  Maximize2,
  Minimize2,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import DataTable from './DataTable';

// Cores para os gráficos
const COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#F97316', '#10B981', '#06B6D4', '#3B82F6',
  '#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c', '#d0ed57', '#ffc658'
];

const VisualizationContainer = ({ 
  data = [], 
  title = "Data Visualization",
  description = "Interactive visualization of your data",
  defaultType = 'bar',
  onExport,
  allowTableView = true
}) => {
  const theme = useTheme();
  const containerRef = useRef(null);
  
  // Estados
  const [chartType, setChartType] = useState(defaultType);
  const [expandedView, setExpandedView] = useState(false);
  const [tableView, setTableView] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 400 });
  
  // Determinar a estrutura dos dados
  const firstElement = data && data.length > 0 ? data[0] : {};
  const dataKeys = Object.keys(firstElement)
    .filter(key => typeof firstElement[key] === 'number');
  const categoryKey = Object.keys(firstElement)
    .find(key => typeof firstElement[key] === 'string') || 'name';
  
  // Atualizar dimensões quando o componente montar ou a janela redimensionar
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        setDimensions({
          width: width,
          height: expandedView ? 500 : 400
        });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, [expandedView]);
  
  // Atualizar altura quando expandedView mudar
  useEffect(() => {
    setDimensions(prev => ({
      ...prev,
      height: expandedView ? 500 : 400
    }));
  }, [expandedView]);
  
  // Abrir menu
  const handleOpenMenu = (event) => {
    setMenuAnchorEl(event.currentTarget);
  };
  
  // Fechar menu
  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
  };
  
  // Alternar entre visualização expandida/compacta
  const toggleExpandedView = () => {
    setExpandedView(!expandedView);
  };
  
  // Alternar entre visualização de gráfico/tabela
  const toggleTableView = () => {
    setTableView(!tableView);
    handleCloseMenu();
  };
  
  // Exportar dados para CSV
  const exportToCSV = () => {
    if (!data || data.length === 0) return;
    
    // Obter cabeçalhos
    const headers = Object.keys(data[0]);
    
    // Converter dados para CSV
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Lidar com valores que precisam de aspas
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value !== undefined && value !== null ? value : '';
        }).join(',')
      )
    ].join('\n');
    
    // Criar link de download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${title.replace(/\s+/g, '_').toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    handleCloseMenu();
  };
  
  // Copiar dados para a área de transferência como JSON
  const copyAsJSON = () => {
    if (!data || data.length === 0) return;
    
    const jsonString = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(jsonString);
    
    // Todo: Adicionar notificação de sucesso
    handleCloseMenu();
  };
  
  // Renderizar gráfico conforme o tipo selecionado
  const renderChart = () => {
    if (!data || data.length === 0) {
      return (
        <Box 
          sx={{ 
            height: dimensions.height, 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            p: 3,
            backgroundColor: theme.palette.mode === 'dark' 
              ? alpha(theme.palette.background.paper, 0.5) 
              : alpha(theme.palette.grey[50], 0.8),
            borderRadius: 2
          }}
        >
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Nenhum dado disponível para visualização
          </Typography>
          <Button 
            variant="outlined" 
            size="small"
            startIcon={<RefreshCw size={16} />}
          >
            Atualizar
          </Button>
        </Box>
      );
    }
    
    // Configurações comuns para todos os gráficos
    const commonProps = {
      data,
      margin: { top: 10, right: 30, left: 10, bottom: 10 }
    };
    
    switch(chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={dimensions.height}>
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis 
                dataKey={categoryKey} 
                tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                stroke={theme.palette.divider}
              />
              <YAxis 
                tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                stroke={theme.palette.divider}
              />
              <RechartsTooltip 
                contentStyle={{ 
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 4,
                  boxShadow: theme.shadows[3]
                }}
              />
              <Legend />
              {dataKeys.map((key, index) => (
                <Line 
                  key={key}
                  type="monotone" 
                  dataKey={key} 
                  stroke={COLORS[index % COLORS.length]} 
                  activeDot={{ r: 8 }} 
                  strokeWidth={2}
                  name={key.charAt(0).toUpperCase() + key.slice(1)}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
        
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={dimensions.height}>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis 
                dataKey={categoryKey} 
                tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                stroke={theme.palette.divider}
              />
              <YAxis 
                tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                stroke={theme.palette.divider}
              />
              <RechartsTooltip 
                contentStyle={{ 
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 4,
                  boxShadow: theme.shadows[3]
                }}
              />
              <Legend />
              {dataKeys.map((key, index) => (
                <Bar 
                  key={key} 
                  dataKey={key} 
                  fill={COLORS[index % COLORS.length]} 
                  name={key.charAt(0).toUpperCase() + key.slice(1)}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
        
      case 'pie':
        // Para gráfico de pizza, usamos o primeiro valor numérico
        const pieDataKey = dataKeys[0];
        
        return (
          <ResponsiveContainer width="100%" height={dimensions.height}>
            <PieChart>
              <RechartsTooltip 
                contentStyle={{ 
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 4,
                  boxShadow: theme.shadows[3]
                }}
              />
              <Legend />
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={expandedView ? 180 : 140}
                fill="#8884d8"
                dataKey={pieDataKey}
                nameKey={categoryKey}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        );
        
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={dimensions.height}>
            <AreaChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis 
                dataKey={categoryKey} 
                tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                stroke={theme.palette.divider}
              />
              <YAxis 
                tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                stroke={theme.palette.divider}
              />
              <RechartsTooltip 
                contentStyle={{ 
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 4,
                  boxShadow: theme.shadows[3]
                }}
              />
              <Legend />
              {dataKeys.map((key, index) => (
                <Area 
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={COLORS[index % COLORS.length]}
                  fill={COLORS[index % COLORS.length]}
                  fillOpacity={0.3}
                  name={key.charAt(0).toUpperCase() + key.slice(1)}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );
        
      default:
        return (
          <ResponsiveContainer width="100%" height={dimensions.height}>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis 
                dataKey={categoryKey} 
                tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                stroke={theme.palette.divider}
              />
              <YAxis 
                tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                stroke={theme.palette.divider}
              />
              <RechartsTooltip 
                contentStyle={{ 
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 4,
                  boxShadow: theme.shadows[3]
                }}
              />
              <Legend />
              {dataKeys.map((key, index) => (
                <Bar 
                  key={key} 
                  dataKey={key} 
                  fill={COLORS[index % COLORS.length]} 
                  name={key.charAt(0).toUpperCase() + key.slice(1)}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };
  
  return (
    <Paper
      elevation={2}
      ref={containerRef}
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        mb: 4,
        transition: 'all 0.3s ease',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: theme.palette.mode === 'dark' 
          ? '0 5px 20px rgba(0,0,0,0.3)' 
          : '0 5px 20px rgba(0,0,0,0.07)'
      }}
      className="data-visualization-container"
    >
      {/* Cabeçalho */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
          backgroundColor: theme.palette.mode === 'dark' 
            ? alpha(theme.palette.background.paper, 0.7)
            : theme.palette.background.paper
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={600}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {/* Seletor de tipo de gráfico */}
          <Tabs
            value={chartType}
            onChange={(e, newValue) => setChartType(newValue)}
            aria-label="chart type selector"
            sx={{ 
              minHeight: 36,
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: 1.5
              },
              '& .MuiTab-root': {
                minHeight: 36,
                minWidth: 60,
                p: 1
              }
            }}
          >
            <Tab 
              icon={<BarChart2 size={20} />} 
              aria-label="Bar Chart" 
              value="bar"
              sx={{ p: 1 }}
            />
            <Tab 
              icon={<TrendingUp size={20} />} 
              aria-label="Line Chart" 
              value="line"
              sx={{ p: 1 }}
            />
            <Tab 
              icon={<PieIcon size={20} />} 
              aria-label="Pie Chart" 
              value="pie"
              sx={{ p: 1 }}
            />
          </Tabs>
          
          {/* Menu de opções */}
          <Tooltip title="Mais opções">
            <IconButton 
              onClick={handleOpenMenu}
              size="small"
              sx={{ ml: 1 }}
            >
              <MoreVertical size={20} />
            </IconButton>
          </Tooltip>
          
          <Menu
            anchorEl={menuAnchorEl}
            open={Boolean(menuAnchorEl)}
            onClose={handleCloseMenu}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            PaperProps={{
              sx: {
                mt: 0.5,
                minWidth: 180,
                boxShadow: theme.shadows[3],
                '& .MuiMenuItem-root': {
                  py: 1,
                  px: 2
                }
              }
            }}
          >
            {allowTableView && (
              <MenuItem onClick={toggleTableView}>
                <ListItemIcon>
                  <TableProperties size={18} />
                </ListItemIcon>
                <ListItemText primary={tableView ? "Mostrar gráfico" : "Ver como tabela"} />
              </MenuItem>
            )}
            <MenuItem onClick={toggleExpandedView}>
              <ListItemIcon>
                {expandedView ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </ListItemIcon>
              <ListItemText primary={expandedView ? "Reduzir" : "Expandir"} />
            </MenuItem>
            <MenuItem onClick={exportToCSV}>
              <ListItemIcon>
                <FileText size={18} />
              </ListItemIcon>
              <ListItemText primary="Exportar CSV" />
            </MenuItem>
            <MenuItem onClick={copyAsJSON}>
              <ListItemIcon>
                <Copy size={18} />
              </ListItemIcon>
              <ListItemText primary="Copiar como JSON" />
            </MenuItem>
            <MenuItem onClick={handleCloseMenu}>
              <ListItemIcon>
                <Image size={18} />
              </ListItemIcon>
              <ListItemText primary="Salvar como imagem" />
            </MenuItem>
          </Menu>
        </Box>
      </Box>
      
      {/* Área principal - gráfico ou tabela */}
      <Box
        sx={{
          transition: 'height 0.3s ease',
          backgroundColor: theme.palette.mode === 'dark' 
            ? alpha(theme.palette.background.paper, 0.4) 
            : alpha(theme.palette.background.default, 0.5),
          p: 2
        }}
      >
        {tableView ? (
          <DataTable 
            data={data} 
            title={title}
            onCreateChart={() => setTableView(false)}
          />
        ) : (
          renderChart()
        )}
      </Box>
      
      {/* Rodapé com amostra de dados */}
      {!tableView && (
        <Box
          sx={{
            p: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            backgroundColor: theme.palette.mode === 'dark' 
              ? alpha(theme.palette.background.paper, 0.7)
              : theme.palette.background.paper
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Amostra de dados
            </Typography>
            <Button
              variant="text"
              size="small"
              startIcon={<TableProperties size={16} />}
              onClick={toggleTableView}
              sx={{ textTransform: 'none' }}
            >
              Ver tabela completa
            </Button>
          </Box>
          
          <Box sx={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              fontSize: '0.75rem',
              textAlign: 'left'
            }}>
              <thead>
                <tr>
                  {Object.keys(firstElement).map(key => (
                    <th key={key} style={{ 
                      padding: '8px', 
                      borderBottom: `1px solid ${theme.palette.divider}`,
                      fontWeight: 600,
                      color: theme.palette.text.secondary
                    }}>
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 3).map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {Object.keys(row).map((key, cellIndex) => (
                      <td 
                        key={`${rowIndex}-${cellIndex}`}
                        style={{
                          padding: '8px',
                          borderBottom: `1px solid ${theme.palette.divider}`,
                          color: theme.palette.text.secondary
                        }}
                      >
                        {typeof row[key] === 'number' 
                          ? row[key].toLocaleString() 
                          : String(row[key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
          
          {data.length > 3 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
              Exibindo 3 de {data.length} linhas
            </Typography>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default VisualizationContainer;