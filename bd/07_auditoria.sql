-- =============================================================
-- SGPA - Script 07: Schema sgpa_auditoria
-- Microservicio: ms-auditoria (puerto 3006)
-- SOLO INSERCIONES: esta tabla nunca se actualiza ni se elimina.
-- =============================================================

SET search_path TO sgpa_auditoria;

CREATE TYPE tipo_accion_log AS ENUM (
    'ALTA',
    'MODIFICACION',
    'BAJA',
    'LOGIN',
    'LOGOUT'
);

CREATE TABLE IF NOT EXISTS LOG_AUDITORIA (
    id_log      SERIAL           PRIMARY KEY,

    -- Referencia lógica al usuario (validada por el ms antes de insertar)
    id_usuario  INT              NOT NULL,     -- → sgpa_usuarios.USUARIO

    tipo_accion tipo_accion_log  NOT NULL,
    entidad     VARCHAR(50)      NOT NULL,     -- nombre de la tabla afectada, ej: 'AUDIENCIA'
    id_entidad  INT,                           -- ID del registro afectado (NULL para LOGIN/LOGOUT)

    -- Snapshot del estado antes y después del cambio
    detalle     JSONB,

    -- Cuerpo completo del request HTTP que originó la acción
    -- Incluye: método, URL, body, headers relevantes
    request     JSONB,

    fecha_hora  TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    ip_origen   VARCHAR(45)      NOT NULL      -- soporta IPv4 e IPv6
);

-- Índices para los filtros más comunes del módulo de auditoría
CREATE INDEX idx_log_usuario    ON LOG_AUDITORIA(id_usuario);
CREATE INDEX idx_log_fecha      ON LOG_AUDITORIA(fecha_hora DESC);
CREATE INDEX idx_log_entidad    ON LOG_AUDITORIA(entidad);
CREATE INDEX idx_log_accion     ON LOG_AUDITORIA(tipo_accion);

-- Índice GIN sobre los campos JSONB para búsquedas dentro del JSON
CREATE INDEX idx_log_detalle    ON LOG_AUDITORIA USING GIN(detalle);
CREATE INDEX idx_log_request    ON LOG_AUDITORIA USING GIN(request);
