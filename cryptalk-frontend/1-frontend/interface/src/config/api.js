// Configuração da API para arquitetura híbrida
// ============================================

// Detectar ambiente
const isProduction = import.meta.env.PROD;
const isDevelopment = import.meta.env.DEV;
const isTunnelMode = import.meta.env.VITE_APP_MODE === 'tunnel';
const tunnelActive = import.meta.env.VITE_TUNNEL_ACTIVE === 'true';

// Configuração global (pode ser sobrescrita pelo config.js)
let globalConfig = null;

// Tentar carregar configuração global do window
if (typeof window !== 'undefined' && window.CRYPTALK_CONFIG) {
  globalConfig = window.CRYPTALK_CONFIG;
}

// URLs padrão baseadas no ambiente - SISTEMA HÍBRIDO
const getDefaultUrls = () => {
  // Detectar se estamos rodando localmente ou no Vercel
  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || 
     window.location.hostname === '127.0.0.1' ||
     window.location.hostname.includes('localhost'));
  
  // MODO HÍBRIDO: Se estiver localhost, usar conexão direta
  if (isLocalhost) {
    console.log('🏠 Modo Híbrido: Usando conexão local direta');
    return {
      API_URL: 'http://localhost:3002',
      WEBSOCKET_URL: 'ws://localhost:8080',
      MODE: 'local-hybrid'
    };
  }
  
  // Se não for localhost (Vercel), tentar ngrok tunnel
  if (tunnelActive || isTunnelMode || isProduction) {
    const tunnelUrl = import.meta.env.VITE_TUNNEL_URL || 'https://f79b50c021b3.ngrok-free.app';
    console.log('🌐 Modo Híbrido: Usando ngrok tunnel para acesso remoto');
    return {
      API_URL: tunnelUrl,
      WEBSOCKET_URL: tunnelUrl.replace('https://', 'wss://'),
      TUNNEL_URL: tunnelUrl,
      MODE: 'ngrok-hybrid'
    };
  }
  
  // Fallback padrão
  return {
    API_URL: import.meta.env.VITE_API_URL || 'http://localhost:3002',
    WEBSOCKET_URL: import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:8080',
    MODE: 'fallback'
  };
};

// Configuração da API
export const API_CONFIG = {
  ...getDefaultUrls(),
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  UPLOAD_CHUNK_SIZE: 1024 * 1024, // 1MB
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  SUPPORTED_FORMATS: [
    'text/plain',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/markdown',
    'application/json',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
};

// Configuração da aplicação
export const APP_CONFIG = {
  ENVIRONMENT: isProduction ? 'production' : 'development',
  VERSION: '1.0.0',
  FEATURES: {
    REAL_TIME_ANALYSIS: true,
    FILE_UPLOAD: true,
    WEBSOCKET_SUPPORT: true,
    DARK_MODE: true,
    OFFLINE_MODE: false
  },
  UI: {
    THEME: 'dark',
    LANGUAGE: 'pt-BR',
    ANIMATIONS: true,
    SOUND_EFFECTS: false
  }
};

// Configuração do WebSocket
export const WEBSOCKET_CONFIG = {
  URL: API_CONFIG.WEBSOCKET_URL,
  RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY: 3000,
  HEARTBEAT_INTERVAL: 30000,
  MESSAGE_QUEUE_SIZE: 100,
  AUTO_RECONNECT: true
};

// Configuração de logging
export const LOG_CONFIG = {
  LEVEL: isProduction ? 'error' : 'debug',
  CONSOLE: !isProduction,
  REMOTE: isProduction,
  MAX_ENTRIES: 1000
};

// Função para atualizar configuração dinamicamente
export const updateConfig = (newConfig) => {
  Object.assign(API_CONFIG, newConfig);
  
  // Atualizar configuração global se disponível
  if (typeof window !== 'undefined' && window.CRYPTALK_CONFIG) {
    Object.assign(window.CRYPTALK_CONFIG, newConfig);
  }
};

// Função para detectar se a API está disponível
export const checkApiAvailability = async () => {
  try {
    const response = await fetch(`${API_CONFIG.API_URL}/api/health`, {
      method: 'GET',
      timeout: 5000
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        available: true,
        version: data.version,
        environment: data.environment,
        features: data.features
      };
    }
    
    return { available: false, error: 'API não respondeu' };
  } catch (error) {
    return { available: false, error: error.message };
  }
};

// Função para detectar e configurar URLs automaticamente - SISTEMA HÍBRIDO
export const autoDetectUrls = async () => {
  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || 
     window.location.hostname === '127.0.0.1' ||
     window.location.hostname.includes('localhost'));

  // MODO HÍBRIDO: Se for localhost, testar conexão direta primeiro
  if (isLocalhost) {
    console.log('🔍 Detecção Híbrida: Testando conexão local...');
    
    const localUrls = [
      'http://localhost:3002',
      'http://localhost:3001', 
      'http://127.0.0.1:3002',
      'http://127.0.0.1:3001'
    ];
    
    for (const url of localUrls) {
      try {
        const response = await fetch(`${url}/api/client/create`, {
          method: 'POST',
          timeout: 3000
        });
        
        if (response.ok) {
          const wsUrl = url.replace('http://', 'ws://').replace('3002', '8080').replace('3001', '8080');
          const localConfig = {
            API_URL: url,
            WEBSOCKET_URL: wsUrl,
            MODE: 'local-hybrid-detected'
          };
          
          console.log('✅ Conexão local detectada:', url);
          updateConfig(localConfig);
          return localConfig;
        }
      } catch (error) {
        console.log('❌ Falhou:', url, error.message);
        continue;
      }
    }
    
    console.log('⚠️ Conexão local falhou, mantendo configuração padrão');
    return API_CONFIG;
  }
  
  // MODO REMOTO: Se não for localhost (Vercel), usar ngrok tunnel
  console.log('🌐 Detecção Híbrida: Modo remoto, usando ngrok tunnel');
  if (tunnelActive || isTunnelMode || isProduction) {
    const tunnelUrl = import.meta.env.VITE_TUNNEL_URL || 'https://f79b50c021b3.ngrok-free.app';
    const tunnelConfig = {
      API_URL: tunnelUrl,
      WEBSOCKET_URL: tunnelUrl.replace('https://', 'wss://'),
      TUNNEL_URL: tunnelUrl,
      MODE: 'ngrok-hybrid'
    };
    
    updateConfig(tunnelConfig);
    return tunnelConfig;
  }
  
  // Fallback
  return API_CONFIG;
};

// Função para log de configuração - SISTEMA HÍBRIDO
export const logConfig = () => {
  if (LOG_CONFIG.CONSOLE) {
    console.group('🔧 CrypTalk Configuration - Sistema Híbrido');
    console.log('Environment:', APP_CONFIG.ENVIRONMENT);
    console.log('Mode:', API_CONFIG.MODE || 'standard');
    console.log('API URL:', API_CONFIG.API_URL);
    console.log('WebSocket URL:', API_CONFIG.WEBSOCKET_URL);
    
    if (API_CONFIG.MODE?.includes('local')) {
      console.log('🏠 Modo Local: Conexão direta sem tunnel');
    } else if (API_CONFIG.MODE?.includes('tunnel')) {
      console.log('🌐 Modo Tunnel: Conexão via tunnel público');
    }
    
    console.log('Features:', APP_CONFIG.FEATURES);
    console.log('Version:', APP_CONFIG.VERSION);
    console.groupEnd();
  }
};

// Exportar configuração completa
export const FULL_CONFIG = {
  API: API_CONFIG,
  APP: APP_CONFIG,
  WEBSOCKET: WEBSOCKET_CONFIG,
  LOG: LOG_CONFIG
};

// Funções específicas para o tunnel
export const tunnelUtils = {
  // Verificar se o tunnel está ativo
  isTunnelActive: () => tunnelActive || isTunnelMode,
  
  // Obter URL do tunnel
  getTunnelUrl: () => import.meta.env.VITE_TUNNEL_URL || 'https://furthermore-decide-para-ste.trycloudflare.com',
  
  // Configurar para usar tunnel
  enableTunnel: () => {
    const tunnelUrl = import.meta.env.VITE_TUNNEL_URL || 'https://furthermore-decide-para-ste.trycloudflare.com';
    const tunnelConfig = {
      API_URL: tunnelUrl,
      WEBSOCKET_URL: tunnelUrl.replace('https://', 'wss://'),
      TUNNEL_URL: tunnelUrl,
      MODE: 'tunnel'
    };
    
    updateConfig(tunnelConfig);
    return tunnelConfig;
  },
  
  // Configurar para usar localhost
  enableLocalhost: () => {
    const localConfig = {
      API_URL: 'http://localhost:3001',
      WEBSOCKET_URL: 'ws://localhost:8080',
      MODE: 'local'
    };
    
    updateConfig(localConfig);
    return localConfig;
  },
  
  // Testar conectividade do tunnel
  testTunnelConnection: async () => {
    const tunnelUrl = import.meta.env.VITE_TUNNEL_URL || 'https://furthermore-decide-para-ste.trycloudflare.com';
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${tunnelUrl}/api/health`, {
        method: 'GET',
        timeout: 10000,
        mode: 'cors'
      });
      
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          url: tunnelUrl,
          status: data,
          latency: Date.now() - startTime
        };
      }
      
      return {
        success: false,
        url: tunnelUrl,
        error: 'Tunnel não respondeu com sucesso'
      };
    } catch (error) {
      return {
        success: false,
        url: tunnelUrl,
        error: error.message
      };
    }
  }
};

// Inicializar configuração
if (isDevelopment) {
  // Em desenvolvimento, tentar auto-detectar
  autoDetectUrls().then(logConfig);
} else {
  // Em produção, usar configuração atual
  logConfig();
}

export default API_CONFIG;