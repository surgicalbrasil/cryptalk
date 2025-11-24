// Barrel exports for all types
export * from './auth';
export * from './storage';
export * from './chat';
export * from './payments';
export * from './ai';
export * from './api';

// Common UI Types
export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

export interface ErrorState {
  hasError: boolean;
  error?: Error | string;
}

export interface AppState extends LoadingState, ErrorState {
  isInitialized: boolean;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface FormField {
  name: string;
  label: string;
  type: InputType;
  required?: boolean;
  placeholder?: string;
  validation?: ValidationRule[];
}

export interface ValidationRule {
  type: ValidationType;
  value?: any;
  message: string;
}

export type InputType = 
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'file'
  | 'select'
  | 'textarea'
  | 'checkbox'
  | 'radio';

export type ValidationType = 
  | 'required'
  | 'email'
  | 'minLength'
  | 'maxLength'
  | 'pattern'
  | 'custom';

export type ThemeMode = 'light' | 'dark' | 'system';
export type Language = 'en' | 'pt' | 'es';
export type Currency = 'USD' | 'BRL' | 'EUR';