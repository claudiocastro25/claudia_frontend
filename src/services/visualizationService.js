/**
 * Serviço para gerenciar operações relacionadas a visualizações
 */
import api from './api';

// Configurações de visualização
const VISUALIZATION_CONFIG = {
  chartTypes: ['bar', 'line', 'pie', 'scatter', 'area'],
  tablePaginationOptions: [10, 25, 50, 100],
  colorSchemes: {
    default: ['#6366F1', '#8B5CF6', '#EC4899', '#F97316', '#10B981', '#06B6D4', '#3B82F6'],
    categorical: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6B7280'],
    sequential: ['#93C5FD', '#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF', '#1E3A8A'],
    divergent: ['#EF4444', '#F97316', '#F59E0B', '#FFFFFF', '#3B82F6', '#1D4ED8', '#1E3A8A']
  }
};

/**
 * Extrai dados de visualização de uma mensagem
 * @param {string} text - Texto da mensagem
 * @returns {Object|null} - Dados de visualização ou null se não houver
 */
const extractVisualizationData = (text) => {
  if (!text) return null;
  
  try {
    // Verificar padrões comuns de dados de visualização
    
    // 1. Formato JSON específico para visualização
    const vizRegex = /```visualization\s*([\s\S]*?)\s*```/;
    const vizMatch = text.match(vizRegex);
    
    if (vizMatch && vizMatch[1]) {
      try {
        const vizData = JSON.parse(vizMatch[1]);
        return {
          type: 'chart',
          data: vizData,
          source: 'visualization_block'
        };
      } catch (e) {
        console.error('Erro ao analisar dados de visualização:', e);
      }
    }
    
    // 2. Tabelas em markdown
    const tableRegex = /\|[\s\S]*?\|[\s\S]*?\|\n((?:\|[\s\S]*?\|[\s\S]*?\|\n)+)/;
    const tableMatch = text.match(tableRegex);
    
    if (tableMatch && tableMatch[1]) {
      // Converter tabela markdown para dados estruturados
      const tableData = parseMarkdownTable(tableMatch[0]);
      if (tableData && tableData.length > 0) {
        return {
          type: 'table',
          data: tableData,
          source: 'markdown_table'
        };
      }
    }
    
    // 3. Código JSON com array de objetos (potencialmente visualizável)
    const jsonRegex = /```(?:json)?\s*(\[\s*\{[\s\S]*?\}\s*\])\s*```/;
    const jsonMatch = text.match(jsonRegex);
    
    if (jsonMatch && jsonMatch[1]) {
      try {
        const jsonData = JSON.parse(jsonMatch[1]);
        if (Array.isArray(jsonData) && jsonData.length > 0 && typeof jsonData[0] === 'object') {
          // Verificar se parece dados tabulares
          const hasNumericValues = Object.values(jsonData[0]).some(v => typeof v === 'number');
          if (hasNumericValues) {
            return {
              type: 'data',
              data: jsonData,
              source: 'json_data'
            };
          }
        }
      } catch (e) {
        console.error('Erro ao analisar dados JSON:', e);
      }
    }
    
    // 4. Detectar dados Mermaid
    const mermaidRegex = /```mermaid\s*([\s\S]*?)\s*```/;
    const mermaidMatch = text.match(mermaidRegex);
    
    if (mermaidMatch && mermaidMatch[1]) {
      return {
        type: 'mermaid',
        data: mermaidMatch[1],
        source: 'mermaid'
      };
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao extrair dados de visualização:', error);
    return null;
  }
};

/**
 * Analisa uma tabela em formato markdown e converte para array de objetos
 * @param {string} markdownTable - Tabela no formato markdown
 * @returns {Array} - Array de objetos representando a tabela
 */
const parseMarkdownTable = (markdownTable) => {
  try {
    // Dividir em linhas
    const lines = markdownTable.trim().split('\n');
    
    // Precisamos de pelo menos o cabeçalho e a linha de formatação
    if (lines.length < 2) return null;
    
    // Extrair cabeçalhos
    const headerLine = lines[0].trim();
    const headers = headerLine
      .split('|')
      .filter(cell => cell.trim() !== '')
      .map(cell => cell.trim());
    
    // Pular a linha de formatação (segunda linha)
    
    // Processar linhas de dados
    const data = [];
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const cells = line
        .split('|')
        .filter(cell => cell !== '')
        .map(cell => cell.trim());
      
      if (cells.length !== headers.length) continue;
      
      const rowData = {};
      headers.forEach((header, index) => {
        // Tentar converter para número se for apropriado
        const cellValue = cells[index];
        const numberValue = Number(cellValue);
        rowData[header] = !isNaN(numberValue) ? numberValue : cellValue;
      });
      
      data.push(rowData);
    }
    
    return data;
  } catch (error) {
    console.error('Erro ao analisar tabela markdown:', error);
    return null;
  }
};

/**
 * Sugere o melhor tipo de gráfico com base nos dados
 * @param {Array} data - Dados estruturados
 * @returns {string} - Tipo de gráfico recomendado
 */
const suggestChartType = (data) => {
  if (!Array.isArray(data) || data.length === 0) return 'table';
  
  const sampleItem = data[0];
  const keys = Object.keys(sampleItem);
  
  // Contar tipos de valores
  let numericCount = 0;
  let dateCount = 0;
  let stringCount = 0;
  
  for (const key of keys) {
    const value = sampleItem[key];
    if (typeof value === 'number') {
      numericCount++;
    } else if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
      dateCount++;
    } else if (typeof value === 'string') {
      stringCount++;
    }
  }
  
  // Verificar o número de itens
  const itemCount = data.length;
  
  // Determinar o tipo com base nas características dos dados
  if (numericCount >= 2) {
    // Se tiver duas colunas numéricas, pode ser scatter
    if (numericCount === 2 && itemCount > 5) {
      return 'scatter';
    }
    
    // Se tiver valores numéricos e datas, provavelmente é série temporal
    if (dateCount > 0 && numericCount >= 1) {
      return 'line';
    }
    
    // Se tiver vários itens numéricos, bar
    return 'bar';
  } else if (numericCount === 1 && stringCount >= 1) {
    // Se tiver categorias (strings) e valores numéricos
    if (itemCount <= 8) {
      return 'pie'; // Poucos itens, bom para pie
    } else {
      return 'bar'; // Muitos itens, melhor bar
    }
  } else if (dateCount > 0 && numericCount >= 1) {
    // Series temporal
    return 'line';
  }
  
  // Default para tabela se incerto
  return 'table';
};

/**
 * Gera dados de configuração para a visualização
 * @param {Array} data - Dados estruturados
 * @param {string} type - Tipo de visualização
 * @param {Object} options - Opções adicionais
 * @returns {Object} - Configuração da visualização
 */
const generateVisualizationConfig = (data, type = 'auto', options = {}) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return null;
  }
  
  // Se o tipo for auto, tentar determinar o melhor tipo
  const chartType = type === 'auto' ? suggestChartType(data) : type;
  
  // Encontrar chaves numéricas
  const numericKeys = Object.keys(data[0]).filter(key => 
    typeof data[0][key] === 'number'
  );
  
  // Encontrar chaves de string para categorias
  const stringKeys = Object.keys(data[0]).filter(key => 
    typeof data[0][key] === 'string'
  );
  
  // Selecionar cores
  const colorScheme = options.colorScheme || 'default';
  const colors = VISUALIZATION_CONFIG.colorSchemes[colorScheme] || 
                 VISUALIZATION_CONFIG.colorSchemes.default;
  
  // Gerar configuração com base no tipo
  switch (chartType) {
    case 'bar':
      return {
        type: 'bar',
        data,
        colors,
        xKey: options.xKey || stringKeys[0] || Object.keys(data[0])[0],
        yKey: options.yKey || numericKeys[0],
        title: options.title || 'Gráfico de Barras',
        showLegend: options.showLegend !== undefined ? options.showLegend : true,
        stacked: options.stacked || false
      };
      
    case 'line':
      return {
        type: 'line',
        data,
        colors,
        xKey: options.xKey || stringKeys[0] || Object.keys(data[0])[0],
        yKey: options.yKey || numericKeys[0],
        title: options.title || 'Gráfico de Linha',
        showLegend: options.showLegend !== undefined ? options.showLegend : true,
        curve: options.curve || 'linear'
      };
      
    case 'pie':
      return {
        type: 'pie',
        data,
        colors,
        nameKey: options.nameKey || stringKeys[0] || Object.keys(data[0])[0],
        valueKey: options.valueKey || numericKeys[0],
        title: options.title || 'Gráfico de Pizza',
        showLegend: options.showLegend !== undefined ? options.showLegend : true
      };
      
    case 'scatter':
      return {
        type: 'scatter',
        data,
        colors,
        xKey: options.xKey || numericKeys[0],
        yKey: options.yKey || (numericKeys.length > 1 ? numericKeys[1] : numericKeys[0]),
        title: options.title || 'Gráfico de Dispersão',
        showLegend: options.showLegend !== undefined ? options.showLegend : true
      };
      
    case 'area':
      return {
        type: 'area',
        data,
        colors,
        xKey: options.xKey || stringKeys[0] || Object.keys(data[0])[0],
        yKey: options.yKey || numericKeys[0],
        title: options.title || 'Gráfico de Área',
        showLegend: options.showLegend !== undefined ? options.showLegend : true,
        stacked: options.stacked || false
      };
      
    case 'table':
    default:
      return {
        type: 'table',
        data,
        title: options.title || 'Tabela de Dados',
        pagination: options.pagination !== undefined ? options.pagination : true,
        search: options.search !== undefined ? options.search : true,
        rowsPerPage: options.rowsPerPage || VISUALIZATION_CONFIG.tablePaginationOptions[0]
      };
  }
};

/**
 * Exporta uma visualização para um formato específico
 * @param {Object} visualization - Dados da visualização
 * @param {string} format - Formato de exportação (png, svg, csv, json)
 * @returns {Promise<Blob|string>} - Dados exportados
 */
const exportVisualization = async (visualization, format = 'png') => {
  if (!visualization || !visualization.data) {
    throw new Error('Dados de visualização inválidos');
  }
  
  switch (format.toLowerCase()) {
    case 'csv':
      return exportAsCSV(visualization.data);
    case 'json':
      return JSON.stringify(visualization.data, null, 2);
    case 'png':
      // A exportação como PNG requer manipulação do DOM
      // Se existir um elemento específico para capturar
      if (visualization.elementId) {
        try {
          const element = document.getElementById(visualization.elementId);
          if (!element) {
            throw new Error('Elemento de visualização não encontrado');
          }
          
          // Usar html2canvas se disponível
          if (window.html2canvas) {
            const canvas = await window.html2canvas(element);
            return new Promise((resolve, reject) => {
              try {
                canvas.toBlob(blob => {
                  resolve(blob);
                }, 'image/png');
              } catch (err) {
                reject(new Error('Erro ao converter canvas para PNG'));
              }
            });
          } else {
            throw new Error('html2canvas não disponível para exportação PNG');
          }
        } catch (err) {
          console.error('Erro ao exportar PNG:', err);
          throw err;
        }
      } else {
        throw new Error('ID do elemento de visualização não especificado');
      }
    case 'svg':
      // Exportação SVG também requer manipulação do DOM
      if (visualization.elementId) {
        try {
          const element = document.getElementById(visualization.elementId);
          if (!element) {
            throw new Error('Elemento de visualização não encontrado');
          }
          
          // Verificar se o elemento é um SVG
          const svgElement = element.tagName === 'svg' ? 
            element : element.querySelector('svg');
            
          if (!svgElement) {
            throw new Error('Elemento SVG não encontrado');
          }
          
          // Clonar o SVG para não modificar o original
          const clonedSvg = svgElement.cloneNode(true);
          
          // Adicionar namespace XML
          clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
          
          // Serializar para string
          const serializer = new XMLSerializer();
          const svgString = serializer.serializeToString(clonedSvg);
          
          return svgString;
        } catch (err) {
          console.error('Erro ao exportar SVG:', err);
          throw err;
        }
      } else {
        throw new Error('ID do elemento de visualização não especificado');
      }
    default:
      throw new Error(`Formato de exportação não suportado: ${format}`);
  }
};

/**
 * Exporta dados como CSV
 * @param {Array} data - Dados estruturados
 * @returns {string} - String CSV
 */
const exportAsCSV = (data) => {
  if (!Array.isArray(data) || data.length === 0) {
    return '';
  }
  
  // Obter cabeçalhos
  const headers = Object.keys(data[0]);
  
  // Gerar conteúdo CSV
  const csvContent = [
    headers.join(','),
    ...data.map(row => {
      return headers.map(header => {
        const value = row[header];
        // Tratar valores especiais
        if (value === null || value === undefined) {
          return '';
        }
        if (typeof value === 'string') {
          // Escapar aspas e colocar aspas duplas se necessário
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }
        return String(value);
      }).join(',');
    })
  ].join('\n');
  
  return csvContent;
};

/**
 * Salva uma visualização no servidor
 * @param {Object} visualization - Dados da visualização
 * @param {string} conversationId - ID da conversa
 * @param {string} messageId - ID da mensagem associada
 * @returns {Promise<Object>} - Resposta da API
 */
const saveVisualization = async (visualization, conversationId, messageId) => {
  try {
    // Se o backend tiver um endpoint para salvar visualizações
    const response = await api.post('/visualizations', {
      conversationId,
      messageId,
      title: visualization.title || 'Visualização',
      type: visualization.type,
      data: visualization.data,
      config: visualization.config || {}
    });
    
    return response.data;
  } catch (error) {
    console.error('Erro ao salvar visualização:', error);
    throw error;
  }
};

/**
 * Obtém visualizações por conversa
 * @param {string} conversationId - ID da conversa
 * @returns {Promise<Object>} - Resposta da API
 */
const getVisualizationsByConversation = async (conversationId) => {
  try {
    // Se o backend tiver um endpoint para obter visualizações
    const response = await api.get(`/visualizations?conversationId=${conversationId}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar visualizações:', error);
    throw error;
  }
};

/**
 * Obtém uma visualização específica pelo ID
 * @param {string} visualizationId - ID da visualização
 * @returns {Promise<Object>} - Resposta da API
 */
const getVisualizationById = async (visualizationId) => {
  try {
    // Se o backend tiver um endpoint para obter uma visualização
    const response = await api.get(`/visualizations/${visualizationId}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar visualização:', error);
    throw error;
  }
};

export default {
  extractVisualizationData,
  suggestChartType,
  generateVisualizationConfig,
  exportVisualization,
  saveVisualization,
  getVisualizationsByConversation,
  getVisualizationById,
  VISUALIZATION_CONFIG
};