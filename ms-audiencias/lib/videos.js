const fs     = require('fs');
const path   = require('path');
const multer = require('multer');
const { ErrorHttp } = require('./errores');

// Grabaciones (MP4) de las audiencias. Los archivos van a disco en VIDEOS_DIR
// (volumen de Docker) y la columna AUDIENCIA.video guarda solo el nombre.
const VIDEOS_DIR = path.resolve(process.env.VIDEOS_DIR || path.join(__dirname, '..', 'videos'));
const MAX_MB     = parseInt(process.env.VIDEO_MAX_MB) || 2048;

fs.mkdirSync(VIDEOS_DIR, { recursive: true });

const esNombreMp4 = (nombre) => path.extname(nombre || '').toLowerCase() === '.mp4';

const subida = multer({
  storage: multer.diskStorage({
    destination: VIDEOS_DIR,
    // El timestamp cambia la URL al reemplazar el video (el navegador no reusa el viejo)
    filename: (req, file, cb) => cb(null, `audiencia-${req.params.id}-${Date.now()}.mp4`),
  }),
  limits: { fileSize: MAX_MB * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'video/mp4' && esNombreMp4(file.originalname)) return cb(null, true);
    cb(new ErrorHttp(400, 'VIDEO_INVALIDO', 'El archivo debe ser un video MP4'));
  },
}).single('video');

// Un MP4 tiene la caja "ftyp" en los bytes 4–7 (descarta archivos renombrados)
const tieneFirmaMp4 = async (ruta) => {
  const archivo = await fs.promises.open(ruta, 'r');
  try {
    const { buffer, bytesRead } = await archivo.read(Buffer.alloc(8), 0, 8, 0);
    return bytesRead === 8 && buffer.toString('latin1', 4, 8) === 'ftyp';
  } finally {
    await archivo.close();
  }
};

const rutaVideo = (nombre) => path.join(VIDEOS_DIR, path.basename(nombre));

const borrarVideo = (nombre) =>
  fs.promises.unlink(rutaVideo(nombre)).catch(err => {
    if (err.code !== 'ENOENT') console.error(`No se pudo borrar el video ${nombre}:`, err.message);
  });

// Recibe el multipart (campo "video") y devuelve el nombre del archivo guardado
const recibirVideo = (req, res) => new Promise((resolve, reject) => {
  subida(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return reject(err.code === 'LIMIT_FILE_SIZE'
        ? new ErrorHttp(413, 'VIDEO_DEMASIADO_GRANDE', `El video no puede superar ${MAX_MB} MB`)
        : new ErrorHttp(400, 'DATOS_INVALIDOS', 'Se espera un único archivo en el campo "video"'));
    }
    if (err) return reject(err);
    if (!req.file) return reject(new ErrorHttp(400, 'VIDEO_REQUERIDO', 'Adjuntá un archivo MP4'));

    try {
      if (!(await tieneFirmaMp4(req.file.path))) {
        await borrarVideo(req.file.filename);
        return reject(new ErrorHttp(400, 'VIDEO_INVALIDO', 'El archivo no es un video MP4 válido'));
      }
      resolve(req.file.filename);
    } catch (e) {
      reject(e);
    }
  });
});

module.exports = { recibirVideo, rutaVideo, borrarVideo };
