import React, { useState, useEffect, useRef } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
  ScatterChart, Scatter, AreaChart, Area
} from 'recharts';
import { Box, Typography, useTheme } from '@mui/material';

/**
 * Componente de visualização de dados que suporta diferentes tipos de gráficos
 * 
 * @param {Array} data - Array de objetos com os dados para visualização
 * @param {string} type - Tipo de gráfico ('bar', 'line', 'pie', 'area', 'scatter')
 * @param {string} title - Título do gráfico
 * @param {string} xKey - Chave para os valores do eixo X
 * @param {string} yKey - Chave para os valores do eixo Y (para gráficos que usam apenas uma série)
 * @param {Array} colors - Array de cores a serem usadas no gráfico
 * @param {Object} options - Opções adicionais para personalização do gráfico
 */
const DataVisualization = ({ 
  data = [], 
  type = 'bar', 
  title, 
  xKey = 'x', 
  yKey = 'y',
  colors = ['#6366F1', '#8B5CF6', '#EC4899', '#F97316', '#10B981', '#06B6D4', '#3B82F6'],
  options = {}
}) => {
  // Reference to the container
  const containerRef = useRef(null);
  const theme = useTheme();
  
  // Estado para dimensões responsivas
  const [dimensions, setDimensions] = useState({
    width: 600,
    height: 400
  });
  
  // Atualizar dimensões quando o componente monta ou a janela redimensiona
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        setDimensions({
          width: width,
          height: Math.min(Math.max(width * 0.6, 300), 500) // Altura responsiva
        });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);
  
  // Se não houver dados, mostrar mensagem
  if (!data || data.length === 0) {
    return (
      <Box 
        ref={containerRef} 
        sx={{ 
          width: '100%', 
          height: 300, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          bgcolor: theme.palette.mode === 'dark' 
            ? 'rgba(0, 0, 0, 0.1)' 
            : 'rgba(0, 0, 0, 0.02)',
          borderRadius: 2
        }}
      >
        <Typography variant="body1" color="text.secondary">
          Nenhum dado disponível para visualização
        </Typography>
      </Box>
    );
  }
  
  // Identificar todas as chaves numéricas nos dados para uso em gráficos
  const getNumericKeys = () => {
    if (data.length === 0) return [];
    
    return Object.keys(data[0]).filter(key => {
      // Verifica se o valor é numérico
      return typeof data[0][key] === 'number';
    });
  };
  
  const numericKeys = getNumericKeys();
  const firstNumericKey = numericKeys.length > 0 ? numericKeys[0] : null;
  
  // Identificar a chave categórica (não numérica)
  const getCategoryKey = () => {
    if (data.length === 0) return 'name';
    
    // Procurar a primeira propriedade que seja string
    const stringKey = Object.keys(data[0]).find(key => typeof data[0][key] === 'string');
    
    // Usar xKey se disponível, senão usar a propriedade string encontrada ou 'name' como padrão
    return xKey || stringKey || 'name';
  };
  
  const categoryKey = getCategoryKey();
  
  // Configurações de formatação do tooltip
  const formatTooltip = (value, name, props) => {
    if (typeof value === 'number') {
      // Se for um número grande, formatar com K, M, etc.
      if (Math.abs(value) >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
      } else if (Math.abs(value) >= 1000) {
        return `${(value / 1000).toFixed(1)}K`;
      } else {
        return value.toFixed(1);
      }
    }
    return value;
  };
  
  // Renderizar gráfico com base no tipo selecionado
  const renderChart = () => {
    // Se nenhuma chave numérica for encontrada, não pode renderizar
    if (numericKeys.length === 0) {
      return (
        <Box 
          sx={{ 
            height: dimensions.height, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center'
          }}
        >
          <Typography variant="body1" color="text.secondary">
            Nenhum dado numérico encontrado para visualização
          </Typography>
        </Box>
      );
    }
    
    // Altura da visualização
    const chartHeight = options.height || dimensions.height;
    
    // Renderizar com base no tipo
    switch (type.toLowerCase()) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis 
                dataKey={categoryKey} 
                tick={{ fill: theme.palette.text.secondary }}
                axisLine={{ stroke: theme.palette.divider }}
              />
              <YAxis 
                tick={{ fill: theme.palette.text.secondary }}
                axisLine={{ stroke: theme.palette.divider }}
              />
              <Tooltip 
                formatter={formatTooltip}
                contentStyle={{
                  backgroundColor: theme.palette.background.paper,
                  borderColor: theme.palette.divider,
                  borderRadius: 8,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              />
              <Legend wrapperStyle={{ paddingTop: 10 }} />
              {numericKeys.map((key, index) => (
                <Line 
                  key={key}
                  type="monotone" 
                  dataKey={key} 
                  name={options.seriesNames?.[key] || key}
                  stroke={colors[index % colors.length]} 
                  activeDot={{ r: 8 }} 
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
        
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis 
                dataKey={categoryKey} 
                tick={{ fill: theme.palette.text.secondary }}
                axisLine={{ stroke: theme.palette.divider }}
              />
              <YAxis 
                tick={{ fill: theme.palette.text.secondary }}
                axisLine={{ stroke: theme.palette.divider }}
              />
              <Tooltip 
                formatter={formatTooltip}
                contentStyle={{
                  backgroundColor: theme.palette.background.paper,
                  borderColor: theme.palette.divider,
                  borderRadius: 8,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              />
              <Legend wrapperStyle={{ paddingTop: 10 }} />
              {numericKeys.map((key, index) => (
                <Bar 
                  key={key} 
                  dataKey={key} 
                  name={options.seriesNames?.[key] || key}
                  fill={colors[index % colors.length]} 
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
        
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis 
                dataKey={categoryKey} 
                tick={{ fill: theme.palette.text.secondary }}
                axisLine={{ stroke: theme.palette.divider }}
              />
              <YAxis 
                tick={{ fill: theme.palette.text.secondary }}
                axisLine={{ stroke: theme.palette.divider }}
              />
              <Tooltip 
                formatter={formatTooltip}
                contentStyle={{
                  backgroundColor: theme.palette.background.paper,
                  borderColor: theme.palette.divider,
                  borderRadius: 8,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              />
              <Legend wrapperStyle={{ paddingTop: 10 }} />
              {numericKeys.map((key, index) => (
                <Area 
                  key={key} 
                  type="monotone" 
                  dataKey={key} 
                  name={options.seriesNames?.[key] || key}
                  fill={colors[index % colors.length]} 
                  stroke={colors[index % colors.length]}
                  fillOpacity={0.3}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );
        
      case 'pie':
        // Para gráficos de pizza, usar a primeira chave numérica como valor
        const pieDataKey = yKey || firstNumericKey;

        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={true}
                outerRadius={Math.min(dimensions.width, chartHeight) / 3}
                nameKey={categoryKey}
                dataKey={pieDataKey}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={formatTooltip}
                contentStyle={{
                  backgroundColor: theme.palette.background.paper,
                  borderColor: theme.palette.divider,
                  borderRadius: 8,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              />
              <Legend wrapperStyle={{ paddingTop: 20 }} />
            </PieChart>
          </ResponsiveContainer>
        );
        
      case 'scatter':
        const scatterXKey = xKey || categoryKey;
        const scatterYKey = yKey || firstNumericKey;
        
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis 
                dataKey={scatterXKey} 
                name={scatterXKey}
                tick={{ fill: theme.palette.text.secondary }}
                axisLine={{ stroke: theme.palette.divider }}
              />
              <YAxis 
                dataKey={scatterYKey} 
                name={scatterYKey}
                tick={{ fill: theme.palette.text.secondary }}
                axisLine={{ stroke: theme.palette.divider }}
              />
              <Tooltip 
                formatter={formatTooltip}
                contentStyle={{
                  backgroundColor: theme.palette.background.paper,
                  borderColor: theme.palette.divider,
                  borderRadius: 8,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
                cursor={{ strokeDasharray: '3 3' }}
              />
              <Legend wrapperStyle={{ paddingTop: 10 }} />
              <Scatter 
                name={title || `${scatterXKey} vs ${scatterYKey}`} 
                data={data} 
                fill={colors[0]} 
              />
            </ScatterChart>
          </ResponsiveContainer>
        );
        
      default:
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis 
                dataKey={categoryKey} 
                tick={{ fill: theme.palette.text.secondary }}
                axisLine={{ stroke: theme.palette.divider }}
              />
              <YAxis 
                tick={{ fill: theme.palette.text.secondary }}
                axisLine={{ stroke: theme.palette.divider }}
              />
              <Tooltip 
                formatter={formatTooltip}
                contentStyle={{
                  backgroundColor: theme.palette.background.paper,
                  borderColor: theme.palette.divider,
                  borderRadius: 8,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              />
              <Legend wrapperStyle={{ paddingTop: 10 }} />
              {numericKeys.map((key, index) => (
                <Bar 
                  key={key} 
                  dataKey={key} 
                  name={options.seriesNames?.[key] || key}
                  fill={colors[index % colors.length]} 
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };
  
  return (
    <Box ref={containerRef} sx={{ width: '100%', mb: 3 }}>
      {title && (
        <Typography 
          variant="h6" 
          sx={{ 
            mb: 2,
            fontWeight: 600,
            color: theme.palette.text.primary
          }}
        >
          {title}
        </Typography>
      )}
      {renderChart()}
    </Box>
  );
};

export default DataVisualization;