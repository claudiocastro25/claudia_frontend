// Arquivo: src/services/ragService.js
// Serviço aprimorado de RAG para o frontend

import api from './api';
import { handleApiError } from './serviceAdapter';

// Configurações
const RAG_CONFIG = {
  maxChunks: 10,  // Máximo de chunks para incluir no contexto
  maxTokens: 8000, // Limite aproximado de tokens para o contexto
  relevanceThreshold: 0.7, // Limiar de relevância para inclusão de chunks
  visualizationTypes: ['table', 'chart', 'tree', 'graph', 'network'],
  maxRetries: 2,
  retryDelay: 1000
};

/**
 * Função para tentar operações com retry
 */
const withRetry = async (operation, options = {}) => {
  const maxRetries = options.maxRetries || RAG_CONFIG.maxRetries;
  const delay = options.delay || RAG_CONFIG.retryDelay;
  
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.error(`Tentativa ${attempt + 1}/${maxRetries + 1} falhou:`, error);
      lastError = error;
      
      if (attempt < maxRetries) {
        // Esperar antes da próxima tentativa (com backoff exponencial)
        const waitTime = delay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw lastError;
};

/**
 * Busca chunks de documentos relevantes para uma consulta
 */
export const searchRelevantChunks = async (query, conversationId, limit = RAG_CONFIG.maxChunks) => {
  return withRetry(async () => {
    try {
      console.log(`Buscando chunks relevantes para query: "${query}"`);
      
      const response = await api.get('/api/documents/search', {
        params: {
          query,
          conversationId,
          limit
        }
      });
      
      if (response.data && response.data.status === 'success') {
        const results = response.data.data?.results || [];
        console.log(`Encontrados ${results.length} chunks relevantes`);
        return results;
      }
      
      console.warn('Formato de resposta para busca de chunks não reconhecido:', response);
      return [];
    } catch (error) {
      console.error('Erro ao buscar chunks relevantes:', error);
      const errorMsg = handleApiError(error, 'Falha ao buscar documentos relevantes');
      throw new Error(errorMsg);
    }
  });
};

/**
 * Formata chunks para criar o contexto para o modelo de IA
 */
export const formatChunksAsContext = (chunks) => {
  if (!chunks || chunks.length === 0) return '';
  
  let context = '\n\n### CONTEXTO DE DOCUMENTOS ###\n\n';
  
  // Informações sobre fontes para metadados
  const sourceInfo = [];
  
  for (const [index, chunk] of chunks.entries()) {
    // Formatar nome do documento de forma amigável
    const docName = chunk.filename || chunk.original_filename || `Documento ${index + 1}`;
    const docType = chunk.file_type ? chunk.file_type.toUpperCase() : '';
    
    // Adicionar separador claro entre chunks
    context += `---- Documento: ${docName} (${docType}) ----\n\n`;
    
    // Adicionar o texto do chunk
    if (chunk.chunk_text) {
      context += `${chunk.chunk_text}\n\n`;
    } else if (chunk.text) {
      context += `${chunk.text}\n\n`;
    } else if (chunk.content) {
      context += `${chunk.content}\n\n`;
    }
    
    // Adicionar metadados como página, se disponíveis
    if (chunk.metadata) {
      if (chunk.metadata.page) {
        context += `Fonte: Página ${chunk.metadata.page}\n`;
      }
      if (chunk.metadata.section) {
        context += `Seção: ${chunk.metadata.section}\n`;
      }
    }
    
    context += '\n';
    
    // Adicionar à lista de fontes
    sourceInfo.push({
      index: index + 1,
      documentId: chunk.document_id,
      filename: chunk.filename || chunk.original_filename,
      page: chunk.metadata?.page,
      chunkIndex: chunk.chunk_index,
      similarity: chunk.similarity
    });
  }
  
  // Adicionar instruções para uso do contexto
  context += `\n### INSTRUÇÕES PARA USO DO CONTEXTO ###
1. Use APENAS as informações fornecidas acima para responder à pergunta do usuário.
2. Se as informações necessárias não estiverem presentes no contexto, responda que não pode encontrar essa informação nos documentos fornecidos.
3. NÃO invente informações ou use conhecimento externo ao contexto fornecido.
4. Quando utilizar informações do contexto, cite de qual documento a informação foi obtida.
5. Se um trecho parecer incompleto ou estranho, indique isso na sua resposta.
6. Para cada afirmação específica sobre dados ou fatos, indique de qual documento ela foi extraída.
7. Responda em português de forma clara e objetiva.
`;

  return context;
};

/**
 * Verifica se um texto contém conteúdo visualizável
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
 */
export const processAssistantMessage = (messageContent) => {
  // Extrair possíveis dados de visualização
  const visualizationData = extractVisualizationData(messageContent);
  
  // Verificar referências a documentos
  const documentReferences = extractDocumentReferences(messageContent);
  
  return {
    visualizationData,
    documentReferences,
    hasVisualization: !!visualizationData,
    hasDocumentReferences: documentReferences.length > 0
  };
};

/**
 * Extrai referências a documentos do texto da mensagem
 */
const extractDocumentReferences = (text) => {
  if (!text) return [];
  
  const references = [];
  
  // Padrões comuns de referência a documentos
  // 1. "no documento X" ou "no arquivo X"
  const docPattern1 = /no\s+(?:documento|arquivo)\s+["']([^"']+)["']/gi;
  // 2. "de acordo com X" ou "conforme X" onde X parece um nome de arquivo
  const docPattern2 = /(?:de acordo com|conforme|segundo|baseado em)\s+["']([^"']+\.\w{3,4})["']/gi;
  // 3. "Fonte: X" ou "Referência: X"
  const docPattern3 = /(?:fonte|referência|ref\.):\s*([^,;.\n]+\.\w{3,4})/gi;
  // 4. Referência a um documento específico por nome
  const docPattern4 = /documento\s+(?:chamado|intitulado|nomeado)\s+["']([^"']+)["']/gi;
  // 5. Referência a uma página específica
  const docPattern5 = /página\s+(\d+)\s+(?:do|de|no)\s+(?:documento|arquivo)\s+["']([^"']+)["']/gi;
  
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
  
  while ((match = docPattern4.exec(text)) !== null) {
    references.push({
      name: match[1],
      type: 'named',
      context: match[0]
    });
  }
  
  while ((match = docPattern5.exec(text)) !== null) {
    references.push({
      name: match[2],
      page: match[1],
      type: 'paged',
      context: match[0]
    });
  }
  
  return references;
};

/**
 * Verifica o status dos documentos na conversa atual
 */
export const checkDocumentsStatus = async (conversationId) => {
  return withRetry(async () => {
    try {
      const response = await api.get(`/api/documents/status`, {
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
      throw new Error(handleApiError(error, 'Falha ao verificar status dos documentos'));
    }
  });
};

/**
 * Obtém documentos disponíveis para uma conversa
 */
export const getConversationDocuments = async (conversationId) => {
  return withRetry(async () => {
    try {
      const response = await api.get(`/api/documents`, {
        params: { conversationId }
      });
      
      if (response.data.status === 'success') {
        return response.data.data.documents || [];
      }
      
      return [];
    } catch (error) {
      console.error('Erro ao obter documentos da conversa:', error);
      throw new Error(handleApiError(error, 'Falha ao obter documentos da conversa'));
    }
  });
};

/**
 * Gera mensagens amigáveis para o estado de processamento do documento
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

export default {
  searchRelevantChunks,
  formatChunksAsContext,
  extractVisualizationData,
  processAssistantMessage,
  checkDocumentsStatus,
  getConversationDocuments,
  getProcessingMessage
};