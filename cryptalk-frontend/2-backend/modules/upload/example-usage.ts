/**
 * Exemplo de uso do módulo Upload/File
 * Demonstra como usar o módulo desacoplado de frameworks HTTP
 */

import { 
  initializeUploadModule, 
  createFileService, 
  createUploadManager, 
  createFileValidator,
  checkModuleHealth 
} from './index';

// Exemplo 1: Uso básico com módulo completo
async function exemploBasico() {
  console.log('=== Exemplo Básico ===');
  
  const uploadModule = initializeUploadModule({
    fileService: {
      uploadPath: '/tmp/cryptalk-uploads',
      storage: {
        type: 'hybrid',
        memoryLimit: 50 * 1024 * 1024 // 50MB
      }
    }
  });

  // Simular um arquivo PDF
  const pdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000074 00000 n \n0000000120 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n179\n%%EOF');

  try {
    // Upload de arquivo
    const metadata = await uploadModule.processUpload(
      pdfBuffer,
      'documento-financeiro.pdf',
      'financial',
      'client-123'
    );

    console.log('Arquivo processado:', {
      id: metadata.id,
      originalName: metadata.originalName,
      size: metadata.size,
      documentType: metadata.documentType,
      status: metadata.status
    });

    // Listar arquivos do cliente
    const files = await uploadModule.listFiles('client-123');
    console.log('Arquivos do cliente:', files.length);

    // Obter estatísticas
    const stats = await uploadModule.getStats();
    console.log('Estatísticas:', {
      totalUploads: stats.totalUploads,
      totalSizeMB: stats.totalSizeMB,
      uploadsByType: stats.uploadsByType
    });

  } catch (error) {
    console.error('Erro no upload:', error instanceof Error ? error.message : error);
  } finally {
    uploadModule.destroy();
  }
}

// Exemplo 2: Upload resumível (chunked)
async function exemploUploadResumivel() {
  console.log('\n=== Exemplo Upload Resumível ===');
  
  const uploadManager = createUploadManager({
    chunkedUpload: {
      enabled: true,
      chunkSize: 1024, // 1KB chunks para demo
      maxChunks: 10
    }
  });

  // Simular arquivo grande
  const largeFileBuffer = Buffer.alloc(5000, 'x'); // 5KB
  const fileName = 'arquivo-grande.pdf';
  const chunkSize = 1024;

  try {
    // Iniciar upload resumível
    const sessionId = await uploadManager.startResumableUpload(
      fileName,
      largeFileBuffer.length,
      'technical',
      'client-456'
    );

    console.log('Sessão de upload iniciada:', sessionId);

    // Simular upload de chunks
    const totalChunks = Math.ceil(largeFileBuffer.length / chunkSize);
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, largeFileBuffer.length);
      const chunk = largeFileBuffer.slice(start, end);
      
      await uploadManager.resumeUpload(sessionId, chunk, start);
      
      const status = uploadManager.getUploadSessionStatus(sessionId);
      console.log(`Chunk ${i + 1}/${totalChunks} - Progresso: ${status.progress?.toFixed(1)}%`);
    }

    console.log('Upload resumível concluído!');

  } catch (error) {
    console.error('Erro no upload resumível:', error instanceof Error ? error.message : error);
  } finally {
    uploadManager.destroy();
  }
}

// Exemplo 3: Processamento em lote
async function exemploProcessamentoLote() {
  console.log('\n=== Exemplo Processamento em Lote ===');
  
  const uploadManager = createUploadManager({
    batchProcessing: {
      enabled: true,
      maxBatchSize: 5,
      maxConcurrentBatches: 2
    }
  });

  // Simular múltiplos arquivos
  const files = [
    {
      buffer: Buffer.from('Conteúdo do documento legal 1'),
      name: 'contrato-1.pdf',
      type: 'legal' as const
    },
    {
      buffer: Buffer.from('Dados financeiros planilha 1'),
      name: 'planilha-1.xlsx',
      type: 'financial' as const
    },
    {
      buffer: Buffer.from('Documento técnico especificação'),
      name: 'specs.md',
      type: 'technical' as const
    }
  ];

  try {
    // Processar lote
    const results = await uploadManager.processBatch(files, 'client-789');
    
    console.log('Lote processado:');
    results.forEach((metadata, index) => {
      console.log(`  ${index + 1}. ${metadata.originalName} - ${metadata.id}`);
    });

    // Obter estatísticas do cliente
    const clientStats = await uploadManager.getStatsForClient('client-789');
    console.log('Estatísticas do cliente:', clientStats);

  } catch (error) {
    console.error('Erro no processamento em lote:', error instanceof Error ? error.message : error);
  } finally {
    uploadManager.destroy();
  }
}

// Exemplo 4: Validação avançada
async function exemploValidacaoAvancada() {
  console.log('\n=== Exemplo Validação Avançada ===');
  
  const validator = createFileValidator({
    enableContentAnalysis: true,
    strictMimeTypeValidation: true,
    enableMalwareScanning: false // Desabilitado para demo
  });

  // Simular diferentes tipos de arquivo
  const arquivos = [
    {
      name: 'documento.pdf',
      buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj'),
      type: 'legal' as const
    },
    {
      name: 'arquivo-invalido.txt',
      buffer: Buffer.from('Conteúdo texto simples'),
      type: 'legal' as const // Tentativa de enviar TXT como legal
    }
  ];

  for (const arquivo of arquivos) {
    try {
      console.log(`\nValidando: ${arquivo.name}`);
      
      const validation = await validator.validateFileStructure(arquivo.buffer, arquivo.type);
      
      console.log('Resultado:', {
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings,
        securityFlags: validation.securityFlags
      });

      if (validation.isValid) {
        // Extrair metadados
        const metadata = await validator.extractMetadata(arquivo.buffer, arquivo.name);
        console.log('Metadados:', metadata);

        // Analisar conteúdo
        const content = await validator.analyzeContent(arquivo.buffer, arquivo.type);
        console.log('Análise de conteúdo:', content);
      }

    } catch (error) {
      console.error(`Erro na validação de ${arquivo.name}:`, error instanceof Error ? error.message : error);
    }
  }

  validator.removeAllListeners();
}

// Exemplo 5: Uso individual do FileService
async function exemploFileService() {
  console.log('\n=== Exemplo FileService Individual ===');
  
  const fileService = createFileService({
    storage: {
      type: 'memory' // Usar apenas memória para demo
    },
    maxFileSize: 10 * 1024 * 1024 // 10MB
  });

  try {
    const testBuffer = Buffer.from('Conteúdo de teste para armazenamento');
    
    // Processar upload
    const metadata = await fileService.processUpload(
      testBuffer,
      'teste-storage.txt',
      'technical',
      'client-storage'
    );

    console.log('Arquivo salvo:', metadata.id);

    // Ler arquivo
    const retrievedBuffer = await fileService.readFile(metadata.id);
    console.log('Conteúdo recuperado:', retrievedBuffer.toString());

    // Atualizar metadados
    const updatedMetadata = await fileService.updateFileMetadata(metadata.id, {
      status: 'archived'
    });
    console.log('Status atualizado:', updatedMetadata.status);

    // Deletar arquivo
    await fileService.deleteFile(metadata.id);
    console.log('Arquivo deletado');

    // Verificar se foi removido
    const deletedMetadata = await fileService.getFileMetadata(metadata.id);
    console.log('Metadados após deleção:', deletedMetadata); // Deve ser null

  } catch (error) {
    console.error('Erro no FileService:', error instanceof Error ? error.message : error);
  } finally {
    fileService.destroy();
  }
}

// Exemplo 6: Monitoramento e eventos
async function exemploMonitoramento() {
  console.log('\n=== Exemplo Monitoramento e Eventos ===');
  
  const uploadManager = createUploadManager();

  // Configurar listeners de eventos
  uploadManager.on('file_uploaded', (data) => {
    console.log(`✅ Arquivo enviado: ${data.originalName} (${data.fileId})`);
  });

  uploadManager.on('file_validated', (data) => {
    console.log(`🔍 Arquivo validado: ${data.type}, válido: ${data.isValid}`);
  });

  uploadManager.on('upload_error', (data) => {
    console.log(`❌ Erro no upload: ${data.originalName} - ${data.error}`);
  });

  uploadManager.on('security_warning', (data) => {
    console.log(`⚠️ Alerta de segurança: ${data.type}`);
  });

  uploadManager.on('chunk_uploaded', (data) => {
    console.log(`📦 Chunk enviado: ${data.progress.toFixed(1)}% completo`);
  });

  try {
    // Fazer alguns uploads para gerar eventos
    const testBuffer = Buffer.from('Conteúdo para teste de eventos');
    
    await uploadManager.processUpload(
      testBuffer,
      'teste-eventos.txt',
      'technical',
      'client-events'
    );

    // Tentar upload inválido
    try {
      await uploadManager.processUpload(
        Buffer.alloc(0), // Buffer vazio
        'arquivo-vazio.pdf',
        'legal',
        'client-events'
      );
    } catch {
      // Erro esperado
    }

  } catch (error) {
    console.error('Erro no monitoramento:', error instanceof Error ? error.message : error);
  } finally {
    uploadManager.destroy();
  }
}

// Exemplo 7: Health check do módulo
async function exemploHealthCheck() {
  console.log('\n=== Exemplo Health Check ===');
  
  try {
    const health = await checkModuleHealth();
    
    console.log('Status do módulo:', health.status);
    console.log('Componentes:', health.components);
    
    if (health.issues.length > 0) {
      console.log('Problemas encontrados:');
      health.issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`);
      });
    }

  } catch (error) {
    console.error('Erro no health check:', error instanceof Error ? error.message : error);
  }
}

// Exemplo 8: Integração com containers (simulada)
async function exemploIntegracaoContainer() {
  console.log('\n=== Exemplo Integração Container ===');
  
  const uploadManager = createUploadManager({
    containerIntegration: {
      enabled: true,
      defaultContainerPath: '/app/uploads'
    }
  });

  // Listener para simulação de transferência
  uploadManager.on('container_transfer_requested', (data) => {
    console.log(`📋 Transferência solicitada para container ${data.containerId}:`);
    console.log(`   Arquivo: ${data.metadata.originalName}`);
    console.log(`   Destino: ${data.containerPath}`);
    console.log(`   Tamanho: ${data.fileBuffer.length} bytes`);
    
    // Aqui seria feita a integração real com Docker API
    console.log('   ✅ Transferência simulada com sucesso');
  });

  try {
    const testBuffer = Buffer.from('Conteúdo para transferir ao container');
    
    // Upload do arquivo
    const metadata = await uploadManager.processUpload(
      testBuffer,
      'arquivo-container.txt',
      'technical',
      'client-container'
    );

    // Transferir para container
    await uploadManager.transferToContainer(
      metadata.id,
      'container-123',
      '/app/uploads/arquivo-container.txt'
    );

  } catch (error) {
    console.error('Erro na integração com container:', error instanceof Error ? error.message : error);
  } finally {
    uploadManager.destroy();
  }
}

// Função principal para executar todos os exemplos
async function executarExemplos() {
  console.log('🚀 Exemplos de uso do módulo Upload/File\n');
  
  try {
    await exemploBasico();
    await exemploUploadResumivel();
    await exemploProcessamentoLote();
    await exemploValidacaoAvancada();
    await exemploFileService();
    await exemploMonitoramento();
    await exemploHealthCheck();
    await exemploIntegracaoContainer();
    
    console.log('\n✅ Todos os exemplos executados com sucesso!');
    
  } catch (error) {
    console.error('\n❌ Erro durante execução dos exemplos:', error instanceof Error ? error.message : error);
  }
}

// Executar se este arquivo for chamado diretamente
if (require.main === module) {
  executarExemplos().catch(console.error);
}

export {
  exemploBasico,
  exemploUploadResumivel,
  exemploProcessamentoLote,
  exemploValidacaoAvancada,
  exemploFileService,
  exemploMonitoramento,
  exemploHealthCheck,
  exemploIntegracaoContainer,
  executarExemplos
};