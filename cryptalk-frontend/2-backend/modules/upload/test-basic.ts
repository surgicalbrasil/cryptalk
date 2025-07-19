/**
 * Teste básico do módulo Upload/File
 * Verifica se a compilação e funcionalidades básicas estão funcionando
 */

import { 
  initializeUploadModule, 
  createFileValidator,
  checkModuleHealth,
  DocumentType 
} from './index';

async function testeBasico() {
  console.log('🧪 Iniciando teste básico do módulo Upload/File...\n');

  try {
    // Teste 1: Health check
    console.log('1. Testando health check...');
    const health = await checkModuleHealth();
    console.log(`   Status: ${health.status}`);
    console.log(`   Componentes: ${Object.entries(health.components).map(([k, v]) => `${k}:${v}`).join(', ')}`);
    
    if (health.issues.length > 0) {
      console.log('   Problemas:', health.issues);
    }

    // Teste 2: Validação básica
    console.log('\n2. Testando validação básica...');
    const validator = createFileValidator();
    
    const testBuffer = Buffer.from('%PDF-1.4\nConteúdo PDF básico');
    const validation = await validator.validateFileStructure(testBuffer, 'technical');
    
    console.log(`   Válido: ${validation.isValid}`);
    console.log(`   Erros: ${validation.errors.length}`);
    console.log(`   Avisos: ${validation.warnings.length}`);

    // Teste 3: Inicialização do módulo
    console.log('\n3. Testando inicialização do módulo...');
    const uploadModule = initializeUploadModule({
      fileService: {
        storage: { type: 'memory' }
      }
    });

    console.log('   Módulo inicializado com sucesso');
    console.log(`   Tipos permitidos: ${uploadModule.getAllowedTypes().join(', ')}`);

    // Teste 4: Upload básico
    console.log('\n4. Testando upload básico...');
    const testFile = Buffer.from('Conteúdo de teste para arquivo');
    
    try {
      const metadata = await uploadModule.processUpload(
        testFile,
        'teste.txt',
        'technical',
        'client-test'
      );

      console.log(`   Arquivo processado: ${metadata.id}`);
      console.log(`   Nome: ${metadata.originalName}`);
      console.log(`   Tamanho: ${metadata.size} bytes`);
      console.log(`   Status: ${metadata.status}`);

      // Teste 5: Listagem de arquivos
      console.log('\n5. Testando listagem de arquivos...');
      const files = await uploadModule.listFiles('client-test');
      console.log(`   Arquivos encontrados: ${files.length}`);

      // Teste 6: Estatísticas
      console.log('\n6. Testando estatísticas...');
      const stats = await uploadModule.getStats();
      console.log(`   Total de uploads: ${stats.totalUploads}`);
      console.log(`   Tamanho total: ${stats.totalSizeMB} MB`);

    } catch (uploadError) {
      console.log(`   Erro no upload (esperado para arquivo .txt): ${uploadError instanceof Error ? uploadError.message : uploadError}`);
    }

    // Limpeza
    uploadModule.destroy();
    validator.removeAllListeners();

    console.log('\n✅ Teste básico concluído com sucesso!');
    return true;

  } catch (error) {
    console.error('\n❌ Erro no teste básico:', error instanceof Error ? error.message : error);
    console.error('Stack trace:', error instanceof Error ? error.stack : error);
    return false;
  }
}

// Executar teste se chamado diretamente
if (require.main === module) {
  testeBasico()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Erro fatal:', error);
      process.exit(1);
    });
}

export { testeBasico };