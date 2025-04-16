// src/components/visualization/EnhancedDynamicVisualization.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme, useMediaQuery } from '@mui/material';
import { Box, Typography, Table, TableHead, TableBody, TableRow, TableCell } from '@mui/material';
import { 
  BarChart, LineChart, PieChart, ScatterChart, ResponsiveContainer,
  Bar, Line, Pie, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell,
  Area, AreaChart, RadialBarChart, RadialBar
} from 'recharts';
import { useSpring, animated, config } from 'react-spring';

// Componentes animados com react-spring
const AnimatedBar = animated(Bar);
const AnimatedLine = animated(Line);
const AnimatedPie = animated(Pie);
const AnimatedArea = animated(Area);

/**
 * Componente de visualização dinâmica aprimorado que renderiza diferentes tipos de gráficos
 * com animações, responsividade e estilo moderno
 */
const EnhancedDynamicVisualization = ({ visualization, brandColors }) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const isMediumScreen = useMediaQuery(theme.breakpoints.down('md'));
  
  const [processedData, setProcessedData] = useState([]);
  const [config, setConfig] = useState({});
  const [activeIndex, setActiveIndex] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const chartRef = useRef(null);
  
  // Paleta de cores personalizada
  const defaultColorPalette = {
    primary: ['#4F46E5', '#6366F1', '#818CF8', '#A5B4FC', '#C7D2FE'],
    secondary: ['#10B981', '#34D399', '#6EE7B7', '#A7F3D0', '#D1FAE5'],
    accent: ['#F97316', '#FB923C', '#FDBA74', '#FED7AA', '#FFEDD5'],
    neutral: ['#1F2937', '#374151', '#4B5563', '#6B7280', '#9CA3AF'],
  };
  
  // Usar cores da marca se fornecidas, senão usar padrão
  const colorPalette = brandColors || defaultColorPalette;
  
  // Determinar quando usar Canvas em vez de SVG (para conjuntos grandes de dados)
  const shouldUseCanvas = useCallback((data) => {
    return Array.isArray(data) && data.length > 1000;
  }, []);
  
  // Animações usando react-spring
  const fadeIn = useSpring({
    opacity: 1,
    from: { opacity: 0 },
    config: { tension: 280, friction: 60 }
  });
  
  // Processar dados para visualização
  useEffect(() => {
    if (!visualization || !visualization.data) return;
    
    // Processar dados para visualização
    const data = Array.isArray(visualization.data) 
      ? visualization.data 
      : typeof visualization.data === 'object' 
        ? [visualization.data] 
        : [];
    
    setProcessedData(data);
    
    // Configurar opções de visualização
    const options = visualization.options || {};
    const type = visualization.type || 'table';
    
    // Determinar eixos automaticamente se não especificados
    let xAxis = options.xAxis;
    let yAxis = options.yAxis;
    let groupBy = options.groupBy;
    
    if (!xAxis && data.length > 0) {
      // Encontrar um bom candidato para o eixo X
      const keys = Object.keys(data[0]);
      // Priorizar campos de data ou categóricos
      xAxis = keys.find(k => 
        k.toLowerCase().includes('data') || 
        k.toLowerCase().includes('date') || 
        k.toLowerCase().includes('mes') || 
        k.toLowerCase().includes('ano') ||
        k.toLowerCase().includes('categoria') ||
        k.toLowerCase().includes('name')
      ) || keys[0];
    }
    
    if (!yAxis && data.length > 0) {
      // Encontrar um bom candidato para o eixo Y (numérico)
      const keys = Object.keys(data[0]);
      yAxis = keys.find(k => 
        typeof data[0][k] === 'number' || 
        k.toLowerCase().includes('valor') || 
        k.toLowerCase().includes('total') || 
        k.toLowerCase().includes('quantidade')
      ) || (keys.length > 1 ? keys[1] : keys[0]);
    }
    
    if (!groupBy && type === 'bar' && data.length > 0) {
      // Encontrar um campo de agrupamento adequado
      const keys = Object.keys(data[0]);
      groupBy = keys.find(k => 
        k !== xAxis && 
        k !== yAxis && 
        (k.toLowerCase().includes('categoria') || 
         k.toLowerCase().includes('grupo') || 
         k.toLowerCase().includes('tipo'))
      );
    }
    
    // Determinar paleta de cores com base no tipo
    let colors = options.colors;
    if (!colors) {
      switch (type.toLowerCase()) {
        case 'bar':
          colors = colorPalette.primary;
          break;
        case 'line':
          colors = colorPalette.secondary;
          break;
        case 'pie':
          colors = [...colorPalette.primary, ...colorPalette.secondary, ...colorPalette.accent];
          break;
        case 'scatter':
          colors = colorPalette.accent;
          break;
        default:
          colors = colorPalette.primary;
      }
    }
    
    setConfig({
      ...options,
      xAxis,
      yAxis,
      groupBy,
      colors,
      stacked: options.stacked || false,
      showGrid: options.showGrid !== undefined ? options.showGrid : false,
      showLegend: options.showLegend !== undefined ? options.showLegend : true,
      curve: options.curve || 'monotone',
      barSize: options.barSize || (isSmallScreen ? 15 : 30),
      animationDuration: options.animationDuration || 1500,
    });
    
  }, [visualization, isSmallScreen, colorPalette]);
  
  // Função para formatar dados para gráficos de área (mais suaves)
  const getAreaData = useCallback((data, xAxis, yAxis) => {
    if (!data || !data.length) return [];
    
    // Ordenar dados por eixo X se for data ou número
    const sortedData = [...data].sort((a, b) => {
      if (a[xAxis] instanceof Date && b[xAxis] instanceof Date) {
        return a[xAxis] - b[xAxis];
      }
      if (!isNaN(a[xAxis]) && !isNaN(b[xAxis])) {
        return a[xAxis] - b[xAxis];
      }
      return 0;
    });
    
    return sortedData;
  }, []);
  
  // Microinteração: efeito de pulso ao clicar em um elemento
  const triggerPulseEffect = (index) => {
    setSelectedIndex(index);
    setTimeout(() => setSelectedIndex(null), 500);
  };
  
  // Renderizar o tipo de visualização apropriado
  const renderVisualization = () => {
    if (!visualization || !processedData.length) {
      return (
        <Box sx={{ 
          p: 4, 
          textAlign: 'center', 
          color: 'text.secondary',
          height: 300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Typography variant="body1">Nenhum dado disponível</Typography>
        </Box>
      );
    }
    
    const { type } = visualization;
    
    // Se tiver muitos dados, considerar usar Canvas
    if (shouldUseCanvas(processedData)) {
      switch(type.toLowerCase()) {
        case 'bar':
          return renderCanvasBarChart();
        case 'line':
          return renderCanvasLineChart();
        default:
          break;
      }
    }
    
    // Renderização SVG padrão
    switch(type.toLowerCase()) {
      case 'bar':
        return renderBarChart();
      case 'line':
        return renderLineChart();
      case 'area':
        return renderAreaChart();
      case 'pie':
        return renderPieChart();
      case 'scatter':
        return renderScatterChart();
      case 'radial':
        return renderRadialChart();
      case 'table':
      default:
        return renderTable();
    }
  };
  
  // Renderizadores específicos para cada tipo de visualização
  const renderBarChart = () => {
    const { 
      xAxis, yAxis, groupBy, colors, stacked, 
      showGrid, barSize, animationDuration 
    } = config;
    
    // Calculando altura responsiva
    const chartHeight = isSmallScreen ? 300 : isMediumScreen ? 400 : 500;
    
    // Função para lidar com hover
    const handleBarMouseEnter = (_, index) => {
      setActiveIndex(index);
    };
    
    const handleBarMouseLeave = () => {
      setActiveIndex(null);
    };
    
    const handleBarClick = (data, index) => {
      triggerPulseEffect(index);
      if (visualization.onElementClick) {
        visualization.onElementClick(data, index);
      }
    };
    
    return (
      <animated.div style={fadeIn} aria-label={`Gráfico de barras de ${yAxis} por ${xAxis}`}>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart 
            data={processedData}
            layout={isSmallScreen && processedData.length > 5 ? "vertical" : "horizontal"}
            ref={chartRef}
            margin={{ 
              top: 20, 
              right: 30, 
              left: isSmallScreen ? 10 : 30, 
              bottom: isSmallScreen ? 60 : 30 
            }}
          >
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />}
            
            <XAxis 
              dataKey={xAxis} 
              type="category"
              tick={{ fontSize: isSmallScreen ? 10 : 12 }}
              tickLine={{ stroke: '#f5f5f5' }}
              axisLine={{ stroke: '#f5f5f5' }}
              height={60}
              angle={isSmallScreen ? -45 : 0}
              textAnchor={isSmallScreen ? "end" : "middle"}
            />
            
            <YAxis 
              tick={{ fontSize: isSmallScreen ? 10 : 12 }}
              tickLine={{ stroke: '#f5f5f5' }}
              axisLine={{ stroke: '#f5f5f5' }}
              width={isSmallScreen ? 40 : 60}
            />
            
            <Tooltip 
              cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
              contentStyle={{ 
                borderRadius: 8, 
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                border: 'none',
                padding: '10px 14px',
                backgroundColor: 'rgba(255, 255, 255, 0.95)'
              }}
            />
            
            {config.showLegend && (
              <Legend 
                wrapperStyle={{ 
                  paddingTop: 15,
                  fontSize: isSmallScreen ? 10 : 12 
                }}
              />
            )}
            
            {groupBy ? (
              // Múltiplas barras (dados agrupados)
              processedData
                .reduce((acc, item) => {
                  if (!acc.includes(item[groupBy])) {
                    acc.push(item[groupBy]);
                  }
                  return acc;
                }, [])
                .map((group, index) => (
                  <AnimatedBar 
                    key={group} 
                    dataKey={yAxis} 
                    name={group} 
                    fill={colors[index % colors.length]} 
                    stackId={stacked ? "stack" : undefined}
                    fillOpacity={activeIndex === null || activeIndex === index ? 0.85 : 0.5}
                    stroke={colors[index % colors.length]}
                    strokeWidth={1}
                    radius={[4, 4, 0, 0]}
                    barSize={barSize}
                    animationDuration={animationDuration}
                    animationEasing="ease-in-out"
                    animationBegin={index * 150}
                    onMouseEnter={(_, i) => handleBarMouseEnter(_, i)}
                    onMouseLeave={handleBarMouseLeave}
                    onClick={(data, i) => handleBarClick(data, i)}
                    isAnimationActive={true}
                    className={selectedIndex === index ? 'pulse-effect' : ''}
                  />
                ))
            ) : (
              // Barras simples (uma série)
              <AnimatedBar 
                dataKey={yAxis} 
                fill={colors[0]} 
                fillOpacity={0.85}
                stroke={colors[0]}
                strokeWidth={1}
                radius={[4, 4, 0, 0]}
                barSize={barSize}
                animationDuration={animationDuration}
                animationEasing="ease-in-out"
                onMouseEnter={(_, index) => handleBarMouseEnter(_, index)}
                onMouseLeave={handleBarMouseLeave}
                onClick={(data, index) => handleBarClick(data, index)}
                isAnimationActive={true}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </animated.div>
    );
  };
  
  const renderLineChart = () => {
    const { 
      xAxis, yAxis, groupBy, colors, 
      showGrid, curve, animationDuration 
    } = config;
    
    // Calculando altura responsiva
    const chartHeight = isSmallScreen ? 300 : isMediumScreen ? 400 : 500;
    
    return (
      <animated.div style={fadeIn} aria-label={`Gráfico de linhas de ${yAxis} por ${xAxis}`}>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <LineChart 
            data={processedData}
            ref={chartRef}
            margin={{ 
              top: 20, 
              right: 30, 
              left: isSmallScreen ? 10 : 30, 
              bottom: isSmallScreen ? 60 : 30 
            }}
          >
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />}
            
            <XAxis 
              dataKey={xAxis} 
              tick={{ fontSize: isSmallScreen ? 10 : 12 }}
              tickLine={{ stroke: '#f5f5f5' }}
              axisLine={{ stroke: '#f5f5f5' }}
              height={60}
              angle={isSmallScreen ? -45 : 0}
              textAnchor={isSmallScreen ? "end" : "middle"}
            />
            
            <YAxis 
              tick={{ fontSize: isSmallScreen ? 10 : 12 }}
              tickLine={{ stroke: '#f5f5f5' }}
              axisLine={{ stroke: '#f5f5f5' }}
              width={isSmallScreen ? 40 : 60}
            />
            
            <Tooltip 
              contentStyle={{ 
                borderRadius: 8, 
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                border: 'none',
                padding: '10px 14px',
                backgroundColor: 'rgba(255, 255, 255, 0.95)'
              }}
            />
            
            {config.showLegend && (
              <Legend 
                wrapperStyle={{ 
                  paddingTop: 15,
                  fontSize: isSmallScreen ? 10 : 12 
                }}
              />
            )}
            
            {groupBy ? (
              // Múltiplas linhas (dados agrupados)
              processedData
                .reduce((acc, item) => {
                  if (!acc.includes(item[groupBy])) {
                    acc.push(item[groupBy]);
                  }
                  return acc;
                }, [])
                .map((group, index) => (
                  <AnimatedLine 
                    key={group} 
                    type={curve}
                    dataKey={yAxis} 
                    name={group} 
                    stroke={colors[index % colors.length]} 
                    activeDot={{ r: 8, strokeWidth: 0, fill: colors[index % colors.length] }}
                    dot={{ 
                      r: 4, 
                      strokeWidth: 2, 
                      fill: '#fff', 
                      stroke: colors[index % colors.length],
                      strokeOpacity: activeIndex === null || activeIndex === index ? 1 : 0.5
                    }}
                    strokeWidth={3}
                    animationDuration={animationDuration}
                    animationEasing="ease-in-out"
                    animationBegin={index * 150}
                    onMouseEnter={(_, i) => setActiveIndex(i)}
                    onMouseLeave={() => setActiveIndex(null)}
                    onClick={(data, i) => triggerPulseEffect(i)}
                    isAnimationActive={true}
                    strokeOpacity={activeIndex === null || activeIndex === index ? 1 : 0.5}
                  />
                ))
            ) : (
              // Linha simples (uma série)
              <AnimatedLine 
                type={curve}
                dataKey={yAxis} 
                stroke={colors[0]} 
                activeDot={{ r: 8, strokeWidth: 0, fill: colors[0] }}
                dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: colors[0] }}
                strokeWidth={3}
                animationDuration={animationDuration}
                animationEasing="ease-in-out"
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                onClick={(data, index) => triggerPulseEffect(index)}
                isAnimationActive={true}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </animated.div>
    );
  };
  
  const renderAreaChart = () => {
    const { 
      xAxis, yAxis, groupBy, colors, 
      showGrid, curve, animationDuration 
    } = config;
    
    // Calculando altura responsiva
    const chartHeight = isSmallScreen ? 300 : isMediumScreen ? 400 : 500;
    
    // Processar dados para tornar a visualização mais suave
    const areaData = getAreaData(processedData, xAxis, yAxis);
    
    return (
      <animated.div style={fadeIn} aria-label={`Gráfico de área de ${yAxis} por ${xAxis}`}>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <AreaChart 
            data={areaData}
            ref={chartRef}
            margin={{ 
              top: 20, 
              right: 30, 
              left: isSmallScreen ? 10 : 30, 
              bottom: isSmallScreen ? 60 : 30 
            }}
          >
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />}
            
            <XAxis 
              dataKey={xAxis} 
              tick={{ fontSize: isSmallScreen ? 10 : 12 }}
              tickLine={{ stroke: '#f5f5f5' }}
              axisLine={{ stroke: '#f5f5f5' }}
              height={60}
              angle={isSmallScreen ? -45 : 0}
              textAnchor={isSmallScreen ? "end" : "middle"}
            />
            
            <YAxis 
              tick={{ fontSize: isSmallScreen ? 10 : 12 }}
              tickLine={{ stroke: '#f5f5f5' }}
              axisLine={{ stroke: '#f5f5f5' }}
              width={isSmallScreen ? 40 : 60}
            />
            
            <Tooltip 
              contentStyle={{ 
                borderRadius: 8, 
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                border: 'none',
                padding: '10px 14px',
                backgroundColor: 'rgba(255, 255, 255, 0.95)'
              }}
            />
            
            {config.showLegend && (
              <Legend 
                wrapperStyle={{ 
                  paddingTop: 15,
                  fontSize: isSmallScreen ? 10 : 12 
                }}
              />
            )}
            
            {groupBy ? (
              // Múltiplas áreas (dados agrupados)
              areaData
                .reduce((acc, item) => {
                  if (!acc.includes(item[groupBy])) {
                    acc.push(item[groupBy]);
                  }
                  return acc;
                }, [])
                .map((group, index) => (
                  <AnimatedArea 
                    key={group} 
                    type={curve}
                    dataKey={yAxis} 
                    name={group} 
                    stroke={colors[index % colors.length]} 
                    fill={colors[index % colors.length]} 
                    fillOpacity={0.2 + (0.1 * index)}
                    stackId={config.stacked ? "stack" : undefined}
                    activeDot={{ r: 8, strokeWidth: 0, fill: colors[index % colors.length] }}
                    animationDuration={animationDuration}
                    animationEasing="ease-in-out"
                    animationBegin={index * 150}
                    onMouseEnter={(_, i) => setActiveIndex(i)}
                    onMouseLeave={() => setActiveIndex(null)}
                    onClick={(data, i) => triggerPulseEffect(i)}
                    isAnimationActive={true}
                    strokeOpacity={activeIndex === null || activeIndex === index ? 1 : 0.5}
                  />
                ))
            ) : (
              // Área simples (uma série)
              <AnimatedArea 
                type={curve}
                dataKey={yAxis} 
                stroke={colors[0]} 
                fill={colors[0]} 
                fillOpacity={0.2}
                activeDot={{ r: 8, strokeWidth: 0, fill: colors[0] }}
                animationDuration={animationDuration}
                animationEasing="ease-in-out"
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                onClick={(data, index) => triggerPulseEffect(index)}
                isAnimationActive={true}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </animated.div>
    );
  };
  
  const renderPieChart = () => {
    const { 
      nameKey, valueKey, colors, animationDuration 
    } = config;
    
    const dataKey = nameKey || Object.keys(processedData[0])[0];
    const valueDataKey = valueKey || config.yAxis || Object.keys(processedData[0]).find(k => typeof processedData[0][k] === 'number');
    
    // Calculando altura responsiva
    const chartHeight = isSmallScreen ? 300 : isMediumScreen ? 400 : 500;
    const outerRadius = isSmallScreen ? 90 : isMediumScreen ? 120 : 180;
    
    // Função para lidar com hover
    const handlePieMouseEnter = (_, index) => {
      setActiveIndex(index);
    };
    
    const handlePieMouseLeave = () => {
      setActiveIndex(null);
    };
    
    const handlePieClick = (_, index) => {
      triggerPulseEffect(index);
    };
    
    return (
      <animated.div style={fadeIn} aria-label={`Gráfico de pizza de ${valueDataKey} por ${dataKey}`}>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <PieChart
            ref={chartRef}
            margin={{ 
              top: 20, 
              right: isSmallScreen ? 10 : 30, 
              left: isSmallScreen ? 10 : 30, 
              bottom: 20 
            }}
          >
            <Pie
              data={processedData}
              nameKey={dataKey}
              dataKey={valueDataKey}
              cx="50%"
              cy="50%"
              innerRadius={outerRadius * 0.4} // Donut style
              outerRadius={outerRadius}
              paddingAngle={4}
              animationDuration={animationDuration}
              animationEasing="ease-in-out"
              label={({ name, percent }) => isSmallScreen ? `${name}: ${(percent * 100).toFixed(0)}%` : `${name}: ${(percent * 100).toFixed(1)}%`}
              labelLine={!isSmallScreen}
              onMouseEnter={handlePieMouseEnter}
              onMouseLeave={handlePieMouseLeave}
              onClick={handlePieClick}
              isAnimationActive={true}
            >
              {processedData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={colors[index % colors.length]} 
                  stroke={theme.palette.background.paper}
                  strokeWidth={2}
                  style={{
                    filter: selectedIndex === index ? 'drop-shadow(0px 0px 8px rgba(0,0,0,0.5))' : 'none',
                    opacity: activeIndex === null || activeIndex === index ? 1 : 0.7,
                    transform: selectedIndex === index ? 'scale(1.05)' : 'scale(1)',
                    transformOrigin: 'center',
                    transition: 'all 0.3s ease-in-out'
                  }}
                />
              ))}
            </Pie>
            
            <Tooltip 
              contentStyle={{ 
                borderRadius: 8, 
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                border: 'none',
                padding: '10px 14px',
                backgroundColor: 'rgba(255, 255, 255, 0.95)'
              }}
              formatter={(value) => [
                `${value} (${((value / processedData.reduce((sum, item) => sum + item[valueDataKey], 0)) * 100).toFixed(1)}%)`,
                ''
              ]}
            />
            
            {config.showLegend && (
              <Legend 
                layout={isSmallScreen ? "horizontal" : "vertical"}
                verticalAlign={isSmallScreen ? "bottom" : "middle"}
                align={isSmallScreen ? "center" : "right"}
                wrapperStyle={{ 
                  paddingLeft: isSmallScreen ? 0 : 20,
                  fontSize: isSmallScreen ? 10 : 12 
                }}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
      </animated.div>
    );
  };
  
  const renderScatterChart = () => {
    const { 
      xAxis, yAxis, colors, showGrid, animationDuration 
    } = config;
    
    // Calculando altura responsiva
    const chartHeight = isSmallScreen ? 300 : isMediumScreen ? 400 : 500;
    
    return (
      <animated.div style={fadeIn} aria-label={`Gráfico de dispersão de ${yAxis} por ${xAxis}`}>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <ScatterChart
            ref={chartRef}
            margin={{ 
              top: 20, 
              right: 30, 
              left: isSmallScreen ? 10 : 30, 
              bottom: isSmallScreen ? 60 : 30 
            }}
          >
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />}
            
            <XAxis 
              type="number"
              dataKey={xAxis} 
              name={xAxis}
              tick={{ fontSize: isSmallScreen ? 10 : 12 }}
              tickLine={{ stroke: '#f5f5f5' }}
              axisLine={{ stroke: '#f5f5f5' }}
            />
            
            <YAxis 
              type="number"
              dataKey={yAxis} 
              name={yAxis}
              tick={{ fontSize: isSmallScreen ? 10 : 12 }}
              tickLine={{ stroke: '#f5f5f5' }}
              axisLine={{ stroke: '#f5f5f5' }}
              width={isSmallScreen ? 40 : 60}
            />
            
            <Tooltip 
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{ 
                borderRadius: 8, 
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                border: 'none',
                padding: '10px 14px',
                backgroundColor: 'rgba(255, 255, 255, 0.95)'
              }}
              formatter={(value, name) => [value, name]}
            />
            
            <Scatter 
              name={`${xAxis} vs ${yAxis}`} 
              data={processedData} 
              fill={colors[0]} 
              fillOpacity={0.7}
              animationDuration={animationDuration}
              animationEasing="ease-in-out"
              shape={(props) => {
                const { cx, cy, fill } = props;
                const isSelected = selectedIndex === props.index;
                const isActive = activeIndex === props.index;
                
                return (
                  <circle 
                    cx={cx} 
                    cy={cy} 
                    r={isSelected ? 8 : isActive ? 7 : 5} 
                    fill={fill} 
                    stroke={theme.palette.background.paper}
                    strokeWidth={2}
                    style={{
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                      filter: isSelected ? 'drop-shadow(0px 0px 4px rgba(0,0,0,0.3))' : 'none'
                    }}
                    onClick={() => triggerPulseEffect(props.index)}
                    onMouseEnter={() => setActiveIndex(props.index)}
                    onMouseLeave={() => setActiveIndex(null)}
                  />
                );
              }}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </animated.div>
    );
  };
  
  const renderRadialChart = () => {
    const { 
      valueKey, nameKey, colors, animationDuration 
    } = config;
    
    const dataKey = valueKey || config.yAxis || Object.keys(processedData[0]).find(k => typeof processedData[0][k] === 'number');
    const labelKey = nameKey || Object.keys(processedData[0])[0];
    
    // Calculando altura responsiva
    const chartHeight = isSmallScreen ? 300 : isMediumScreen ? 400 : 500;
    
    // Processando dados para garantir que sejam adequados para o gráfico radial
    const radialData = processedData.map((item, index) => ({
      ...item,
      fill: colors[index % colors.length]
    }));
    
    return (
      <animated.div style={fadeIn} aria-label={`Gráfico radial de ${dataKey}`}>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <RadialBarChart 
            innerRadius="30%" 
            outerRadius="90%" 
            data={radialData} 
            startAngle={180} 
            endAngle={0}
            cx="50%"
            cy="50%"
            ref={chartRef}
          >
            <RadialBar
              minAngle={15}
              background={{ fill: '#f5f5f5' }}
              clockWise={true}
              dataKey={dataKey}
              cornerRadius={12}
              label={{
                position: 'insideStart',
                fill: '#fff',
                fontSize: isSmallScreen ? 10 : 12
              }}
              animationDuration={animationDuration}
              animationEasing="ease-in-out"
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              onClick={(_, index) => triggerPulseEffect(index)}
            >
              {radialData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.fill}
                  style={{
                    opacity: activeIndex === null || activeIndex === index ? 1 : 0.7,
                    filter: selectedIndex === index ? 'drop-shadow(0px 0px 8px rgba(0,0,0,0.3))' : 'none',
                    transition: 'all 0.3s ease'
                  }}
                />
              ))}
            </RadialBar>
            
            <Tooltip 
              contentStyle={{ 
                borderRadius: 8, 
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                border: 'none',
                padding: '10px 14px',
                backgroundColor: 'rgba(255, 255, 255, 0.95)'
              }}
              formatter={(value, name, props) => [
                value,
                props.payload[labelKey]
              ]}
            />
            
            {config.showLegend && (
              <Legend 
                iconSize={10}
                layout={isSmallScreen ? "horizontal" : "vertical"}
                verticalAlign={isSmallScreen ? "bottom" : "middle"}
                align={isSmallScreen ? "center" : "right"}
                wrapperStyle={{ 
                  paddingLeft: isSmallScreen ? 0 : 20,
                  fontSize: isSmallScreen ? 10 : 12 
                }}
                formatter={(value, entry) => entry.payload[labelKey]}
              />
            )}
          </RadialBarChart>
        </ResponsiveContainer>
      </animated.div>
    );
  };
  
  const renderTable = () => {
    if (!processedData.length) return null;
    
    const columns = Object.keys(processedData[0]);
    
    // Função para formatar valor da célula
    const formatCellValue = (value) => {
      if (value === null || value === undefined) return '-';
      if (value instanceof Date) return value.toLocaleDateString();
      if (typeof value === 'number') return value.toLocaleString();
      return String(value);
    };
    
    return (
      <animated.div style={fadeIn} aria-label="Tabela de dados">
        <Box sx={{ 
          overflow: 'auto', 
          maxHeight: 400,
          '&::-webkit-scrollbar': {
            width: 8,
            height: 8,
          },
          '&::-webkit-scrollbar-track': {
            borderRadius: 8,
            backgroundColor: 'rgba(0,0,0,0.05)',
          },
          '&::-webkit-scrollbar-thumb': {
            borderRadius: 8,
            backgroundColor: 'rgba(0,0,0,0.1)',
          }
        }}>
          <Table size={isSmallScreen ? "small" : "medium"} stickyHeader>
            <TableHead>
              <TableRow>
                {columns.map((column, index) => (
                  <TableCell 
                    key={index} 
                    align={typeof processedData[0][column] === 'number' ? 'right' : 'left'}
                    sx={{ 
                      fontWeight: 'bold',
                      backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                      color: theme.palette.text.primary
                    }}
                  >
                    {column}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {processedData.map((row, rowIndex) => (
                <TableRow 
                  key={rowIndex}
                  hover
                  onClick={() => triggerPulseEffect(rowIndex)}
                  sx={{ 
                    cursor: 'pointer',
                    backgroundColor: selectedIndex === rowIndex ? 
                      (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.04)') : 
                      'transparent',
                    '&:hover': {
                      backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.02)'
                    },
                    transition: 'background-color 0.3s ease'
                  }}
                >
                  {columns.map((column, colIndex) => (
                    <TableCell 
                      key={colIndex}
                      align={typeof row[column] === 'number' ? 'right' : 'left'}
                    >
                      {formatCellValue(row[column])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </animated.div>
    );
  };
  
  // Implementações Canvas para conjuntos grandes de dados
  const renderCanvasBarChart = () => {
    // Lógica específica para implementação Canvas
    // Esta é uma situação onde um terceiro componente seria usado
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="subtitle1" color="text.secondary">
          Renderização otimizada (Canvas) para conjunto grande de dados
        </Typography>
        {renderBarChart() /* Fallback para SVG por enquanto */}
      </Box>
    );
  };
  
  const renderCanvasLineChart = () => {
    // Lógica específica para implementação Canvas
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="subtitle1" color="text.secondary">
          Renderização otimizada (Canvas) para conjunto grande de dados
        </Typography>
        {renderLineChart() /* Fallback para SVG por enquanto */}
      </Box>
    );
  };
  
  // Estilos CSS para animações e efeitos
  const styles = `
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }
    
    .pulse-effect {
      animation: pulse 0.5s ease-in-out;
    }
  `;
  
  return (
    <Box 
      sx={{ 
        p: 2, 
        bgcolor: 'background.paper', 
        borderRadius: 2,
        boxShadow: theme.palette.mode === 'dark' ? 
          '0 4px 20px rgba(0,0,0,0.2)' : 
          '0 4px 20px rgba(0,0,0,0.05)',
        transition: 'all 0.3s ease-in-out',
        overflow: 'hidden'
      }}
    >
      <style>{styles}</style>
      {/* Renderizar título se disponível */}
      {visualization?.title && (
        <Typography 
          variant={isSmallScreen ? "h6" : "h5"} 
          component="h2" 
          align="center" 
          gutterBottom
          sx={{ mb: 2 }}
        >
          {visualization.title}
        </Typography>
      )}
      
      {/* Renderizar descrição se disponível */}
      {visualization?.description && (
        <Typography 
          variant="body2" 
          color="text.secondary" 
          align="center" 
          sx={{ mb: 3 }}
        >
          {visualization.description}
        </Typography>
      )}
      
      {renderVisualization()}
    </Box>
  );
};

export default EnhancedDynamicVisualization;