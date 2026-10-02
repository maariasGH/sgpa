-- =============================================================
-- SGPA - Script 08: Datos de prueba
-- Ejecutar manualmente si se quieren cargar datos de demo.
-- NO modifica estructura, solo inserta registros.
-- =============================================================

-- ── OPERADORES DE PRUEBA ──────────────────────────────────────
-- Contraseña de ambos: operador123

SET search_path TO sgpa_usuarios;

INSERT INTO USUARIO (username, password_hash, nombre, dni, email, id_rol, id_distrito)
VALUES
    (
        'operador_sf',
        '$2b$12$joJcKihukUcY1tS9dHTZvuJBt8JSGmmjgqg0sw0ArN9qzIjvyka1m',
        'Operador Santa Fe',
        12345678,
        'operador.sf@sgpa.pjsf.gob.ar',
        (SELECT id_rol FROM ROL WHERE nombre = 'OPERADOR'),
        1  -- Circunscripción I - Santa Fe
    ),
    (
        'operador_ros',
        '$2b$12$QVsutogUh9LoUIIroNPhwuuHx/vTrSmkBxtiZ.tD06INHrEegP6yq',
        'Operador Rosario',
        87654321,
        'operador.ros@sgpa.pjsf.gob.ar',
        (SELECT id_rol FROM ROL WHERE nombre = 'OPERADOR'),
        2  -- Circunscripción II - Rosario
    );

-- ── SALAS DE PRUEBA ───────────────────────────────────────────

SET search_path TO sgpa_salas;

INSERT INTO SALA (nombre, tipo, id_distrito)
VALUES
    ('Sala 1 - Santa Fe',    'PENAL',        1),
    ('Sala 2 - Santa Fe',    'CIVIL',         1),
    ('Sala 3 - Santa Fe',    'MULTIPROPOSITO', 1),
    ('Cámara Gesell - SF',   'GESELL',        1),
    ('Sala 1 - Rosario',     'PENAL',        2),
    ('Sala 2 - Rosario',     'MULTIPROPOSITO', 2),
    ('Sala 3 - Rosario',     'CIVIL', 2),
    ('Cámara Gesell - ROS',   'GESELL', 2);

-- ── AUTORIDADES DE PRUEBA ─────────────────────────────────────

SET search_path TO sgpa_autoridades;

INSERT INTO AUTORIDAD (nombre, apellido, dni, cargo, email, id_distrito, telefono)
VALUES
    -- Santa Fe
    ('Roberto',  'Méndez',    11111111, 'JUEZ',   'rmendez@pjsf.gob.ar',   1, '0342-155555555'),
    ('Laura',    'Giménez',   22222222, 'JUEZ',   'lgimenez@pjsf.gob.ar',  1, '0342-155555556'),
    ('Carlos',   'Fernández', 33333333, 'FISCAL',  'cfernandez@pjsf.gob.ar', 1, '0342-155555557'),
    ('Sofía',    'Torres',    44444444, 'FISCAL',  'storres@pjsf.gob.ar',    1, '0342-155555558'),
    -- Rosario
    ('Martín',   'Rodríguez', 55555555, 'JUEZ',   'mrodriguez@pjsf.gob.ar', 2, '0341-155555559'),
    ('Valeria',  'López',     66666666, 'JUEZ',   'vlopez@pjsf.gob.ar',     2, '0341-155555560'),
    ('Diego',    'Sánchez',   77777777, 'FISCAL',  'dsanchez@pjsf.gob.ar',   2, '0341-155555561'),
    ('Natalia',  'Pereyra',   88888888, 'FISCAL',  'npereyra@pjsf.gob.ar',   2, '0341-155555562');

-- ── AUDIENCIAS DE PRUEBA ──────────────────────────────────────

SET search_path TO sgpa_audiencias;

INSERT INTO AUDIENCIA (cuij, caratula, tipo_audiencia, id_sala, id_juez, id_fiscal, defensor, fecha, hora_inicio, hora_fin, id_estado, id_usuario_carga, motivo_cambio)
VALUES
    (
        '21-12345678-9',
        'MARTINEZ, Juan s/Homicidio simple',
        'Juicio Oral',
        1, 1, 3,
        'Dr. Pablo Acosta',
        CURRENT_DATE, '08:00', '10:00',
        (SELECT id_estado FROM ESTADO_AUDIENCIA WHERE nombre = 'EN_HORARIO'),
        1,
        NULL
    ),
    (
        '21-87654321-0',
        'GARCIA, Ana s/Robo calificado',
        'Audiencia Imputativa',
        1, 2, 4,
        NULL,
        CURRENT_DATE, '10:30', '11:30',
        (SELECT id_estado FROM ESTADO_AUDIENCIA WHERE nombre = 'EN_HORARIO'),
        1,
        NULL
    ),
    (
        '21-11111111-1',
        'RODRIGUEZ, Pedro s/Lesiones graves',
        'Audiencia de Juicio de Debate',
        5, 5, 7,
        'Dra. Maria Villalba',
        CURRENT_DATE, '09:00', '12:00',
        (SELECT id_estado FROM ESTADO_AUDIENCIA WHERE nombre = 'DEMORADA'),
        1,
        NULL
    ),
    (
        '21-22222222-2',
        'LOPEZ, Silvia s/Abuso sexual',
        'Nueva Audiencia Prision Preventiva',
        3, 1, 3,
        'Dr. Ricardo Sosa',
        CURRENT_DATE + 1, '08:30', '09:30',
        (SELECT id_estado FROM ESTADO_AUDIENCIA WHERE nombre = 'EN_HORARIO'),
        1,
        NULL
    ),
    (
        '21-33333333-3',
        'PEREZ, Luis s/Estafa',
        'Apelacion de Juicio',
        6, 6, 8,
        NULL,
        CURRENT_DATE - 1, '14:00', '15:00',
        (SELECT id_estado FROM ESTADO_AUDIENCIA WHERE nombre = 'REALIZADA'),
        1,
        NULL
    ),
    (
        '21-44444444-4',
        'GOMEZ, Ramon s/Tentativa de homicidio',
        'Juicio Oral',
        5, 5, 7,
        'Dr. Juan Herrera',
        CURRENT_DATE - 1, '10:00', '13:00',
        (SELECT id_estado FROM ESTADO_AUDIENCIA WHERE nombre = 'CANCELADA'),
        1,
        'Agresión del imputado hacia el fiscal durante la audiencia'
    );