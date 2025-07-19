
// Configuração do tunnel para CrypTalk
window.CRYPTALK_CONFIG = {
  API_URL: 'https://furthermore-decide-para-ste.trycloudflare.com',
  WEBSOCKET_URL: 'wss://furthermore-decide-para-ste.trycloudflare.com',
  TUNNEL_URL: 'https://furthermore-decide-para-ste.trycloudflare.com',
  LOCAL_URL: 'http://localhost:3001',
  MODE: 'tunnel',
  TUNNEL_ACTIVE: true,
  FEATURES: {
    TUNNEL: true,
    WEBSOCKET: true,
    CORS: true,
    SSL: true
  }
};

console.log('🔗 CrypTalk configurado para usar tunnel:', window.CRYPTALK_CONFIG.TUNNEL_URL);
