-- Marca las cuentas nuevas que deben reemplazar la contraseña temporal al ingresar.
ALTER TABLE sgpa_usuarios.usuario
    ADD COLUMN IF NOT EXISTS debe_cambiar_password BOOLEAN NOT NULL DEFAULT FALSE;
