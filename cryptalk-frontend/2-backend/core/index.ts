/**
 * Core Module Index
 * Exportações centralizadas de todos os módulos core
 */

// Configuration
export * from './config/ConfigService';
export { ConfigService, createConfigService, configService } from './config/ConfigService';
export type { AppConfig } from './config/ConfigService';

// Dependency Injection
export * from './di/Container';
export { Container, createContainer } from './di/Container';
export type { ServiceDefinition, ServiceInstance, ServiceType, Lifecycle } from './di/Container';

// Interfaces
export * from './interfaces';

/**
 * Função de bootstrap do sistema
 * Configura e inicializa todos os serviços core
 */
export async function bootstrapCore(configPath?: string) {
  console.log('🚀 Iniciando bootstrap do sistema CrypTalk...');
  
  // 1. Carregar configuração
  const configService = createConfigService();
  if (configPath) {
    await configService.loadFromFile(configPath);
  }
  
  // 2. Validar configuração
  const validation = configService.validate();
  if (!validation.valid) {
    console.error('❌ Erros de configuração:');
    validation.errors.forEach(error => console.error(`   - ${error}`));
    throw new Error('Configuração inválida');
  }
  
  // 3. Criar container DI
  const container = createContainer(configService.getConfig());
  
  console.log('✅ Bootstrap core concluído');
  
  return {
    configService,
    container,
    config: configService.getConfig()
  };
}