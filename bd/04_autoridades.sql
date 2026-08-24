-- =============================================================
-- SGPA - Script 04: Schema sgpa_autoridades
-- Microservicio: ms-autoridades (puerto 3003)
-- =============================================================

SET search_path TO sgpa_autoridades;

CREATE TYPE cargo_autoridad AS ENUM ('JUEZ', 'FISCAL');

CREATE TABLE IF NOT EXISTS AUTORIDAD (
    id_autoridad SERIAL          PRIMARY KEY,
    nombre       VARCHAR(100)    NOT NULL,
    apellido     VARCHAR(100)    NOT NULL,
    dni          INT             NOT NULL,
    cargo        cargo_autoridad NOT NULL,
    email        VARCHAR(200)    NOT NULL,
    telefono     VARCHAR(20),
    id_distrito  INT             NOT NULL,  -- referencia lógica a sgpa_distritos.DISTRITO
    estado       BOOLEAN         NOT NULL DEFAULT TRUE,

    -- DNI único dentro del mismo distrito
    UNIQUE (dni, id_distrito)
);

CREATE INDEX idx_autoridad_distrito ON AUTORIDAD(id_distrito);
CREATE INDEX idx_autoridad_cargo    ON AUTORIDAD(cargo);
