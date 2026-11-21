# SGPA — Frontend

Interfaz web del Sistema de Gestión y Publicación de Audiencias (Poder Judicial de Santa Fe).
React 19 + Vite + React Router. Habla solo con el API Gateway.

## Comandos

```bash
npm run dev      # servidor de desarrollo (http://localhost:5173)
npm test         # tests (Jest + Testing Library)
npm run lint     # ESLint
npm run build    # build de producción en dist/
```

Con Docker no hace falta nada de esto: `docker compose up` desde la raíz levanta el frontend junto al resto.

## Pantallas y rutas

| Ruta | Pantalla | Acceso |
|------|----------|--------|
| `/` | Calendario público. Fecha y filtros van en la URL (`/?fecha=2026-09-25&id_distrito=1`) | Público |
| `/login` | Acceso interno | Público |
| `/panel/audiencias` | Gestión de audiencias | Operador, Admin |
| `/panel/autoridades` | Gestión de autoridades | Operador, Admin |
| `/panel/estadisticas` | Estadísticas y exportación a Excel | Operador, Admin |
| `/panel/operadores` | Usuarios operadores | Admin |
| `/panel/auditoria` | Log de auditoría | Admin |
| `/panel/tv` | Vista TV (pantalla completa) | Operador, Admin |

El JWT vive solo en memoria: **recargar la página cierra la sesión**. Al volver a iniciar sesión se vuelve a la ruta en la que se estaba.

## Publicación y acceso a grabaciones

Las audiencias nuevas y existentes quedan reservadas por defecto. Un operador puede publicar o reservar audiencias de su distrito; el Administrador puede hacerlo en cualquier distrito. Las causas reservadas y las audiencias en salas GESELL muestran una carátula genérica en la vista pública. Los campos internos, como el motivo del cambio y el usuario que cargó la audiencia, no se exponen.

Las grabaciones ya no son públicas. Un usuario autenticado y autorizado obtiene una URL firmada que vence a los 15 minutos; el reproductor renueva el enlace mientras está abierto. Para bases existentes, aplicar `bd/11_audiencias_reservadas.sql` antes de iniciar la nueva versión para marcar las causas existentes como reservadas.

## Configuración

- `VITE_API_URL`: URL opcional del gateway cuando se quiere omitir el proxy local. Normalmente se deja vacía: el navegador usa el mismo origen y Vite reenvía `/api` al gateway.
- En Docker, Vite conecta con el gateway por la red interna. Desde el celular alcanza con abrir `http://<IP-de-la-PC>:5173`; no hace falta habilitar el puerto del gateway ni agregar el origen a `CORS_ORIGIN`.
- Fuera de Docker, el proxy apunta por defecto a `http://localhost:3010`; para otro destino se puede definir `GATEWAY_PROXY_TARGET` al iniciar Vite.

## Organización

- `src/api/` — `client.js` (fetch, token, errores) y `sgpa.js` (un método por endpoint).
- `src/components/ui.jsx` — componentes base (inputs con label asociado, `Modal` accesible, paginador…).
- `src/hooks/` — `useCarga` (carga con cancelación de respuestas viejas), `useEsMovil`, `useDialogo`, `useDebounce`.
- `src/validaciones.js` — validaciones de formularios (el backend vuelve a validar todo).
- Estilos: inline con los tokens de `theme.js`; media queries y estados `:hover`/`:focus-visible` en `index.css`.

## Producción

`npm run build` genera archivos estáticos en `dist/`. El servidor web que los sirva tiene que devolver `index.html` para cualquier ruta (fallback de SPA). Si no, recargar en `/panel/...` da 404.
