-- =============================================================
-- SGPA - Script 05: Schema sgpa_usuarios
-- Microservicio: ms-usuarios (puerto 3004)
-- Contiene: ROL (entidad abstracta) y USUARIO
-- =============================================================

SET search_path TO sgpa_usuarios;

-- ── Entidad abstracta: ROL ────────────────────────────────────
CREATE TABLE IF NOT EXISTS ROL (
    id_rol  SERIAL       PRIMARY KEY,
    nombre  VARCHAR(30)  NOT NULL UNIQUE
);

-- Seed: roles del sistema
INSERT INTO ROL (nombre) VALUES
    ('ADMINISTRADOR'),
    ('OPERADOR');

-- ── Entidad: USUARIO ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS USUARIO (
    id_usuario    SERIAL        PRIMARY KEY,
    username      VARCHAR(100)  NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,
    nombre        VARCHAR(200)  NOT NULL,
    dni           INT           NOT NULL UNIQUE,
    email         VARCHAR(200)  NOT NULL UNIQUE,
    id_rol        INT           NOT NULL REFERENCES ROL(id_rol),
    id_distrito   INT,                          -- NULL si es Administrador
    estado        BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usuario_rol      ON USUARIO(id_rol);
CREATE INDEX idx_usuario_distrito ON USUARIO(id_distrito);

-- Seed: usuario administrador inicial
-- Contraseña por defecto: "admin1234" (bcrypt, 12 rondas)
-- IMPORTANTE: cambiar en el primer login
INSERT INTO USUARIO (username, password_hash, nombre, dni, email, id_rol, id_distrito)
VALUES (
    'admin',
    '$2b$12$NplcKStVhgOLlLFB6F1Q/Owpk42gn3B8j1USOq6risC62ZMoV4twW',
    'Administrador del Sistema',
    99999999,
    'admin@sgpa.pjsf.gob.ar',
    (SELECT id_rol FROM ROL WHERE nombre = 'ADMINISTRADOR'),
    NULL
);
