/**
 * Teste da comunicação Claude Terminal Service
 */

const ClaudeTerminalService = require('./claude-terminal-service');

async function testClaudeTerminal() {
  console.log('🧪 Testando Claude Terminal Service...\n');
  
  const claudeService = new ClaudeTerminalService();
  
  try {
    // Teste 1: Status do serviço
    console.log('📊 Status do serviço:');
    console.log(claudeService.getStatus());
    console.log('');
    
    // Teste 2: Ping terminal
    console.log('🏓 Testando conexão com terminal...');
    await claudeService.checkTerminalConnection();
    console.log('');
    
    if (!claudeService.isTerminalReady) {
      console.log('❌ Terminal não está disponível');
      console.log('💡 Execute: node terminal-listener.js no WSL');
      return;
    }
    
    // Teste 3: Análise de documento simulada
    console.log('📄 Testando análise de documento...');
    const testClientId = 'test-client-123';
    const testFilePath = '/containers/test/sample.pdf';
    
    const analysisResult = await claudeService.startDocumentAnalysis(
      testClientId, 
      testFilePath, 
      'pitch-deck'
    );
    
    console.log('✅ Análise concluída:');
    console.log('Resultado:', analysisResult.analysisResult.substring(0, 200) + '...');
    console.log('');
    
    // Teste 4: Conversa contextual
    console.log('💬 Testando conversa contextual...');
    const chatResponse = await claudeService.continueConversation(
      testClientId,
      'Qual é o modelo de negócio apresentado?'
    );
    
    console.log('✅ Resposta da conversa:');
    console.log('Resposta:', chatResponse.response.substring(0, 200) + '...');
    console.log('');
    
    // Limpeza
    claudeService.endConversation(testClientId);
    console.log('🧹 Teste concluído e recursos limpos');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

// Executar teste se chamado diretamente
if (require.main === module) {
  testClaudeTerminal();
}

module.exports = testClaudeTerminal;