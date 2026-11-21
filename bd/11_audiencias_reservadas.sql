-- Marca las causas existentes como reservadas antes de habilitar la vista pública.
ALTER TABLE sgpa_audiencias.audiencia
    ADD COLUMN IF NOT EXISTS reservada BOOLEAN NOT NULL DEFAULT TRUE;
