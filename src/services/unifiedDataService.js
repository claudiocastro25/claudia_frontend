import api from './api';
import { adaptApiResponse, parseApiError } from './serviceAdapter';
import { API_ENDPOINTS } from '../constants/apiEndpoints';

/**
 * Serviço unificado para dados combinando RAG e visualização
 * Elimina duplicação entre ragService e visualizationService
 */

// Buscar chunks relevantes para uma consulta
export const searchRelevantChunks = async (query, conversationId, limit = 10) => {
  try {
    const response = await api.get(API_ENDPOINTS.DOCUMENTS.SEARCH, {
      params: {
        query,
        conversationId,
        limit
      }
    });
    
    const adaptedResponse = adaptApiResponse(response);
    
    if (adaptedResponse.status === 'success') {
      return adaptedResponse.data?.results || [];
    }
    
    return [];
  } catch (error) {
    console.error('Erro ao buscar chunks relevantes:', error);
    throw parseApiError(error, 'Falha ao buscar contexto relevante');
  }
};

// Formatar chunks como contexto para o modelo
export const formatChunksAsContext = (chunks) => {
  if (!chunks || chunks.length === 0) return '';
  
  let context = "Informações dos documentos:\n\n";
  
  for (const [index, chunk] of chunks.entries()) {
    // Adicionar separador
    context += `--- Documento ${index + 1}: ${chunk.filename || 'Documento'} ---\n\n`;
    
    // Adicionar texto do chunk
    context += `${chunk.chunk_text || chunk.text || ''}\n\n`;
    
    // Adicionar metadados como página
    if (chunk.metadata && chunk.metadata.page) {
      context += `(Fonte: Página ${chunk.metadata.page})\n\n`;
    }
  }
  
  return context;
};

// Extrair visualizações de uma mensagem do assistente
export const extractVisualizationFromMessage = (messageContent) => {
  if (!messageContent) return null;
  
  try {
    // Verificar padrões comuns de dados de visualização
    
    // 1. Formato JSON específico para visualização
    const vizRegex = /```visualization\s*([\s\S]*?)\s*```/;
    const vizMatch = messageContent.match(vizRegex);
    
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
    const tableMatch = messageContent.match(tableRegex);
    
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
    const jsonMatch = messageContent.match(jsonRegex);
    
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
    const mermaidMatch = messageContent.match(mermaidRegex);
    
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

// Função auxiliar para processar tabelas markdown
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

// Processar uma mensagem do assistente para extrair dados de visualização
export const processAssistantMessage = (messageContent) => {
  // Extrair possíveis dados de visualização
  const visualizationData = extractVisualizationFromMessage(messageContent);
  
  // Verificar referências a documentos
  const docReferences = extractDocumentReferences(messageContent);
  
  return {
    visualizationData,
    documentReferences: docReferences,
    hasVisualization: !!visualizationData,
    hasDocumentReferences: docReferences.length > 0
  };
};

// Extrair referências a documentos do texto da mensagem
const extractDocumentReferences = (text) => {
  const references = [];
  
  if (!text) return references;
  
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

// Verificar o status dos documentos na conversa atual
export const checkDocumentsStatus = async (conversationId) => {
  try {
    const response = await api.get(`${API_ENDPOINTS.RAG.STATUS}`, {
      params: { conversationId }
    });
    
    const adaptedResponse = adaptApiResponse(response);
    
    if (adaptedResponse.status === 'success') {
      return adaptedResponse.data || {
        hasDocuments: false,
        ready: 0,
        processing: 0,
        error: 0
      };
    }
    
    return {
      hasDocuments: false,
      ready: 0,
      processing: 0,
      error: 0
    };
  } catch (error) {
    console.error('Erro ao verificar status dos documentos:', error);
    throw parseApiError(error, 'Falha ao verificar status dos documentos');
  }
};

// Salvar uma visualização para referência futura
export const saveVisualization = async (visualization, conversationId, messageId) => {
  try {
    const response = await api.post(API_ENDPOINTS.VISUALIZATION.SAVE, {
      conversationId,
      messageId,
      title: visualization.title || 'Visualização',
      type: visualization.type,
      data: visualization.data,
      config: visualization.config || {}
    });
    
    return adaptApiResponse(response);
  } catch (error) {
    console.error('Erro ao salvar visualização:', error);
    throw parseApiError(error, 'Falha ao salvar visualização');
  }
};

// Exportar funcionalidades para uso em toda a aplicação
export default {
  searchRelevantChunks,
  formatChunksAsContext,
  extractVisualizationFromMessage,
  processAssistantMessage,
  checkDocumentsStatus,
  saveVisualization
};