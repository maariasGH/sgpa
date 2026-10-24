-- =============================================================
-- SGPA - Script 09: Grabación (video MP4) de la audiencia
-- Microservicio: ms-audiencias (puerto 3005)
-- El archivo se guarda en disco (volumen VIDEOS_DIR de ms-audiencias);
-- la columna solo guarda el nombre del archivo. NULL = sin grabación.
--
-- En una base ya inicializada se aplica a mano (es idempotente):
--   docker exec -i sgpa_db psql -U <usuario> -d <base> < bd/09_video_audiencias.sql
-- =============================================================

SET search_path TO sgpa_audiencias;

ALTER TABLE AUDIENCIA ADD COLUMN IF NOT EXISTS video VARCHAR(255);
