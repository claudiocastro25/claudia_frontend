/**
 * RAG Service - Frontend
 * Serviço para operações de Retrieval Augmented Generation (RAG) no cliente
 */
import api from './api';

// Configurações
const RAG_CONFIG = {
  maxChunks: 10,  // Máximo de chunks para incluir no contexto
  maxTokens: 6000, // Limite aproximado de tokens para o contexto
  relevanceThreshold: 0.7, // Limiar de relevância para inclusão de chunks
  visualizationTypes: ['table', 'chart', 'tree', 'graph', 'network']
};

/**
 * Busca chunks de documentos relevantes para uma consulta
 * @param {string} query - Consulta para buscar chunks relevantes
 * @param {string} conversationId - ID da conversa para limitar a busca
 * @param {number} limit - Número máximo de chunks a retornar
 * @returns {Promise<Array>} - Array de chunks relevantes
 */
export const searchRelevantChunks = async (query, conversationId, limit = RAG_CONFIG.maxChunks) => {
  try {
    const response = await api.get('/documents/search', {
      params: {
        query,
        conversationId,
        limit
      }
    });
    
    if (response.data.status === 'success') {
      return response.data.data.results || [];
    }
    
    return [];
  } catch (error) {
    console.error('Erro ao buscar chunks relevantes:', error);
    return [];
  }
};

/**
 * Formata chunks para criar o contexto para o modelo de IA
 * @param {Array} chunks - Array de chunks relevantes
 * @returns {string} - Contexto formatado para o modelo
 */
export const formatChunksAsContext = (chunks) => {
  if (!chunks || chunks.length === 0) return '';
  
  let context = "Informações dos documentos:\n\n";
  
  for (const [index, chunk] of chunks.entries()) {
    // Adicionar separador
    context += `--- Documento ${index + 1}: ${chunk.filename || 'Documento'} ---\n\n`;
    
    // Adicionar texto do chunk
    context += `${chunk.chunk_text}\n\n`;
    
    // Adicionar metadados como página
    if (chunk.metadata && chunk.metadata.page) {
      context += `(Fonte: Página ${chunk.metadata.page})\n\n`;
    }
  }
  
  return context;
};

/**
 * Verifica se um texto contém conteúdo visualizável (tabelas, gráficos, etc.)
 * @param {string} text - Texto a verificar
 * @returns {Object|null} - Objeto com dados de visualização ou null se não houver
 */
export const extractVisualizationData = (text) => {
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
 * Processa uma mensagem do assistente para extrair dados de visualização
 * @param {string} messageContent - Conteúdo da mensagem
 * @returns {Object} - Dados de visualização e contexto
 */
export const processAssistantMessage = (messageContent) => {
  // Extrair possíveis dados de visualização
  const visualizationData = extractVisualizationData(messageContent);
  
  // Verificar referências a documentos
  const docReferences = extractDocumentReferences(messageContent);
  
  return {
    visualizationData,
    documentReferences: docReferences,
    hasVisualization: !!visualizationData,
    hasDocumentReferences: docReferences.length > 0
  };
};

/**
 * Extrai referências a documentos do texto da mensagem
 * @param {string} text - Texto da mensagem
 * @returns {Array} - Array de referências a documentos
 */
const extractDocumentReferences = (text) => {
  const references = [];
  
  // Padrões comuns de referência a documentos
  // 1. "no documento X" ou "no arquivo X"
  const docPattern1 = /no\s+(?:documento|arquivo)\s+["']([^"']+)["']/gi;
  // 2. "de acordo com X" ou "conforme X" onde X parece um nome de arquivo
  const docPattern2 = /(?:de acordo com|conforme|segundo|baseado em)\s+["']([^"']+\.\w{3,4})["']/gi;
  // 3. "Fonte: X" ou "Referência: X"
  const docPattern3 = /(?:fonte|referência|ref\.):\s*([^,;.\n]+\.\w{3,4})/gi;
  
  // Coletar todas as referências
  let match;
  
  while ((match = docPattern1.exec(text)) !== null) {
    references.push({
      name: match[1],
      type: 'mentioned',
      context: match[0]
    });
  }
  
  while ((match = docPattern2.exec(text)) !== null) {
    references.push({
      name: match[1],
      type: 'cited',
      context: match[0]
    });
  }
  
  while ((match = docPattern3.exec(text)) !== null) {
    references.push({
      name: match[1],
      type: 'source',
      context: match[0]
    });
  }
  
  return references;
};

/**
 * Verifica o status dos documentos na conversa atual
 * @param {string} conversationId - ID da conversa
 * @returns {Promise<Object>} - Status dos documentos
 */
export const checkDocumentsStatus = async (conversationId) => {
  try {
    const response = await api.get(`/documents/status`, {
      params: { conversationId }
    });
    
    if (response.data.status === 'success') {
      return response.data.data;
    }
    
    return {
      hasDocuments: false,
      ready: 0,
      processing: 0,
      error: 0
    };
  } catch (error) {
    console.error('Erro ao verificar status dos documentos:', error);
    return {
      hasDocuments: false,
      error: error.message
    };
  }
};

/**
 * Obtém documentos disponíveis para uma conversa
 * @param {string} conversationId - ID da conversa
 * @returns {Promise<Array>} - Lista de documentos
 */
export const getConversationDocuments = async (conversationId) => {
  try {
    const response = await api.get(`/documents`, {
      params: { conversationId }
    });
    
    if (response.data.status === 'success') {
      return response.data.data.documents || [];
    }
    
    return [];
  } catch (error) {
    console.error('Erro ao obter documentos da conversa:', error);
    return [];
  }
};

/**
 * Gera visualização com base em dados estruturados
 * @param {Array} data - Dados estruturados
 * @param {string} type - Tipo de visualização (chart, table, etc.)
 * @param {Object} options - Opções de visualização
 * @returns {Object} - Configuração da visualização
 */
export const generateVisualization = (data, type = 'auto', options = {}) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return null;
  }
  
  // Se o tipo for auto, tentar determinar o melhor tipo
  if (type === 'auto') {
    type = suggestVisualizationType(data);
  }
  
  // Configurações comuns
  const common = {
    title: options.title || 'Visualização de Dados',
    data: data
  };
  
  // Gerar configuração específica para cada tipo
  switch (type) {
    case 'bar':
      return {
        ...common,
        type: 'bar',
        xKey: options.xKey || Object.keys(data[0])[0],
        yKey: options.yKey || findNumericKey(data[0]),
        colors: options.colors || ['#6366F1', '#8B5CF6', '#EC4899', '#F97316']
      };
      
    case 'line':
      return {
        ...common,
        type: 'line',
        xKey: options.xKey || Object.keys(data[0])[0],
        yKey: options.yKey || findNumericKey(data[0]),
        colors: options.colors || ['#6366F1', '#8B5CF6', '#3B82F6']
      };
      
    case 'pie':
      return {
        ...common,
        type: 'pie',
        nameKey: options.nameKey || Object.keys(data[0])[0],
        valueKey: options.valueKey || findNumericKey(data[0]),
        colors: options.colors || ['#6366F1', '#8B5CF6', '#EC4899', '#F97316', '#10B981', '#06B6D4', '#3B82F6']
      };
      
    case 'table':
      return {
        ...common,
        type: 'table'
      };
      
    case 'scatter':
      return {
        ...common,
        type: 'scatter',
        xKey: options.xKey || findNumericKey(data[0]),
        yKey: options.yKey || findAnotherNumericKey(data[0], options.xKey || findNumericKey(data[0])),
        colors: options.colors || ['#6366F1']
      };
      
    default:
      return {
        ...common,
        type: 'auto'
      };
  }
};

/**
 * Sugere o melhor tipo de visualização com base nos dados
 * @param {Array} data - Dados estruturados
 * @returns {string} - Tipo de visualização recomendado
 */
const suggestVisualizationType = (data) => {
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
 * Encontra a primeira chave com valor numérico em um objeto
 * @param {Object} obj - Objeto a analisar
 * @returns {string|null} - Nome da chave ou null se não encontrar
 */
const findNumericKey = (obj) => {
  if (!obj) return null;
  
  for (const key in obj) {
    if (typeof obj[key] === 'number') {
      return key;
    }
  }
  
  return null;
};

/**
 * Encontra outra chave numérica diferente da especificada
 * @param {Object} obj - Objeto a analisar
 * @param {string} keyToIgnore - Chave a ignorar
 * @returns {string|null} - Nome da chave ou null se não encontrar
 */
const findAnotherNumericKey = (obj, keyToIgnore) => {
  if (!obj) return null;
  
  for (const key in obj) {
    if (key !== keyToIgnore && typeof obj[key] === 'number') {
      return key;
    }
  }
  
  return null;
};

/**
 * Gera mensagens amigáveis para o estado de processamento do documento
 * @param {string} status - Status do processamento
 * @param {number} progress - Progresso (0-100)
 * @returns {string} - Mensagem amigável
 */
export const getProcessingMessage = (status, progress) => {
  const uploadingMessages = [
    "Enviando seu documento para análise...",
    "Transferindo os dados com segurança...",
    "Preparando o arquivo para processamento...",
    "Quase lá! Finalizando o upload..."
  ];
  
  const processingMessages = [
    "Analisando a estrutura do documento...",
    "Identificando informações importantes...",
    "Processando o conteúdo com IA...",
    "Extraindo dados para você consultar depois..."
  ];
  
  const analyzingMessages = [
    "Descobrindo padrões interessantes...",
    "Organizando as informações para você...",
    "Conectando os pontos importantes...",
    "Preparando dados para visualização..."
  ];
  
  const finalizingMessages = [
    "Quase pronto! Finalizando a análise...",
    "Polindo os resultados para você...",
    "Otimizando para consultas rápidas...",
    "Apenas mais alguns instantes..."
  ];
  
  // Selecionar mensagem com base no status e progresso
  if (status === 'uploading') {
    const index = Math.min(
      Math.floor(progress / 25),
      uploadingMessages.length - 1
    );
    return uploadingMessages[index];
  } else if (status === 'processing') {
    if (progress < 40) {
      const index = Math.min(
        Math.floor((progress - 0) / 10),
        processingMessages.length - 1
      );
      return processingMessages[index];
    } else if (progress < 70) {
      const index = Math.min(
        Math.floor((progress - 40) / 10),
        analyzingMessages.length - 1
      );
      return analyzingMessages[index];
    } else {
      const index = Math.min(
        Math.floor((progress - 70) / 10),
        finalizingMessages.length - 1
      );
      return finalizingMessages[index];
    }
  } else if (status === 'error') {
    return "Ocorreu um erro no processamento. Tente novamente.";
  } else if (status === 'completed') {
    return "Documento processado com sucesso!";
  }
  
  return "Processando documento...";
};

/**
 * Salva uma visualização para referência futura
 * @param {Object} visualization - Dados da visualização
 * @param {string} conversationId - ID da conversa
 * @param {string} messageId - ID da mensagem associada
 * @returns {Promise<Object>} - Resposta da API
 */
export const saveVisualization = async (visualization, conversationId, messageId) => {
  try {
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
 * Exporta uma visualização para um formato específico
 * @param {Object} visualization - Dados da visualização
 * @param {string} format - Formato de exportação (png, svg, csv, json)
 * @returns {Promise<Blob|string>} - Dados exportados
 */
export const exportVisualization = async (visualization, format = 'png') => {
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
      // Normalmente você precisaria de uma biblioteca como html2canvas
      // Aqui vamos apenas retornar um erro
      throw new Error('Exportação para PNG requer implementação específica');
    case 'svg':
      // Similar ao PNG, requer manipulação do DOM
      throw new Error('Exportação para SVG requer implementação específica');
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

export default {
  searchRelevantChunks,
  formatChunksAsContext,
  extractVisualizationData,
  processAssistantMessage,
  checkDocumentsStatus,
  getConversationDocuments,
  generateVisualization,
  getProcessingMessage,
  saveVisualization,
  exportVisualization
};