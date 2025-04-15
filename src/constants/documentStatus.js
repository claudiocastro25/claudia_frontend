/**
 * Centralizador de status de documentos e funções auxiliares
 * para unificar a verificação de status em toda a aplicação
 */

// Estados principais dos documentos
export const DOCUMENT_STATUS = {
    PENDING: 'pending',
    UPLOADING: 'uploading',
    PROCESSING: 'processing',
    ANALYZING: 'analyzing',
    COMPLETED: 'completed',
    ERROR: 'error',
  };
  
  // Função para verificar se um status é considerado "completo"
  export const isCompleted = (status) => {
    if (!status) return false;
    
    const completedStatuses = [
      'completed', 'complete', 'finalizado', 
      'concluído', 'concluido', 'success', 
      'disponível', 'available'
    ];
    
    return completedStatuses.includes(status.toLowerCase());
  };
  
  // Função para verificar se um status é considerado "em processamento"
  export const isProcessing = (status) => {
    if (!status) return false;
    
    const processingStatuses = [
      'processing', 'uploading', 'processando', 
      'em processamento', 'pending', 'analyzing'
    ];
    
    return processingStatuses.includes(status.toLowerCase());
  };
  
  // Função para verificar se um status é considerado "erro"
  export const isError = (status) => {
    if (!status) return false;
    
    const errorStatuses = [
      'error', 'failed', 'erro', 
      'falha', 'falhou', 'unavailable'
    ];
    
    return errorStatuses.includes(status.toLowerCase());
  };
  
  // Obter cor com base no status
  export const getStatusColor = (status) => {
    if (isError(status)) return 'error';
    if (isCompleted(status)) return 'success';
    if (isProcessing(status)) return 'warning';
    return 'info';
  };
  
  // Obter label amigável com base no status
  export const getStatusLabel = (status) => {
    if (!status) return 'Desconhecido';
    
    if (isError(status)) return 'Erro';
    if (isCompleted(status)) return 'Concluído';
    
    switch (status.toLowerCase()) {
      case 'uploading': return 'Enviando';
      case 'processing': return 'Processando';
      case 'pending': return 'Aguardando';
      case 'analyzing': return 'Analisando';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };
  
  // Mensagens amigáveis para cada fase do processamento
  export const PROCESSING_MESSAGES = {
    uploading: [
      "Enviando seu documento para a nuvem...",
      "Preparando o arquivo para processamento...",
      "Estabelecendo conexão segura para envio...",
      "Já recebi uma parte do seu documento...",
      "Quase lá! Finalizando o upload..."
    ],
    processing: [
      "Analisando a estrutura do documento...",
      "Reconhecendo o conteúdo das páginas...",
      "Extraindo informações valiosas...",
      "Organizando os dados para análise...",
      "Identificando conceitos importantes..."
    ],
    analyzing: [
      "Aplicando inteligência para compreender o conteúdo...",
      "Relacionando informações entre diferentes partes...",
      "Descobrindo padrões interessantes nos dados...",
      "Preparando visualizações e resumos...",
      "Fazendo as conexões finais entre os conceitos..."
    ],
    finalizing: [
      "Finalizando o processamento...",
      "Validando a qualidade da extração...",
      "Tudo pronto para suas perguntas!",
      "Documento processado com sucesso!",
      "Pronto para explorar o conteúdo!"
    ]
  };
  
  // Obter mensagem amigável com base no status e progresso
  export const getProcessingMessage = (status, progress) => {
    // Determinar a fase atual
    let phase = "uploading";
    if (progress >= 25 && progress < 50) phase = "processing";
    else if (progress >= 50 && progress < 75) phase = "analyzing";
    else if (progress >= 75) phase = "finalizing";
    
    // Mensagens da fase atual
    const messages = PROCESSING_MESSAGES[phase] || PROCESSING_MESSAGES.processing;
    
    // Escolher uma mensagem adequada da fase
    const index = Math.min(
      Math.floor((progress % 25) / 6.25),
      messages.length - 1
    );
    
    return messages[index];
  };