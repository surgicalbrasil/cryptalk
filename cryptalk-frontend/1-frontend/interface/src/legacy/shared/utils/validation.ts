import { ValidationRule, ValidationType } from '../types';

export class ValidationUtils {
  static validateField(value: any, rules: ValidationRule[]): string | null {
    for (const rule of rules) {
      const error = this.validateRule(value, rule);
      if (error) {
        return error;
      }
    }
    return null;
  }

  static validateRule(value: any, rule: ValidationRule): string | null {
    switch (rule.type) {
      case 'required':
        return this.validateRequired(value, rule.message);
      
      case 'email':
        return this.validateEmail(value, rule.message);
      
      case 'minLength':
        return this.validateMinLength(value, rule.value, rule.message);
      
      case 'maxLength':
        return this.validateMaxLength(value, rule.value, rule.message);
      
      case 'pattern':
        return this.validatePattern(value, rule.value, rule.message);
      
      case 'custom':
        return this.validateCustom(value, rule.value, rule.message);
      
      default:
        return null;
    }
  }

  private static validateRequired(value: any, message: string): string | null {
    if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
      return message;
    }
    return null;
  }

  private static validateEmail(value: string, message: string): string | null {
    if (!value) return null; // Let required rule handle empty values
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return message;
    }
    return null;
  }

  private static validateMinLength(value: string, minLength: number, message: string): string | null {
    if (!value) return null; // Let required rule handle empty values
    
    if (value.length < minLength) {
      return message;
    }
    return null;
  }

  private static validateMaxLength(value: string, maxLength: number, message: string): string | null {
    if (!value) return null;
    
    if (value.length > maxLength) {
      return message;
    }
    return null;
  }

  private static validatePattern(value: string, pattern: RegExp | string, message: string): string | null {
    if (!value) return null; // Let required rule handle empty values
    
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    if (!regex.test(value)) {
      return message;
    }
    return null;
  }

  private static validateCustom(value: any, validator: Function, message: string): string | null {
    try {
      const isValid = validator(value);
      return isValid ? null : message;
    } catch (error) {
      return message;
    }
  }

  // Common validation rules
  static createRequiredRule(message: string = 'This field is required'): ValidationRule {
    return { type: 'required', message };
  }

  static createEmailRule(message: string = 'Please enter a valid email address'): ValidationRule {
    return { type: 'email', message };
  }

  static createMinLengthRule(minLength: number, message?: string): ValidationRule {
    return {
      type: 'minLength',
      value: minLength,
      message: message || `Must be at least ${minLength} characters`
    };
  }

  static createMaxLengthRule(maxLength: number, message?: string): ValidationRule {
    return {
      type: 'maxLength',
      value: maxLength,
      message: message || `Must be no more than ${maxLength} characters`
    };
  }

  static createPasswordRule(): ValidationRule {
    return {
      type: 'pattern',
      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
    };
  }

  static createWalletAddressRule(): ValidationRule {
    return {
      type: 'pattern',
      value: /^0x[a-fA-F0-9]{40}$/,
      message: 'Please enter a valid Ethereum wallet address'
    };
  }

  static createBRLAmountRule(min: number = 0, max: number = 1000000): ValidationRule {
    return {
      type: 'custom',
      value: (value: string) => {
        const num = parseFloat(value);
        return !isNaN(num) && num >= min && num <= max;
      },
      message: `Amount must be between R$ ${min.toFixed(2)} and R$ ${max.toFixed(2)}`
    };
  }

  static createCPFRule(): ValidationRule {
    return {
      type: 'custom',
      value: this.validateCPF,
      message: 'Please enter a valid CPF'
    };
  }

  static createCNPJRule(): ValidationRule {
    return {
      type: 'custom',
      value: this.validateCNPJ,
      message: 'Please enter a valid CNPJ'
    };
  }

  // Brazilian document validation
  private static validateCPF(cpf: string): boolean {
    cpf = cpf.replace(/[^\d]/g, '');
    
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
      return false;
    }

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(9))) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    
    return remainder === parseInt(cpf.charAt(10));
  }

  private static validateCNPJ(cnpj: string): boolean {
    cnpj = cnpj.replace(/[^\d]/g, '');
    
    if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) {
      return false;
    }

    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cnpj.charAt(i)) * weights1[i];
    }
    
    let remainder = sum % 11;
    const digit1 = remainder < 2 ? 0 : 11 - remainder;
    
    if (digit1 !== parseInt(cnpj.charAt(12))) return false;

    sum = 0;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cnpj.charAt(i)) * weights2[i];
    }
    
    remainder = sum % 11;
    const digit2 = remainder < 2 ? 0 : 11 - remainder;
    
    return digit2 === parseInt(cnpj.charAt(13));
  }
}