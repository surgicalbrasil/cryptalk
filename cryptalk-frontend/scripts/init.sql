-- Inicialização do banco de dados PostgreSQL para Claude Code
-- Este script cria as tabelas necessárias para metadados

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    settings JSONB DEFAULT '{}'::jsonb
);

-- Tabela de projetos
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}'::jsonb
);

-- Tabela de jobs
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Tabela de arquivos
CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    content_hash VARCHAR(64),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Tabela de resultados
CREATE TABLE IF NOT EXISTS results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    file_id UUID REFERENCES files(id) ON DELETE SET NULL,
    content TEXT,
    analysis JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Tabela de logs de auditoria
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de métricas
CREATE TABLE IF NOT EXISTS metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,2) NOT NULL,
    tags JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de configurações do sistema
CREATE TABLE IF NOT EXISTS system_config (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_project_id ON jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_files_job_id ON files(job_id);
CREATE INDEX IF NOT EXISTS idx_files_status ON files(status);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at);
CREATE INDEX IF NOT EXISTS idx_results_job_id ON results(job_id);
CREATE INDEX IF NOT EXISTS idx_results_file_id ON results(file_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_metrics_name ON metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_metrics_created_at ON metrics(created_at);

-- Função para atualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para limpar dados antigos
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
    -- Limpar jobs antigos (mais de 30 dias)
    DELETE FROM jobs WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
    
    -- Limpar logs de auditoria antigos (mais de 90 dias)
    DELETE FROM audit_logs WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '90 days';
    
    -- Limpar métricas antigas (mais de 7 dias)
    DELETE FROM metrics WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '7 days';
    
    -- Atualizar estatísticas
    ANALYZE;
END;
$$ LANGUAGE plpgsql;

-- Configurações iniciais do sistema
INSERT INTO system_config (key, value, description) VALUES
    ('max_file_size', '104857600', 'Tamanho máximo de arquivo em bytes (100MB)'),
    ('max_files_per_job', '10', 'Número máximo de arquivos por job'),
    ('job_retention_days', '30', 'Dias para manter jobs no banco'),
    ('audit_log_retention_days', '90', 'Dias para manter logs de auditoria'),
    ('metrics_retention_days', '7', 'Dias para manter métricas'),
    ('allowed_file_types', '["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain", "text/csv", "application/json", "image/jpeg", "image/png", "image/gif", "application/zip"]', 'Tipos de arquivo permitidos'),
    ('container_memory_limit', '536870912', 'Limite de memória por container (512MB)'),
    ('container_cpu_quota', '50000', 'Quota de CPU por container (50%)'),
    ('rate_limit_requests', '10', 'Número de requests por minuto por IP'),
    ('maintenance_mode', 'false', 'Modo de manutenção ativado')
ON CONFLICT (key) DO NOTHING;

-- Usuário administrador padrão (senha: admin123)
INSERT INTO users (username, email, password_hash, settings) VALUES
    ('admin', 'admin@claude-code.local', crypt('admin123', gen_salt('bf')), '{"role": "admin", "permissions": ["all"]}')
ON CONFLICT (username) DO NOTHING;

-- Projeto exemplo para o admin
INSERT INTO projects (user_id, name, description, settings) 
SELECT id, 'Projeto Exemplo', 'Projeto de demonstração do Claude Code', '{"type": "demo"}'
FROM users WHERE username = 'admin'
ON CONFLICT DO NOTHING;

-- Views úteis
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    u.id,
    u.username,
    u.email,
    COUNT(DISTINCT p.id) as total_projects,
    COUNT(DISTINCT j.id) as total_jobs,
    COUNT(DISTINCT f.id) as total_files,
    SUM(f.file_size) as total_file_size,
    u.created_at as user_created_at,
    u.last_login
FROM users u
LEFT JOIN projects p ON u.id = p.user_id
LEFT JOIN jobs j ON u.id = j.user_id
LEFT JOIN files f ON j.id = f.job_id
GROUP BY u.id, u.username, u.email, u.created_at, u.last_login;

CREATE OR REPLACE VIEW job_summary AS
SELECT 
    j.id,
    j.user_id,
    u.username,
    p.name as project_name,
    j.status,
    j.progress,
    COUNT(f.id) as file_count,
    SUM(f.file_size) as total_size,
    j.created_at,
    j.started_at,
    j.completed_at,
    CASE 
        WHEN j.completed_at IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (j.completed_at - j.started_at))
        ELSE NULL
    END as processing_time_seconds
FROM jobs j
JOIN users u ON j.user_id = u.id
LEFT JOIN projects p ON j.project_id = p.id
LEFT JOIN files f ON j.id = f.job_id
GROUP BY j.id, j.user_id, u.username, p.name, j.status, j.progress, j.created_at, j.started_at, j.completed_at;

-- Função para estatísticas do sistema
CREATE OR REPLACE FUNCTION get_system_stats()
RETURNS TABLE (
    total_users BIGINT,
    total_projects BIGINT,
    total_jobs BIGINT,
    total_files BIGINT,
    total_storage_bytes BIGINT,
    active_jobs BIGINT,
    completed_jobs BIGINT,
    failed_jobs BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM users WHERE is_active = true),
        (SELECT COUNT(*) FROM projects WHERE is_active = true),
        (SELECT COUNT(*) FROM jobs),
        (SELECT COUNT(*) FROM files),
        (SELECT COALESCE(SUM(file_size), 0) FROM files),
        (SELECT COUNT(*) FROM jobs WHERE status IN ('pending', 'processing')),
        (SELECT COUNT(*) FROM jobs WHERE status = 'completed'),
        (SELECT COUNT(*) FROM jobs WHERE status = 'failed');
END;
$$ LANGUAGE plpgsql;

-- Log de criação das tabelas
INSERT INTO audit_logs (action, resource_type, details, ip_address) VALUES
    ('database_init', 'system', '{"message": "Database initialized successfully", "tables_created": 8, "indexes_created": 12}', '127.0.0.1');

-- Comentários nas tabelas
COMMENT ON TABLE users IS 'Usuários do sistema';
COMMENT ON TABLE projects IS 'Projetos dos usuários';
COMMENT ON TABLE jobs IS 'Jobs de processamento';
COMMENT ON TABLE files IS 'Arquivos enviados';
COMMENT ON TABLE results IS 'Resultados do processamento';
COMMENT ON TABLE audit_logs IS 'Logs de auditoria';
COMMENT ON TABLE metrics IS 'Métricas do sistema';
COMMENT ON TABLE system_config IS 'Configurações do sistema';

COMMENT ON COLUMN users.settings IS 'Configurações do usuário em JSON';
COMMENT ON COLUMN jobs.metadata IS 'Metadados do job em JSON';
COMMENT ON COLUMN files.metadata IS 'Metadados do arquivo em JSON';
COMMENT ON COLUMN results.analysis IS 'Análise do Claude em JSON';

-- Finalizar
SELECT 'Database initialization completed successfully' as status;