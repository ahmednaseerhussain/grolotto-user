import nodemailer, { Transporter } from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_SECURE = (process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
const SMTP_FROM = process.env.SMTP_FROM || 'GroLotto <no-reply@grolotto.com>';

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendMail({ to, subject, html, text }: SendMailInput): Promise<boolean> {
  const t = getTransporter();
  if (!t) {
    console.warn(`[EMAIL] SMTP not configured — skipping mail to ${to} (subject: "${subject}")`);
    return false;
  }
  try {
    await t.sendMail({ from: SMTP_FROM, to, subject, html, text: text || stripHtml(html) });
    console.log(`[EMAIL] Sent "${subject}" to ${to}`);
    return true;
  } catch (err: any) {
    console.error(`[EMAIL] Failed to send to ${to}:`, err?.message || err);
    return false;
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function brandedTemplate(opts: { heading: string; intro: string; otp: string; footerNote: string }): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.06);">
        <tr><td style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:24px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:24px;letter-spacing:0.5px;">GroLotto</h1>
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <h2 style="margin:0 0 12px 0;font-size:20px;color:#111827;">${opts.heading}</h2>
          <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#4b5563;">${opts.intro}</p>
          <div style="text-align:center;margin:24px 0;">
            <div style="display:inline-block;background:#fef3c7;color:#92400e;padding:14px 28px;border-radius:10px;font-size:28px;font-weight:bold;letter-spacing:8px;font-family:'Courier New',monospace;">${opts.otp}</div>
          </div>
          <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">${opts.footerNote}</p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:16px;text-align:center;font-size:12px;color:#9ca3af;">
          &copy; ${new Date().getFullYear()} GroLotto. If you did not request this, you can safely ignore this email.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function sendPasswordResetEmail(email: string, otp: string): Promise<boolean> {
  const html = brandedTemplate({
    heading: 'Reset your password',
    intro: 'We received a request to reset your GroLotto password. Use the code below to continue. This code expires in 15 minutes.',
    otp,
    footerNote: 'For your security, never share this code with anyone. GroLotto staff will never ask you for it.',
  });
  return sendMail({ to: email, subject: 'GroLotto password reset code', html });
}

export async function sendSignupVerificationEmail(email: string, otp: string, displayName?: string): Promise<boolean> {
  const greeting = displayName ? `Welcome to GroLotto, ${displayName}!` : 'Welcome to GroLotto!';
  const html = brandedTemplate({
    heading: greeting,
    intro: 'To finish creating your account, please verify your email address by entering the code below. The code expires in 15 minutes.',
    otp,
    footerNote: 'If you did not create a GroLotto account, you can safely ignore this email.',
  });
  return sendMail({ to: email, subject: 'Verify your GroLotto email', html });
}
