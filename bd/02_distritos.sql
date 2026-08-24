-- =============================================================
-- SGPA - Script 02: Schema sgpa_distritos
-- Microservicio: ms-distritos (puerto 3001)
-- =============================================================

SET search_path TO sgpa_distritos;

CREATE TABLE IF NOT EXISTS DISTRITO (
    id_distrito SERIAL       PRIMARY KEY,
    nombre      VARCHAR(100) NOT NULL,
    activo      BOOLEAN      NOT NULL DEFAULT TRUE
);

-- Seed: distritos iniciales de la Provincia de Santa Fe
INSERT INTO DISTRITO (nombre) VALUES
    ('Santa Fe'),
    ('Rosario');
