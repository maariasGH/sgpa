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

// El remitente debe ser la misma cuenta que se autentica en el SMTP: si no, el
// proveedor no puede firmar el mensaje (SPF/DKIM) y termina en spam
const REMITENTE = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@sgpa.local';
// A dónde van las respuestas del destinatario (opcional)
const RESPONDER_A = process.env.SMTP_REPLY_TO || undefined;

const escapar = (texto) => String(texto)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Versión HTML del mismo texto. Enviar texto + HTML (multipart/alternative) con un HTML
// simple, sin imágenes externas ni links, es lo que esperan los filtros de spam
const aHtml = (asunto, texto) => `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><title>${escapar(asunto)}</title></head>
<body style="margin:0;padding:24px;background:#F0F4F8;font-family:'Segoe UI',Arial,sans-serif;color:#1A202C">
  <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #CBD5E0;border-radius:8px;overflow:hidden">
    <div style="background:#1A3A5C;color:#FFFFFF;padding:16px 24px;font-size:15px;font-weight:700">
      SGPA · Poder Judicial de la Provincia de Santa Fe
    </div>
    <div style="padding:24px;font-size:14px;line-height:1.6;white-space:pre-wrap">${escapar(texto)}</div>
  </div>
</body>
</html>`;

const enviarCorreo = async ({ to, subject, text }) => {
  if (!transporter) {
    console.log(`📧 [email simulado] Para: ${to} | Asunto: ${subject}\n${text}`);
    return;
  }
  await transporter.sendMail({
    from:    REMITENTE,
    to,
    subject,
    text,
    html:    aHtml(subject, text),
    replyTo: RESPONDER_A,
    // Mensaje automático (RFC 3834): evita respuestas automáticas de "fuera de la oficina"
    headers: { 'Auto-Submitted': 'auto-generated', 'X-Auto-Response-Suppress': 'All' },
  });
};

module.exports = { enviarCorreo };
