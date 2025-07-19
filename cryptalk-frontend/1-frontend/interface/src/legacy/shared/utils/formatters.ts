export class FormatUtils {
  // Currency formatting
  static formatBRL(amount: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  }

  static formatUSD(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  static formatCrypto(amount: number, symbol: string, decimals: number = 6): string {
    return `${amount.toFixed(decimals)} ${symbol}`;
  }

  // Date formatting
  static formatDate(date: Date, locale: string = 'pt-BR'): string {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  }

  static formatDateTime(date: Date, locale: string = 'pt-BR'): string {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  static formatRelativeTime(date: Date, locale: string = 'pt-BR'): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return locale === 'pt-BR' ? 'agora mesmo' : 'just now';
    }

    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    
    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return rtf.format(-minutes, 'minute');
    }
    
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return rtf.format(-hours, 'hour');
    }
    
    const days = Math.floor(diffInSeconds / 86400);
    return rtf.format(-days, 'day');
  }

  // Address formatting
  static formatWalletAddress(address: string, startChars: number = 6, endChars: number = 4): string {
    if (!address || address.length <= startChars + endChars) {
      return address;
    }
    return `${address.substring(0, startChars)}...${address.substring(address.length - endChars)}`;
  }

  static formatTransactionHash(hash: string): string {
    return this.formatWalletAddress(hash, 8, 6);
  }

  // File size formatting
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Number formatting
  static formatPercentage(value: number, decimals: number = 2): string {
    return `${(value * 100).toFixed(decimals)}%`;
  }

  static formatLargeNumber(num: number): string {
    if (num >= 1e9) {
      return (num / 1e9).toFixed(1) + 'B';
    }
    if (num >= 1e6) {
      return (num / 1e6).toFixed(1) + 'M';
    }
    if (num >= 1e3) {
      return (num / 1e3).toFixed(1) + 'K';
    }
    return num.toString();
  }

  // Document formatting (Brazilian)
  static formatCPF(cpf: string): string {
    const cleaned = cpf.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{3})(\d{2})$/);
    if (match) {
      return `${match[1]}.${match[2]}.${match[3]}-${match[4]}`;
    }
    return cpf;
  }

  static formatCNPJ(cnpj: string): string {
    const cleaned = cnpj.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/);
    if (match) {
      return `${match[1]}.${match[2]}.${match[3]}/${match[4]}-${match[5]}`;
    }
    return cnpj;
  }

  static formatPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      const match = cleaned.match(/^(\d{2})(\d{4})(\d{4})$/);
      if (match) {
        return `(${match[1]}) ${match[2]}-${match[3]}`;
      }
    } else if (cleaned.length === 11) {
      const match = cleaned.match(/^(\d{2})(\d{5})(\d{4})$/);
      if (match) {
        return `(${match[1]}) ${match[2]}-${match[3]}`;
      }
    }
    return phone;
  }

  // PIX key formatting
  static formatPIXKey(key: string, type: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random'): string {
    switch (type) {
      case 'cpf':
        return this.formatCPF(key);
      case 'cnpj':
        return this.formatCNPJ(key);
      case 'phone':
        return this.formatPhone(key);
      case 'email':
      case 'random':
      default:
        return key;
    }
  }

  // Time duration formatting
  static formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  // Text formatting
  static truncateText(text: string, maxLength: number, suffix: string = '...'): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - suffix.length) + suffix;
  }

  static capitalizeFirst(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  static capitalizeWords(text: string): string {
    return text.replace(/\w\S*/g, (txt) =>
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }

  // Status formatting
  static formatStatus(status: string): string {
    return status
      .split('_')
      .map(word => this.capitalizeFirst(word))
      .join(' ');
  }

  // Network fee estimation
  static formatGasPrice(gwei: number): string {
    return `${gwei.toFixed(2)} Gwei`;
  }

  static estimateTransactionCost(gasPrice: number, gasLimit: number, ethPrice: number): string {
    const costInEth = (gasPrice * gasLimit) / 1e9; // Convert from Gwei to ETH
    const costInUSD = costInEth * ethPrice;
    return `~$${costInUSD.toFixed(2)} (${costInEth.toFixed(6)} ETH)`;
  }
}