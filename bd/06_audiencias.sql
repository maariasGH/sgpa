-- =============================================================
-- SGPA - Script 06: Schema sgpa_audiencias
-- Microservicio: ms-audiencias (puerto 3005)
-- Contiene: ESTADO_AUDIENCIA (entidad abstracta) y AUDIENCIA
-- =============================================================

SET search_path TO sgpa_audiencias;

-- ── Entidad abstracta: ESTADO_AUDIENCIA ───────────────────────
CREATE TABLE IF NOT EXISTS ESTADO_AUDIENCIA (
    id_estado  SERIAL       PRIMARY KEY,
    nombre     VARCHAR(30)  NOT NULL UNIQUE
);

-- Seed: estados posibles de una audiencia
INSERT INTO ESTADO_AUDIENCIA (nombre) VALUES
    ('EN_HORARIO'),
    ('DEMORADA'),
    ('REALIZADA'),
    ('CANCELADA'),
    ('SUSPENDIDA'),
    ('REPROGRAMADA');

-- ── Entidad central: AUDIENCIA ────────────────────────────────
CREATE TABLE IF NOT EXISTS AUDIENCIA (
    id_audiencia     SERIAL        PRIMARY KEY,
    cuij             INT   NOT NULL,
    caratula         TEXT          NOT NULL,
    tipo_audiencia   VARCHAR(100)  NOT NULL,

    -- Referencias lógicas entre schemas (validadas vía HTTP, no FK real)
    id_sala          INT           NOT NULL,   -- → sgpa_salas.SALA
    id_juez          INT           NOT NULL,   -- → sgpa_autoridades.AUTORIDAD (cargo=JUEZ)
    id_fiscal        INT           NOT NULL,   -- → sgpa_autoridades.AUTORIDAD (cargo=FISCAL)
    id_usuario_carga INT           NOT NULL,   -- → sgpa_usuarios.USUARIO

    defensor         VARCHAR(200),             -- texto libre, opcional

    fecha            DATE          NOT NULL,
    hora_inicio      TIME          NOT NULL,
    hora_fin         TIME,

    -- FK real dentro del mismo schema
    id_estado        INT           NOT NULL REFERENCES ESTADO_AUDIENCIA(id_estado),

    motivo_cambio    TEXT,                     -- obligatorio si estado es CANCELADA o SUSPENDIDA

    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    -- Restricciones de integridad del negocio
    -- No puede haber dos audiencias en la misma sala al mismo horario
    UNIQUE (id_sala, fecha, hora_inicio),
    -- Un juez no puede presidir dos audiencias al mismo horario
    UNIQUE (id_juez, fecha, hora_inicio),
    -- Un fiscal no puede intervenir en dos audiencias al mismo horario
    UNIQUE (id_fiscal, fecha, hora_inicio)
);

CREATE INDEX idx_audiencia_fecha    ON AUDIENCIA(fecha);
CREATE INDEX idx_audiencia_sala     ON AUDIENCIA(id_sala);
CREATE INDEX idx_audiencia_estado   ON AUDIENCIA(id_estado);
CREATE INDEX idx_audiencia_juez     ON AUDIENCIA(id_juez);
CREATE INDEX idx_audiencia_fiscal   ON AUDIENCIA(id_fiscal);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audiencia_updated_at
BEFORE UPDATE ON AUDIENCIA
FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();
