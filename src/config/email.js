const nodemailer = require('nodemailer');

// Create transporter once and reuse
const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST,
  port:   parseInt(process.env.EMAIL_PORT),
  secure: false, // true for port 465, false for 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ── Email templates ─────────────────────────────────────────

const templates = {

  applicationReceived: (applicantName, type) => ({
    subject: 'ASBA – Application Received',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#922b21;padding:24px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:24px;">ASB Academy</h1>
        </div>
        <div style="padding:32px;background:#fff;">
          <h2 style="color:#111;">Thank you, ${applicantName}!</h2>
          <p style="color:#555;line-height:1.7;">
            We have received your <strong>${type}</strong> application.
            Our team will review it and get back to you within <strong>3–5 business days</strong>.
          </p>
          <p style="color:#555;line-height:1.7;">
            If you have any questions, contact us at
            <a href="mailto:Support@asbacademy.co.uk" style="color:#c0392b;">Support@asbacademy.co.uk</a>
          </p>
        </div>
        <div style="background:#f9f9f9;padding:16px;text-align:center;color:#888;font-size:13px;">
          © 2024 ASB Academy · <a href="https://asba.org.uk" style="color:#c0392b;">asba.org.uk</a>
        </div>
      </div>
    `,
  }),

  applicationStatusUpdate: (applicantName, type, status, notes) => ({
    subject: `ASBA – Your Application Status: ${status.toUpperCase()}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#922b21;padding:24px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:24px;">ASB Academy</h1>
        </div>
        <div style="padding:32px;background:#fff;">
          <h2 style="color:#111;">Hello, ${applicantName}</h2>
          <p style="color:#555;line-height:1.7;">
            Your <strong>${type}</strong> application status has been updated to:
          </p>
          <div style="background:${status === 'approved' ? '#d4edda' : '#f8d7da'};
                      border-left:4px solid ${status === 'approved' ? '#28a745' : '#dc3545'};
                      padding:12px 16px;border-radius:4px;margin:16px 0;">
            <strong style="color:${status === 'approved' ? '#155724' : '#721c24'};">
              ${status.toUpperCase()}
            </strong>
          </div>
          ${notes ? `<p style="color:#555;line-height:1.7;"><strong>Notes:</strong> ${notes}</p>` : ''}
          <p style="color:#555;line-height:1.7;">
            Contact us at
            <a href="mailto:Support@asbacademy.co.uk" style="color:#c0392b;">Support@asbacademy.co.uk</a>
            if you have questions.
          </p>
        </div>
        <div style="background:#f9f9f9;padding:16px;text-align:center;color:#888;font-size:13px;">
          © 2024 ASB Academy · <a href="https://asba.org.uk" style="color:#c0392b;">asba.org.uk</a>
        </div>
      </div>
    `,
  }),

};

// ── Send function ────────────────────────────────────────────

const sendEmail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from:    process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });
    console.log(`📧 Email sent to ${to}`);
  } catch (error) {
    // Log but don't crash the app — email failure shouldn't fail the request
    console.error(`❌ Email error: ${error.message}`);
  }
};

module.exports = { sendEmail, templates };
