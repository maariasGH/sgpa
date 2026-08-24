-- =============================================================
-- SGPA - Script 03: Schema sgpa_salas
-- Microservicio: ms-salas (puerto 3002)
-- NOTA: id_distrito referencia al valor lógico de sgpa_distritos.DISTRITO
--       pero no se declara FK entre schemas. La validación la hace el
--       microservicio vía HTTP al ms-distritos antes de insertar.
-- =============================================================

SET search_path TO sgpa_salas;

CREATE TYPE tipo_sala AS ENUM ('PENAL', 'CIVIL', 'GESELL', 'MULTIPROPOSITO');

CREATE TABLE IF NOT EXISTS SALA (
    id_sala     SERIAL      PRIMARY KEY,
    nombre      VARCHAR(100) NOT NULL,
    tipo        tipo_sala    NOT NULL,
    id_distrito INT          NOT NULL,  -- referencia lógica a sgpa_distritos.DISTRITO
    activa      BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_sala_distrito ON SALA(id_distrito);
