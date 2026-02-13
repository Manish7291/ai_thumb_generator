import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth:
    process.env.SMTP_USER && process.env.SMTP_PASS
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : undefined,
});

export async function sendEmailAsync(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  if (!process.env.SMTP_USER || !process.env.SMTP_HOST) {
    console.warn("[Email] SMTP not configured, skipping");
    return;
  }
  try {
    await transporter.sendMail({
      from: `"ThumbnailAI" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log("[Email] Sent to", to);
  } catch (err) {
    console.error("[Email] Send failed:", err);
  }
}

function emailWrapper(content: string): string {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin:0;padding:0;background-color:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
    <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
      <div style="background:linear-gradient(135deg,#1e293b,#0f172a);border:1px solid #334155;border-radius:12px;overflow:hidden;">
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:24px 32px;text-align:center;">
          <h1 style="margin:0;font-size:24px;color:#0f172a;font-weight:800;">
            Thumbnail<span style="color:#1e293b;">AI</span>
          </h1>
        </div>
        <!-- Content -->
        <div style="padding:32px;">
          ${content}
        </div>
        <!-- Footer -->
        <div style="padding:20px 32px;border-top:1px solid #334155;text-align:center;">
          <p style="margin:0;font-size:12px;color:#64748b;">
            &copy; ${new Date().getFullYear()} ThumbnailAI. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  </body>
  </html>`;
}

export function sendPremiumEmail(
  to: string,
  name: string,
  dashboardUrl: string
): void {
  const html = emailWrapper(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;background:#f59e0b;color:#0f172a;font-size:40px;width:64px;height:64px;line-height:64px;border-radius:50%;font-weight:bold;">★</div>
    </div>
    <h2 style="margin:0 0 16px;color:#f59e0b;font-size:22px;text-align:center;">
      Welcome to Premium! 🎉
    </h2>
    <p style="color:#e2e8f0;font-size:15px;line-height:1.6;">
      Hi <strong>${name}</strong>,
    </p>
    <p style="color:#cbd5e1;font-size:15px;line-height:1.6;">
      Your payment was successful and your account has been upgraded to <strong style="color:#f59e0b;">Premium</strong>! You now have access to:
    </p>
    <ul style="color:#cbd5e1;font-size:15px;line-height:2;padding-left:20px;">
      <li>✅ <strong>Unlimited</strong> thumbnail generations</li>
      <li>✅ Priority AI processing</li>
      <li>✅ Access to all premium features</li>
    </ul>
    <div style="text-align:center;margin-top:28px;">
      <a href="${dashboardUrl}" style="display:inline-block;background:#f59e0b;color:#0f172a;font-size:15px;font-weight:700;padding:12px 32px;border-radius:8px;text-decoration:none;">
        Go to Dashboard →
      </a>
    </div>
    <p style="color:#64748b;font-size:13px;margin-top:24px;text-align:center;">
      Thank you for supporting ThumbnailAI!
    </p>
  `);

  sendEmailAsync(to, "🎉 Premium Activated — Welcome to ThumbnailAI Premium!", html).catch(() => {});
}

export function sendThumbnailReadyEmail(
  to: string,
  name: string,
  prompt: string,
  imageUrl: string,
  dashboardUrl: string
): void {
  const html = emailWrapper(`
    <h2 style="margin:0 0 16px;color:#e2e8f0;font-size:22px;text-align:center;">
      Your Thumbnail is Ready! 🎨
    </h2>
    <p style="color:#e2e8f0;font-size:15px;line-height:1.6;">
      Hi <strong>${name}</strong>,
    </p>
    <p style="color:#cbd5e1;font-size:15px;line-height:1.6;">
      Your AI-generated thumbnail has been created successfully!
    </p>
    <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:16px;margin:20px 0;">
      <p style="margin:0 0 4px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Your Prompt</p>
      <p style="margin:0;color:#f1f5f9;font-size:15px;font-style:italic;">"${prompt}"</p>
    </div>
    <div style="text-align:center;margin:24px 0;">
      <img src="${imageUrl}" alt="Generated Thumbnail" style="max-width:100%;border-radius:8px;border:1px solid #334155;" />
    </div>
    <div style="text-align:center;margin-top:28px;">
      <a href="${dashboardUrl}" style="display:inline-block;background:#f59e0b;color:#0f172a;font-size:15px;font-weight:700;padding:12px 32px;border-radius:8px;text-decoration:none;">
        View in Dashboard →
      </a>
    </div>
    <p style="color:#64748b;font-size:13px;margin-top:24px;text-align:center;">
      You can download your thumbnail from the dashboard.
    </p>
  `);

  sendEmailAsync(to, "🎨 Your Thumbnail is Ready — ThumbnailAI", html).catch(() => {});
}
