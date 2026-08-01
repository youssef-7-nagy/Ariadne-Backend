const { Resend } = require('resend');
const dotenv = require('dotenv');

dotenv.config();

// ─── Resend client (HTTPS-based — never blocked by ISPs) ─────────────────────
const resend = new Resend(process.env.RESEND_API_KEY);

// Helper to resolve an absolute logo URL that email clients can access
const getLogoUrl = () => {
  if (process.env.CLIENT_URL) {
    const urls = process.env.CLIENT_URL.split(',').map(u => u.trim());
    // Prioritize production HTTPS URL so email clients render it correctly
    const prodUrl = urls.find(u => u.startsWith('https://'));
    if (prodUrl) return `${prodUrl}/mylogo.png`;
    return `${urls[0]}/mylogo.png`;
  }
  return 'https://ariadneg.com/mylogo.png';
};

// Fake transporter with a verify() so index.js startup check still works
const transporter = {
  verify: (cb) => {
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'YOUR_RESEND_API_KEY_HERE') {
      cb(new Error('RESEND_API_KEY is not set in your .env file.'));
    } else {
      cb(null, true);
    }
  },
};

/**
 * Sends a beautifully styled password reset email via Resend (HTTPS).
 * @param {string} toEmail - Recipient email address
 * @param {string} resetUrl  - The full reset link including token
 */
const sendPasswordResetEmail = async (toEmail, resetUrl) => {
  const logoUrl = getLogoUrl();

  const { data, error } = await resend.emails.send({
    from: 'Ariadne <onboarding@resend.dev>',
    to: toEmail,
    subject: 'Reset Your Password — Ariadne',
    html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Reset Password</title>
      <style type="text/css">
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        body {
          margin: 0;
          padding: 0;
          background-color: #f8fafc;
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        table {
          border-collapse: collapse;
        }
        a {
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 48px 0; width: 100%;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 30px rgba(0, 0, 0, 0.03);">
              
              <!-- Premium Dark Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #0f172a 0%, #020617 100%); padding: 48px 40px; text-align: center; border-bottom: 1px solid #1e293b;">
                  <img src="${logoUrl}" alt="Ariadne Logo" style="height: 48px; width: auto; display: block; margin: 0 auto 16px auto;" />
                  <p style="margin: 0; color: #94a3b8; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">Visual Storytelling</p>
                </td>
              </tr>

              <!-- Email Content Body -->
              <tr>
                <td style="padding: 48px 40px 32px 40px;">
                  <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.25;">Password Reset Request</h2>
                  <p style="margin: 0 0 28px 0; color: #475569; font-size: 15px; line-height: 1.6; font-weight: 400;">
                    We received a request to reset the password for your Ariadne account. Click the button below to choose a new password. This link is valid for <strong>1 hour</strong>.
                  </p>

                  <!-- Reset Button Section -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                    <tr>
                      <td align="center">
                        <a href="${resetUrl}"
                          style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 16px 40px; border-radius: 8px; font-size: 15px; font-weight: 700; letter-spacing: 0.3px; border: 1px solid #1e293b; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15); transition: background-color 0.2s;">
                          Reset My Password
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- Divider -->
                  <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 0 0 28px 0;" />

                  <!-- Help & Verification Link Fallback -->
                  <p style="margin: 0 0 8px 0; color: #64748b; font-size: 13px; line-height: 1.5;">
                    If the button doesn't work, copy and paste this link into your browser:
                  </p>
                  <p style="margin: 0 0 28px 0; word-break: break-all;">
                    <a href="${resetUrl}" style="color: #6366f1; font-size: 13px; text-decoration: underline; font-weight: 500;">${resetUrl}</a>
                  </p>

                  <!-- Safety Notice Box -->
                  <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 8px; padding: 18px 20px;">
                    <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.5;">
                      🔒 <strong>Security Note:</strong> If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Footer Section -->
              <tr>
                <td style="background-color: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #f1f5f9;">
                  <p style="margin: 0; color: #94a3b8; font-size: 12px; font-weight: 500;">
                    © ${new Date().getFullYear()} Ariadne · Visual Storytelling
                  </p>
                  <p style="margin: 4px 0 0 0; color: #cbd5e1; font-size: 11px;">
                    Zamalek, Cairo, Egypt
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>`,
  });

  if (error) {
    throw new Error(`Resend API error: ${error.message}`);
  }

  return data;
};

module.exports = { transporter, sendPasswordResetEmail };
