#!/usr/bin/env python3
"""
Arquivo de exemplo para testes de análise de código
Este arquivo contém vários tipos de problemas para testar o sistema de análise
"""

import os
import sys
import json
import time
import hashlib
from typing import List, Dict, Optional

# Problema 1: Função com recursão ineficiente
def fibonacci(n: int) -> int:
    """Implementação ineficiente de Fibonacci"""
    if n <= 1:
        return n
    else:
        return fibonacci(n-1) + fibonacci(n-2)

# Problema 2: Função sem tratamento de erro
def divide_numbers(a: float, b: float) -> float:
    """Divisão sem tratamento de erro"""
    result = a / b  # Pode gerar ZeroDivisionError
    return result

# Problema 3: Função com vazamento de memória potencial
def load_large_data(filename: str) -> List[str]:
    """Carrega dados sem otimização"""
    data = []
    with open(filename, 'r') as f:
        for line in f:
            data.append(line.strip())  # Pode consumir muita memória
    return data

# Problema 4: Função com SQL injection potencial
def query_user(user_id: str) -> str:
    """Query insegura (exemplo)"""
    query = f"SELECT * FROM users WHERE id = '{user_id}'"  # SQL injection
    return query

# Problema 5: Função com hardcoded secrets
def connect_to_api():
    """Conecta à API com credenciais hardcoded"""
    api_key = "abc123secret456"  # Hardcoded secret
    api_url = "https://api.example.com"
    return f"{api_url}?key={api_key}"

# Problema 6: Função com loop infinito potencial
def process_data(data: List[int]) -> List[int]:
    """Processa dados com loop potencialmente infinito"""
    result = []
    i = 0
    while i < len(data):
        if data[i] > 0:
            result.append(data[i] * 2)
        # Bug: esqueceu de incrementar i em alguns casos
        if data[i] != 0:
            i += 1
    return result

# Problema 7: Função com uso incorreto de globals
global_counter = 0

def increment_counter():
    """Uso incorreto de variável global"""
    global global_counter
    global_counter += 1
    return global_counter

# Problema 8: Função com format string vulnerability
def log_message(message: str, level: str = "INFO"):
    """Log com format string vulnerability"""
    log_entry = f"[{level}] {message}"
    print(log_entry)  # Pode ser perigoso se message contém format strings

# Problema 9: Classe com design inadequado
class DataProcessor:
    """Classe com vários problemas de design"""
    
    def __init__(self):
        self.data = []
        self.cache = {}
        self.temp_files = []
    
    def process(self, input_data):
        """Método que faz muitas coisas"""
        # Viola Single Responsibility Principle
        self.validate_data(input_data)
        self.transform_data(input_data)
        self.save_to_cache(input_data)
        self.cleanup_temp_files()
        self.send_notification()
        return input_data
    
    def validate_data(self, data):
        """Validação básica"""
        if not data:
            raise ValueError("Data cannot be empty")
    
    def transform_data(self, data):
        """Transformação de dados"""
        pass
    
    def save_to_cache(self, data):
        """Salva no cache"""
        key = str(hash(str(data)))
        self.cache[key] = data
    
    def cleanup_temp_files(self):
        """Limpa arquivos temporários"""
        for file in self.temp_files:
            try:
                os.remove(file)
            except OSError:
                pass  # Ignora erros silenciosamente
    
    def send_notification(self):
        """Envia notificação"""
        pass

# Problema 10: Função main com muita complexidade
def main():
    """Função principal com muita complexidade"""
    # Muitos if/else aninhados
    if len(sys.argv) > 1:
        if sys.argv[1] == "fibonacci":
            if len(sys.argv) > 2:
                try:
                    n = int(sys.argv[2])
                    if n >= 0:
                        if n < 100:
                            result = fibonacci(n)
                            print(f"Fibonacci({n}) = {result}")
                        else:
                            print("Number too large")
                    else:
                        print("Number must be positive")
                except ValueError:
                    print("Invalid number")
            else:
                print("Missing number argument")
        elif sys.argv[1] == "divide":
            if len(sys.argv) > 3:
                try:
                    a = float(sys.argv[2])
                    b = float(sys.argv[3])
                    result = divide_numbers(a, b)
                    print(f"{a} / {b} = {result}")
                except ValueError:
                    print("Invalid numbers")
                except ZeroDivisionError:
                    print("Cannot divide by zero")
            else:
                print("Missing arguments")
        else:
            print("Unknown command")
    else:
        print("Usage: python script.py <command> [args]")

# Código com boas práticas para comparação
class SecureDataProcessor:
    """Exemplo de classe com boas práticas"""
    
    def __init__(self, max_cache_size: int = 1000):
        self._data: List[Dict] = []
        self._cache: Dict[str, any] = {}
        self._max_cache_size = max_cache_size
    
    def process_data(self, data: List[Dict]) -> List[Dict]:
        """Processa dados de forma segura"""
        if not data:
            raise ValueError("Data cannot be empty")
        
        validated_data = self._validate_data(data)
        transformed_data = self._transform_data(validated_data)
        
        return transformed_data
    
    def _validate_data(self, data: List[Dict]) -> List[Dict]:
        """Valida dados de entrada"""
        valid_data = []
        for item in data:
            if self._is_valid_item(item):
                valid_data.append(item)
        return valid_data
    
    def _is_valid_item(self, item: Dict) -> bool:
        """Verifica se item é válido"""
        return isinstance(item, dict) and 'id' in item
    
    def _transform_data(self, data: List[Dict]) -> List[Dict]:
        """Transforma dados"""
        transformed = []
        for item in data:
            processed_item = self._process_item(item)
            transformed.append(processed_item)
        return transformed
    
    def _process_item(self, item: Dict) -> Dict:
        """Processa item individual"""
        # Implementação segura
        return {
            'id': item['id'],
            'processed_at': time.time(),
            'hash': hashlib.sha256(str(item).encode()).hexdigest()
        }

if __name__ == "__main__":
    main()