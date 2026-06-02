// ============================================================
// CLARA — Email Service (Nodemailer)
// Envío de correos transaccionales: verificación y reset
// ============================================================

import nodemailer, { Transporter } from 'nodemailer';
import { logger } from '../utils/logger';

// ── Tipos ─────────────────────────────────────────────────────
interface SendVerificationEmailDto {
  to:    string;
  nombre: string;
  token:  string;
}

interface SendResetPasswordEmailDto {
  to:     string;
  nombre: string;
  token:  string;
}

interface EmailResult {
  success:   boolean;
  messageId?: string;
  error?:    string;
}

// ── Configuración del transporter ────────────────────────────
function createTransporter(): Transporter {
  const env = process.env.NODE_ENV;

  // En desarrollo/test → Ethereal (servidor SMTP falso, gratis)
  // En producción   → SMTP real desde variables de entorno
  if (env === 'production') {
    return nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Ethereal para development y test
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: process.env.ETHEREAL_USER ?? '',
      pass: process.env.ETHEREAL_PASS ?? '',
    },
  });
}

// ── Templates HTML ───────────────────────────────────────────
function verificationTemplate(nombre: string, url: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verifica tu cuenta CLARA</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
    .header { background: #1a1a2e; color: #fff; padding: 32px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; letter-spacing: 2px; }
    .header p { margin: 4px 0 0; color: #c8a882; font-size: 13px; }
    .body { padding: 32px; color: #333; line-height: 1.6; }
    .body h2 { color: #1a1a2e; margin-top: 0; }
    .btn { display: inline-block; margin: 24px 0; padding: 14px 32px; background: #c8a882; color: #1a1a2e; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; }
    .footer { background: #f4f4f4; padding: 16px 32px; font-size: 12px; color: #888; text-align: center; }
    .url-fallback { word-break: break-all; color: #888; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Cl<span style="color:#c8a882">a</span>ra</h1>
      <p>Asistente de diagnóstico neurológico</p>
    </div>
    <div class="body">
      <h2>Hola, ${nombre} 👋</h2>
      <p>Gracias por registrarte en <strong>CLARA</strong>. Para activar tu cuenta y comenzar a utilizar el sistema de análisis de imágenes MRI, confirma tu dirección de correo electrónico.</p>
      <p style="text-align:center">
        <a href="${url}" class="btn">Verificar mi cuenta</a>
      </p>
      <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
      <p class="url-fallback">${url}</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
      <p style="font-size:13px;color:#888">Este enlace expira en <strong>24 horas</strong>. Si no creaste esta cuenta, puedes ignorar este correo.</p>
    </div>
    <div class="footer">© ${new Date().getFullYear()} CLARA — Universidad Santiago de Cali</div>
  </div>
</body>
</html>`;
}

function resetPasswordTemplate(nombre: string, url: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restablecer contraseña CLARA</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
    .header { background: #1a1a2e; color: #fff; padding: 32px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; letter-spacing: 2px; }
    .header p { margin: 4px 0 0; color: #c8a882; font-size: 13px; }
    .body { padding: 32px; color: #333; line-height: 1.6; }
    .body h2 { color: #1a1a2e; margin-top: 0; }
    .btn { display: inline-block; margin: 24px 0; padding: 14px 32px; background: #c8a882; color: #1a1a2e; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; }
    .footer { background: #f4f4f4; padding: 16px 32px; font-size: 12px; color: #888; text-align: center; }
    .url-fallback { word-break: break-all; color: #888; font-size: 12px; }
    .warning { background: #fff3cd; border-left: 4px solid #c8a882; padding: 12px 16px; border-radius: 4px; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Cl<span style="color:#c8a882">a</span>ra</h1>
      <p>Asistente de diagnóstico neurológico</p>
    </div>
    <div class="body">
      <h2>Hola, ${nombre}</h2>
      <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>CLARA</strong>.</p>
      <div class="warning">
        ⚠️ Si no solicitaste este cambio, ignora este correo. Tu contraseña no será modificada.
      </div>
      <p style="text-align:center;margin-top:24px">
        <a href="${url}" class="btn">Restablecer contraseña</a>
      </p>
      <p>Si el botón no funciona, copia y pega este enlace:</p>
      <p class="url-fallback">${url}</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
      <p style="font-size:13px;color:#888">Este enlace expira en <strong>1 hora</strong>.</p>
    </div>
    <div class="footer">© ${new Date().getFullYear()} CLARA — Universidad Santiago de Cali</div>
  </div>
</body>
</html>`;
}

// ── Email Service ────────────────────────────────────────────
export const EmailService = {

  async sendVerificationEmail(dto: SendVerificationEmailDto): Promise<EmailResult> {
    const baseUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const url     = `${baseUrl}/verify-email.html?token=${dto.token}`;

    try {
      const transporter = createTransporter();
      const info = await transporter.sendMail({
        from:    `"CLARA - Diagnóstico Neurológico" <${process.env.SMTP_FROM ?? 'noreply@clara.usc.edu.co'}>`,
        to:      dto.to,
        subject: '✅ Verifica tu cuenta en CLARA',
        html:    verificationTemplate(dto.nombre, url),
      });

      logger.info(`Email de verificación enviado a ${dto.to} — messageId: ${info.messageId}`);

      // En Ethereal, loguea la URL de preview
      if (process.env.NODE_ENV !== 'production') {
        logger.info(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      }

      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error(`Error enviando email de verificación a ${dto.to}: ${error}`);
      return { success: false, error: String(error) };
    }
  },

  async sendResetPasswordEmail(dto: SendResetPasswordEmailDto): Promise<EmailResult> {
    const baseUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const url     = `${baseUrl}/reset-password.html?token=${dto.token}`;

    try {
      const transporter = createTransporter();
      const info = await transporter.sendMail({
        from:    `"CLARA - Diagnóstico Neurológico" <${process.env.SMTP_FROM ?? 'noreply@clara.usc.edu.co'}>`,
        to:      dto.to,
        subject: '🔒 Restablece tu contraseña en CLARA',
        html:    resetPasswordTemplate(dto.nombre, url),
      });

      logger.info(`Email de reset enviado a ${dto.to} — messageId: ${info.messageId}`);

      if (process.env.NODE_ENV !== 'production') {
        logger.info(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      }

      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error(`Error enviando email de reset a ${dto.to}: ${error}`);
      return { success: false, error: String(error) };
    }
  },

  // Crea una cuenta Ethereal automáticamente (útil para el primer arranque en dev)
  async createEtherealAccount(): Promise<{ user: string; pass: string }> {
    const account = await nodemailer.createTestAccount();
    logger.info(`Cuenta Ethereal creada — user: ${account.user} | pass: ${account.pass}`);
    logger.info('Agrega estas credenciales a tu .env como ETHEREAL_USER y ETHEREAL_PASS');
    return { user: account.user, pass: account.pass };
  },
};