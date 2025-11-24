/**
 * Dependency Injection Container
 * Gerencia dependências e lifecycle de serviços
 */

import { EventEmitter } from 'events';
import { ConfigService, AppConfig } from '../config/ConfigService';

export type ServiceType = 'docker' | 'claude' | 'upload' | 'websocket' | 'config';
export type Lifecycle = 'singleton' | 'transient' | 'scoped';

export interface ServiceDefinition<T = any> {
  name: string;
  type: ServiceType;
  factory: (container: Container) => T | Promise<T>;
  lifecycle: Lifecycle;
  dependencies?: string[];
  metadata?: Record<string, any>;
}

export interface ServiceInstance<T = any> {
  name: string;
  instance: T;
  createdAt: Date;
  lifecycle: Lifecycle;
  dependencies: string[];
  isInitialized: boolean;
  isStarted: boolean;
}

export class Container extends EventEmitter {
  private services = new Map<string, ServiceDefinition>();
  private instances = new Map<string, ServiceInstance>();
  private scopes = new Map<string, Map<string, any>>();
  private initializationOrder: string[] = [];

  constructor(private config?: AppConfig) {
    super();
    this.registerCoreServices();
  }

  /**
   * Registra serviços essenciais do sistema
   */
  private registerCoreServices(): void {
    // ConfigService como singleton
    this.register({
      name: 'config',
      type: 'config',
      lifecycle: 'singleton',
      factory: () => this.config ? 
        Object.assign(ConfigService.getInstance(), { config: this.config }) : 
        ConfigService.getInstance()
    });
  }

  /**
   * Registra um serviço no container
   */
  public register<T>(definition: ServiceDefinition<T>): void {
    if (this.services.has(definition.name)) {
      throw new Error(`Serviço '${definition.name}' já está registrado`);
    }

    this.services.set(definition.name, definition);
    this.emit('service_registered', definition);
    
    console.log(`📋 Serviço registrado: ${definition.name} (${definition.lifecycle})`);
  }

  /**
   * Resolve uma dependência do container
   */
  public async resolve<T>(serviceName: string, scope?: string): Promise<T> {
    const definition = this.services.get(serviceName);
    if (!definition) {
      throw new Error(`Serviço '${serviceName}' não encontrado`);
    }

    // Verifica dependências circulares
    this.checkCircularDependencies(serviceName, []);

    switch (definition.lifecycle) {
      case 'singleton':
        return this.resolveSingleton<T>(definition);
      
      case 'scoped':
        if (!scope) {
          throw new Error(`Serviço '${serviceName}' requer um escopo`);
        }
        return this.resolveScoped<T>(definition, scope);
      
      case 'transient':
        return this.resolveTransient<T>(definition);
      
      default:
        throw new Error(`Lifecycle '${definition.lifecycle}' não suportado`);
    }
  }

  /**
   * Resolve serviço singleton
   */
  private async resolveSingleton<T>(definition: ServiceDefinition<T>): Promise<T> {
    let instance = this.instances.get(definition.name);
    
    if (!instance) {
      // Resolver dependências primeiro
      await this.resolveDependencies(definition);
      
      const serviceInstance = await definition.factory(this);
      
      instance = {
        name: definition.name,
        instance: serviceInstance,
        createdAt: new Date(),
        lifecycle: definition.lifecycle,
        dependencies: definition.dependencies || [],
        isInitialized: false,
        isStarted: false
      };
      
      this.instances.set(definition.name, instance);
      this.emit('service_created', instance);
    }
    
    return instance.instance as T;
  }

  /**
   * Resolve serviço scoped
   */
  private async resolveScoped<T>(definition: ServiceDefinition<T>, scope: string): Promise<T> {
    if (!this.scopes.has(scope)) {
      this.scopes.set(scope, new Map());
    }
    
    const scopeMap = this.scopes.get(scope)!;
    
    if (!scopeMap.has(definition.name)) {
      await this.resolveDependencies(definition);
      const instance = await definition.factory(this);
      scopeMap.set(definition.name, instance);
      
      this.emit('scoped_service_created', { scope, service: definition.name, instance });
    }
    
    return scopeMap.get(definition.name) as T;
  }

  /**
   * Resolve serviço transient (nova instância sempre)
   */
  private async resolveTransient<T>(definition: ServiceDefinition<T>): Promise<T> {
    await this.resolveDependencies(definition);
    const instance = await definition.factory(this);
    
    this.emit('transient_service_created', { service: definition.name, instance });
    return instance as T;
  }

  /**
   * Resolve dependências de um serviço
   */
  private async resolveDependencies(definition: ServiceDefinition): Promise<void> {
    if (!definition.dependencies || definition.dependencies.length === 0) {
      return;
    }

    for (const dependency of definition.dependencies) {
      await this.resolve(dependency);
    }
  }

  /**
   * Verifica dependências circulares
   */
  private checkCircularDependencies(serviceName: string, chain: string[]): void {
    if (chain.includes(serviceName)) {
      throw new Error(`Dependência circular detectada: ${chain.join(' -> ')} -> ${serviceName}`);
    }

    const definition = this.services.get(serviceName);
    if (!definition?.dependencies) return;

    for (const dependency of definition.dependencies) {
      this.checkCircularDependencies(dependency, [...chain, serviceName]);
    }
  }

  /**
   * Inicializa todos os serviços em ordem correta
   */
  public async initializeAll(): Promise<void> {
    console.log('🚀 Inicializando todos os serviços...');
    
    // Calcular ordem de inicialização
    this.calculateInitializationOrder();
    
    for (const serviceName of this.initializationOrder) {
      await this.initializeService(serviceName);
    }
    
    console.log('✅ Todos os serviços inicializados');
    this.emit('all_services_initialized');
  }

  /**
   * Inicializa um serviço específico
   */
  public async initializeService(serviceName: string): Promise<void> {
    const serviceInstance = await this.resolve(serviceName);
    const instance = this.instances.get(serviceName);
    
    if (!instance) return;
    
    // Chama método initialize se existir
    if (serviceInstance && typeof (serviceInstance as any).initialize === 'function') {
      console.log(`🔧 Inicializando serviço: ${serviceName}`);
      await (serviceInstance as any).initialize();
      instance.isInitialized = true;
      
      this.emit('service_initialized', serviceName);
    }
  }

  /**
   * Inicia todos os serviços
   */
  public async startAll(): Promise<void> {
    console.log('▶️ Iniciando todos os serviços...');
    
    for (const serviceName of this.initializationOrder) {
      await this.startService(serviceName);
    }
    
    console.log('✅ Todos os serviços iniciados');
    this.emit('all_services_started');
  }

  /**
   * Inicia um serviço específico
   */
  public async startService(serviceName: string): Promise<void> {
    const serviceInstance = await this.resolve(serviceName);
    const instance = this.instances.get(serviceName);
    
    if (!instance) return;
    
    // Chama método start se existir
    if (serviceInstance && typeof (serviceInstance as any).start === 'function') {
      console.log(`▶️ Iniciando serviço: ${serviceName}`);
      await (serviceInstance as any).start();
      instance.isStarted = true;
      
      this.emit('service_started', serviceName);
    }
  }

  /**
   * Para todos os serviços gracefully
   */
  public async stopAll(): Promise<void> {
    console.log('⏹️ Parando todos os serviços...');
    
    // Parar em ordem reversa
    const reverseOrder = [...this.initializationOrder].reverse();
    
    for (const serviceName of reverseOrder) {
      await this.stopService(serviceName);
    }
    
    console.log('✅ Todos os serviços parados');
    this.emit('all_services_stopped');
  }

  /**
   * Para um serviço específico
   */
  public async stopService(serviceName: string): Promise<void> {
    const instance = this.instances.get(serviceName);
    if (!instance || !instance.isStarted) return;
    
    const serviceInstance = instance.instance;
    
    // Chama método stop se existir
    if (serviceInstance && typeof (serviceInstance as any).stop === 'function') {
      console.log(`⏹️ Parando serviço: ${serviceName}`);
      await (serviceInstance as any).stop();
      instance.isStarted = false;
      
      this.emit('service_stopped', serviceName);
    }
  }

  /**
   * Limpa um escopo específico
   */
  public clearScope(scope: string): void {
    if (this.scopes.has(scope)) {
      const scopeMap = this.scopes.get(scope)!;
      
      // Chamar dispose em cada instância do escopo
      for (const [serviceName, instance] of scopeMap.entries()) {
        if (instance && typeof instance.dispose === 'function') {
          instance.dispose();
        }
      }
      
      this.scopes.delete(scope);
      this.emit('scope_cleared', scope);
    }
  }

  /**
   * Lista todos os serviços registrados
   */
  public listServices(): Array<{
    name: string;
    type: ServiceType;
    lifecycle: Lifecycle;
    dependencies: string[];
    isRegistered: boolean;
    isInitialized: boolean;
    isStarted: boolean;
  }> {
    return Array.from(this.services.entries()).map(([name, definition]) => {
      const instance = this.instances.get(name);
      return {
        name,
        type: definition.type,
        lifecycle: definition.lifecycle,
        dependencies: definition.dependencies || [],
        isRegistered: true,
        isInitialized: instance?.isInitialized || false,
        isStarted: instance?.isStarted || false
      };
    });
  }

  /**
   * Obtém métricas do container
   */
  public getMetrics(): {
    totalServices: number;
    runningServices: number;
    initializedServices: number;
    servicesByType: Record<ServiceType, number>;
    servicesByLifecycle: Record<Lifecycle, number>;
    totalScopes: number;
    totalInstances: number;
  } {
    const services = this.listServices();
    
    return {
      totalServices: services.length,
      runningServices: services.filter(s => s.isStarted).length,
      initializedServices: services.filter(s => s.isInitialized).length,
      servicesByType: services.reduce((acc, s) => {
        acc[s.type] = (acc[s.type] || 0) + 1;
        return acc;
      }, {} as Record<ServiceType, number>),
      servicesByLifecycle: services.reduce((acc, s) => {
        acc[s.lifecycle] = (acc[s.lifecycle] || 0) + 1;
        return acc;
      }, {} as Record<Lifecycle, number>),
      totalScopes: this.scopes.size,
      totalInstances: this.instances.size
    };
  }

  /**
   * Calcula ordem de inicialização baseada em dependências
   */
  private calculateInitializationOrder(): void {
    const visited = new Set<string>();
    const temp = new Set<string>();
    const order: string[] = [];

    const visit = (serviceName: string) => {
      if (temp.has(serviceName)) {
        throw new Error(`Dependência circular detectada incluindo: ${serviceName}`);
      }
      
      if (visited.has(serviceName)) return;
      
      temp.add(serviceName);
      
      const definition = this.services.get(serviceName);
      if (definition?.dependencies) {
        for (const dependency of definition.dependencies) {
          visit(dependency);
        }
      }
      
      temp.delete(serviceName);
      visited.add(serviceName);
      order.push(serviceName);
    };

    // Visitar todos os serviços
    for (const serviceName of this.services.keys()) {
      if (!visited.has(serviceName)) {
        visit(serviceName);
      }
    }

    this.initializationOrder = order;
  }

  /**
   * Health check do container
   */
  public async healthCheck(): Promise<{
    healthy: boolean;
    services: Array<{
      name: string;
      healthy: boolean;
      error?: string;
    }>;
  }> {
    const results: Array<{ name: string; healthy: boolean; error?: string }> = [];
    
    for (const [serviceName, instance] of this.instances.entries()) {
      try {
        if (instance.instance && typeof (instance.instance as any).isHealthy === 'function') {
          const healthy = await (instance.instance as any).isHealthy();
          results.push({ name: serviceName, healthy });
        } else {
          results.push({ name: serviceName, healthy: instance.isStarted });
        }
      } catch (error) {
        results.push({ 
          name: serviceName, 
          healthy: false, 
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    return {
      healthy: results.every(r => r.healthy),
      services: results
    };
  }
}

/**
 * Factory function para criar container
 */
export function createContainer(config?: AppConfig): Container {
  return new Container(config);
}