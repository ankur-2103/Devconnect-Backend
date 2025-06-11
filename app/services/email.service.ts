import nodemailer from "nodemailer";
import dotenv from 'dotenv';

dotenv.config();

// Create a transporter using environment variables
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Verify transporter configuration
transporter.verify(function (error, success) {
  if (error) {
    console.error("Email service configuration error:", error);
  } else {
    console.log("Email service is ready to send messages");
  }
});

export const sendPasswordResetEmail = async (
  email: string,
  resetToken: string
): Promise<void> => {
  const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: `"DevConnect" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Password Reset Request - DevConnect",
    html: `
      <h1>Password Reset Request</h1>
      <p>You requested a password reset for your DevConnect account.</p>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw new Error("Failed to send password reset email");
  }
};
