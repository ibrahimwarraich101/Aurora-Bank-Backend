const nodemailer = require("nodemailer");

// Better configuration for Gmail using explicit host and port
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // Use SSL/TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // Remove pool for now to ensure every send starts a fresh connection, 
  // which is more reliable for low-volume applications.
});

// Verify connection on startup with more detailed logging
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email System Error:", error);
    console.log("Check if EMAIL_USER and EMAIL_PASS are correct in your .env file.");
  } else {
    console.log("✅ Email System Ready (Direct Connection)");
  }
});

/**
 * Generic helper to send mail with error logging
 */
const sendMailHelper = async (mailOptions, recipientEmail) => {
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${recipientEmail}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`❌ Error sending email to ${recipientEmail}:`, error.message);
    // Provide more specific hints for common Gmail errors
    if (error.message.includes('Invalid login')) {
      console.error("Hint: Check if your Google App Password is still valid.");
    }
    throw error; 
  }
};

const sendEmployeeWelcomeEmail = async (employeeData, baseUrl) => {
  const { name, email, username, password } = employeeData;
  const loginUrl = baseUrl || process.env.FRONTEND_URL || 'https://bank-aurora.vercel.app';

  const mailOptions = {
    from: `"Aurora Bank Admin" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Welcome to Aurora Bank - Your Employee Credentials",
    html: `
      <div style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #eef2f7;">
                <!-- Header Hero -->
                <tr>
                  <td align="center" style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 40px 20px;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">Aurora Bank</h1>
                    <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0; font-size: 14px; font-weight: 400;">Enterprise Management Portal</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 40px 30px 40px;">
                    <h2 style="color: #111827; margin: 0 0 20px 0; font-size: 24px; font-weight: 700;">Welcome to the Team!</h2>
                    <p style="color: #4b5563; margin: 0 0 25px 0; font-size: 16px; line-height: 1.6;">
                      Hello <strong>${name}</strong>, your employee account has been successfully provisioned. You can now access the Aurora Bank internal systems using the secure credentials provided below.
                    </p>
                    
                    <!-- Credentials Box -->
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding-bottom: 15px; border-bottom: 1px solid #edf2f7;">
                            <span style="display: block; color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">User Identity</span>
                            <span style="color: #1e293b; font-size: 15px; font-weight: 500;">${username}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 15px 0; border-bottom: 1px solid #edf2f7;">
                            <span style="display: block; color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Email Address</span>
                            <span style="color: #1e293b; font-size: 15px; font-weight: 500;">${email}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-top: 15px;">
                            <span style="display: block; color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Access Password</span>
                            <span style="color: #1e293b; font-size: 15px; font-family: monospace; background: #ffffff; padding: 2px 6px; border-radius: 4px; border: 1px solid #e2e8f0;">${password}</span>
                          </td>
                        </tr>
                      </table>
                    </div>
                    
                    <!-- CTA Button -->
                    <div style="text-align: center; margin-bottom: 30px;">
                      <a href="${loginUrl}/login" style="background-color: #4f46e5; color: #ffffff; padding: 16px 32px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block;">Access Dashboard</a>
                    </div>
                    
                    <div style="padding: 15px; background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px;">
                      <p style="color: #92400e; margin: 0; font-size: 13px; line-height: 1.5;">
                        <strong>Security Reminder:</strong> For your protection, please update your temporary password immediately upon your first login.
                      </p>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 0 40px 40px 40px; text-align: center;">
                    <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                      This is an automated message from Aurora Bank Enterprise Systems.<br>
                      © 2026 Aurora Bank Group. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `,
  };

  return sendMailHelper(mailOptions, email);
};

const sendProfileUpdateEmail = async (employeeData, updatedFields) => {
  const { name, email } = employeeData;
  
  const fieldsHtml = Object.entries(updatedFields)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => `
      <div style="padding: 10px 0; border-bottom: 1px solid #edf2f7;">
        <span style="color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; display: block; margin-bottom: 2px;">${key.replace('_', ' ')}</span>
        <span style="color: #1e293b; font-size: 15px;">${value}</span>
      </div>
    `).join('');

  const mailOptions = {
    from: `"Aurora Bank Admin" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Security Notification: Your Profile Has Been Updated",
    html: `
      <div style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #eef2f7;">
                <!-- Header -->
                <tr>
                  <td align="center" style="background: #1e293b; padding: 30px 20px;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Aurora Bank</h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #111827; margin: 0 0 15px 0; font-size: 20px; font-weight: 700;">Account Update Notification</h2>
                    <p style="color: #4b5563; margin: 0 0 25px 0; font-size: 15px; line-height: 1.6;">
                      Hello <strong>${name}</strong>, this is an automated notification to inform you that your employee profile information has been updated by an administrator.
                    </p>
                    
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                      <p style="margin: 0 0 15px 0; font-size: 13px; font-weight: 700; color: #4f46e5; text-transform: uppercase;">Updated Information:</p>
                      ${fieldsHtml}
                    </div>
                    
                    <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin-bottom: 25px;">
                      If you did not expect these changes or have concerns about your account security, please contact the IT Support department immediately.
                    </p>
                    
                    <div style="text-align: center;">
                      <a href="${process.env.FRONTEND_URL || 'https://bank-aurora.vercel.app'}/login" style="background-color: #1e293b; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">Login to Portal</a>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 0 40px 40px 40px; text-align: center;">
                    <p style="color: #94a3b8; font-size: 11px; margin: 0;">
                      © 2026 Aurora Bank Security Team. This is a mandatory security notification.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `,
  };

  return sendMailHelper(mailOptions, email);
};

// ── Status Change Email (Activated / Deactivated) ──────────────────────────
const sendStatusChangeEmail = async (employeeData, isActive) => {
  const { name, email } = employeeData;
  const status = isActive ? 'Activated' : 'Deactivated';
  const statusColor = isActive ? '#10b981' : '#ef4444';
  const statusBg = isActive ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)';
  const icon = isActive ? '✅' : '⛔';
  const portalUrl = process.env.FRONTEND_URL || 'https://bank-aurora.vercel.app';

  const mailOptions = {
    from: `"Aurora Bank Admin" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `${icon} Account ${status} — Aurora Bank`,
    html: `
      <div style="margin:0;padding:0;background:#f4f7fa;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr><td align="center" style="padding:40px 0;">
            <table border="0" cellpadding="0" cellspacing="0" width="600" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #eef2f7;">
              <tr><td align="center" style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 100%);padding:30px 20px;">
                <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:800;">Aurora Bank</h1>
                <p style="color:rgba(255,255,255,0.6);margin:4px 0 0;font-size:13px;">Enterprise Portal — Security Notification</p>
              </td></tr>
              <tr><td style="padding:40px;">
                <div style="background:${statusBg};border:1px solid ${statusColor};border-radius:12px;padding:20px;text-align:center;margin-bottom:28px;">
                  <p style="font-size:32px;margin:0 0 8px;">${icon}</p>
                  <p style="margin:0;font-size:18px;font-weight:700;color:${statusColor};">Account ${status}</p>
                </div>
                <p style="color:#4b5563;font-size:15px;line-height:1.6;">Hello <strong>${name}</strong>, your Aurora Bank employee account has been <strong style="color:${statusColor};">${status.toLowerCase()}</strong> by an administrator.</p>
                ${ isActive
                  ? `<p style="color:#4b5563;font-size:14px;">You can now log in and access the portal using your existing credentials.</p>
                     <div style="text-align:center;margin-top:24px;"><a href="${portalUrl}/login" style="background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">Login to Portal →</a></div>`
                  : `<p style="color:#4b5563;font-size:14px;">Your access to the Aurora Bank portal has been temporarily suspended. Please contact your administrator if you believe this is a mistake.</p>`
                }
              </td></tr>
              <tr><td style="padding:0 40px 30px;text-align:center;"><p style="color:#94a3b8;font-size:11px;margin:0;">© 2026 Aurora Bank Security Team. This is a mandatory security notification.</p></td></tr>
            </table>
          </td></tr>
        </table>
      </div>
    `,
  };
  return sendMailHelper(mailOptions, email);
};

// ── Account Deleted Email ──────────────────────────────────────────────────
const sendAccountDeletedEmail = async (employeeData) => {
  const { name, email } = employeeData;

  const mailOptions = {
    from: `"Aurora Bank Admin" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `🗑️ Account Removed — Aurora Bank`,
    html: `
      <div style="margin:0;padding:0;background:#f4f7fa;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr><td align="center" style="padding:40px 0;">
            <table border="0" cellpadding="0" cellspacing="0" width="600" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #eef2f7;">
              <tr><td align="center" style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 100%);padding:30px 20px;">
                <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:800;">Aurora Bank</h1>
                <p style="color:rgba(255,255,255,0.6);margin:4px 0 0;font-size:13px;">Enterprise Portal — Security Notification</p>
              </td></tr>
              <tr><td style="padding:40px;">
                <div style="background:rgba(239,68,68,0.08);border:1px solid #ef4444;border-radius:12px;padding:20px;text-align:center;margin-bottom:28px;">
                  <p style="font-size:32px;margin:0 0 8px;">🗑️</p>
                  <p style="margin:0;font-size:18px;font-weight:700;color:#ef4444;">Account Permanently Removed</p>
                </div>
                <p style="color:#4b5563;font-size:15px;line-height:1.6;">Hello <strong>${name}</strong>, your Aurora Bank employee account has been <strong style="color:#ef4444;">permanently deleted</strong> from the system by an administrator.</p>
                <p style="color:#4b5563;font-size:14px;line-height:1.6;">All your associated data has been removed. If you believe this was done in error, please contact your HR department or administrator directly.</p>
                <div style="padding:16px;background:#fffbeb;border-left:4px solid #f59e0b;border-radius:4px;margin-top:24px;">
                  <p style="color:#92400e;margin:0;font-size:13px;"><strong>Note:</strong> This action is irreversible. Your login credentials are no longer valid.</p>
                </div>
              </td></tr>
              <tr><td style="padding:0 40px 30px;text-align:center;"><p style="color:#94a3b8;font-size:11px;margin:0;">© 2026 Aurora Bank Security Team. This is a mandatory security notification.</p></td></tr>
            </table>
          </td></tr>
        </table>
      </div>
    `,
  };
  return sendMailHelper(mailOptions, email);
};

// ── Forgot Password Email ──────────────────────────────────────────────────
const sendForgotPasswordEmail = async (email, resetLink) => {
  const mailOptions = {
    from: `"Aurora Bank Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Reset Your Aurora Bank Password",
    html: `
      <div style="margin:0;padding:0;background:#f4f7fa;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr><td align="center" style="padding:40px 0;">
            <table border="0" cellpadding="0" cellspacing="0" width="600" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #eef2f7;">
              <tr><td align="center" style="background:#1e293b;padding:30px 20px;">
                <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:800;">Aurora Bank</h1>
              </td></tr>
              <tr><td style="padding:40px;">
                <h2 style="color:#111827;margin:0 0 20px 0;font-size:20px;font-weight:700;">Password Reset Request</h2>
                <p style="color:#4b5563;font-size:15px;line-height:1.6;">Hello, we received a request to reset the password for your Aurora Bank account.</p>
                <p style="color:#4b5563;font-size:15px;line-height:1.6;">Click the button below to set a new password. This link will expire in 1 hour.</p>
                <div style="text-align:center;margin:30px 0;">
                  <a href="${resetLink}" style="background:#4f46e5;color:#ffffff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block;">Reset Password</a>
                </div>
                <p style="color:#6b7280;font-size:13px;">If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
              </td></tr>
              <tr><td style="padding:0 40px 30px;text-align:center;"><p style="color:#94a3b8;font-size:11px;margin:0;">© 2026 Aurora Bank Support Team.</p></td></tr>
            </table>
          </td></tr>
        </table>
      </div>
    `,
  };
  return sendMailHelper(mailOptions, email);
};

module.exports = {
  sendEmployeeWelcomeEmail,
  sendProfileUpdateEmail,
  sendStatusChangeEmail,
  sendAccountDeletedEmail,
  sendForgotPasswordEmail,
};
