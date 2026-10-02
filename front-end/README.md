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

## Configuración

- `VITE_API_URL`: URL del gateway. Si está vacía se usa el mismo host que abrió la página en el puerto 3000, así funciona tanto en la PC como desde un teléfono en la red local.
- Para abrirlo desde un teléfono, agregar `http://<IP-de-la-PC>:5173` a `CORS_ORIGIN` en el `.env` de la raíz.

## Organización

- `src/api/` — `client.js` (fetch, token, errores) y `sgpa.js` (un método por endpoint).
- `src/components/ui.jsx` — componentes base (inputs con label asociado, `Modal` accesible, paginador…).
- `src/hooks/` — `useCarga` (carga con cancelación de respuestas viejas), `useEsMovil`, `useDialogo`, `useDebounce`.
- `src/validaciones.js` — validaciones de formularios (el backend vuelve a validar todo).
- Estilos: inline con los tokens de `theme.js`; media queries y estados `:hover`/`:focus-visible` en `index.css`.

## Producción

`npm run build` genera archivos estáticos en `dist/`. El servidor web que los sirva tiene que devolver `index.html` para cualquier ruta (fallback de SPA). Si no, recargar en `/panel/...` da 404.
