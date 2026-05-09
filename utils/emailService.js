const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail", // You can change this to your email provider
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmployeeWelcomeEmail = async (employeeData) => {
  const { name, email, username, password } = employeeData;

  const mailOptions = {
    from: `"Aurora Bank Admin" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Welcome to Aurora Bank - Your Employee Credentials",
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #4f46e5; margin: 0;">Aurora Bank</h1>
          <p style="color: #6b7280; font-size: 14px;">The future of digital banking</p>
        </div>
        
        <h2 style="color: #1f2937;">Welcome to the team, ${name}!</h2>
        <p style="color: #4b5563; line-height: 1.6;">
          Your employee account has been successfully created. You can now log into the Aurora Bank management portal using the credentials below:
        </p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #374151;"><strong>Login URL:</strong> <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" style="color: #4f46e5;">Aurora Bank Login</a></p>
          <hr style="border: 0; border-top: 1px solid #d1d5db; margin: 15px 0;">
          <p style="margin: 5px 0; color: #374151;"><strong>Username:</strong> <code style="background: #ffffff; padding: 2px 5px; border-radius: 4px;">${username}</code></p>
          <p style="margin: 5px 0; color: #374151;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 5px 0; color: #374151;"><strong>Password:</strong> <code style="background: #ffffff; padding: 2px 5px; border-radius: 4px;">${password}</code></p>
        </div>
        
        <p style="color: #ef4444; font-size: 13px; font-weight: 500;">
          Important: Please change your password immediately after your first login for security purposes.
        </p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #9ca3af; font-size: 12px;">
          <p>© 2026 Aurora Bank Management. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = {
  sendEmployeeWelcomeEmail,
};
