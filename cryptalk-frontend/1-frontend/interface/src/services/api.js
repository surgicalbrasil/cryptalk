// Serviço de API para arquitetura híbrida
// ======================================

import { API_CONFIG, checkApiAvailability, logConfig } from '../config/api.js';

class ApiService {
  constructor() {
    this.baseURL = API_CONFIG.API_URL;
    this.timeout = API_CONFIG.TIMEOUT;
    this.retryAttempts = API_CONFIG.RETRY_ATTEMPTS;
    this.isAvailable = false;
    
    // Verificar disponibilidade da API na inicialização
    this.checkHealth();
  }

  // Verificar saúde da API
  async checkHealth() {
    try {
      const result = await checkApiAvailability();
      this.isAvailable = result.available;
      
      if (result.available) {
        console.log('✅ API conectada:', result);
      } else {
        console.warn('⚠️ API indisponível:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Erro ao verificar API:', error);
      this.isAvailable = false;
      return { available: false, error: error.message };
    }
  }

  // Fazer requisição com retry
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const requestOptions = {
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    let lastError;
    
    for (let attempt = 0; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, requestOptions);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data;
      } catch (error) {
        lastError = error;
        
        if (attempt < this.retryAttempts) {
          const delay = Math.pow(2, attempt) * 1000; // Backoff exponencial
          console.warn(`⚠️ Tentativa ${attempt + 1} falhou, tentando novamente em ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  // Criar sessão de cliente
  async createClientSession() {
    try {
      const response = await this.request('/api/client/create', {
        method: 'POST'
      });
      
      return response;
    } catch (error) {
      console.error('❌ Erro ao criar sessão:', error);
      throw error;
    }
  }

  // Upload de arquivo
  async uploadFile(file, clientId, documentType) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientId', clientId);
      formData.append('documentType', documentType);

      const response = await fetch(`${this.baseURL}/api/upload`, {
        method: 'POST',
        body: formData,
        // Não definir Content-Type para FormData
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Erro no upload:', error);
      throw error;
    }
  }

  // Iniciar análise
  async startAnalysis(clientId, filePath, documentType) {
    try {
      const response = await this.request('/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          clientId,
          filePath,
          documentType
        })
      });
      
      return response;
    } catch (error) {
      console.error('❌ Erro ao iniciar análise:', error);
      throw error;
    }
  }

  // Listar arquivos do cliente
  async listClientFiles(clientId) {
    try {
      const response = await this.request(`/api/client/${clientId}/files`);
      return response;
    } catch (error) {
      console.error('❌ Erro ao listar arquivos:', error);
      throw error;
    }
  }

  // Download de arquivo
  async downloadFile(clientId, fileName) {
    try {
      const url = `${this.baseURL}/api/download/${clientId}/${fileName}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.blob();
    } catch (error) {
      console.error('❌ Erro no download:', error);
      throw error;
    }
  }

  // Limpar sessão do cliente
  async cleanupClient(clientId) {
    try {
      const response = await this.request(`/api/client/${clientId}`, {
        method: 'DELETE'
      });
      
      return response;
    } catch (error) {
      console.error('❌ Erro ao limpar sessão:', error);
      throw error;
    }
  }

  // Obter informações do sistema
  async getSystemInfo() {
    try {
      const response = await this.request('/api/info');
      return response;
    } catch (error) {
      console.error('❌ Erro ao obter informações do sistema:', error);
      throw error;
    }
  }
}

// Criar instância única do serviço
export const apiService = new ApiService();
export default apiService;