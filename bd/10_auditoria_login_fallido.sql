-- Compatibilidad con bases ya inicializadas antes de registrar logins fallidos.
ALTER TYPE sgpa_auditoria.tipo_accion_log ADD VALUE IF NOT EXISTS 'LOGIN_FALLIDO';
ALTER TABLE sgpa_auditoria.log_auditoria ALTER COLUMN id_usuario DROP NOT NULL;
