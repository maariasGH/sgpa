const nodemailer = require('nodemailer');

// Si no hay SMTP configurado (desarrollo) los correos solo se muestran en consola
const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   parseInt(process.env.SMTP_PORT) || 587,
      secure: parseInt(process.env.SMTP_PORT) === 465,
      auth:   process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    })
  : null;

const REMITENTE = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@sgpa.local';

const enviarCorreo = async ({ to, subject, text }) => {
  if (!transporter) {
    console.log(`📧 [email simulado] Para: ${to} | Asunto: ${subject}\n${text}`);
    return;
  }
  await transporter.sendMail({ from: REMITENTE, to, subject, text });
};

module.exports = { enviarCorreo };
