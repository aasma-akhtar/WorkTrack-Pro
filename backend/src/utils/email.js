const nodemailer = require('nodemailer');
require('dotenv').config();

let transporter = null;

if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Sends notification emails (e.g. for leave approvals/requests, shift updates).
 * Logs to console when SMTP server credentials are not configured.
 */
const sendNotificationEmail = async (to, subject, htmlContent) => {
  if (transporter) {
    try {
      await transporter.sendMail({
        from: '"WorkTrack Pro" <noreply@worktrackpro.com>',
        to,
        subject,
        html: htmlContent,
      });
      console.log(`Email sent successfully to: ${to}`);
    } catch (error) {
      console.error(`Nodemailer error sending email to ${to}:`, error.message);
    }
  } else {
    console.log('\n==================================================');
    console.log('📬 [WORKTRACK PRO - EMAIL SERVICE NOTIFICATION]');
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log('--------------------------------------------------');
    // Strip basic HTML formatting for clean terminal printout
    const cleanText = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    console.log(`Message: ${cleanText}`);
    console.log('==================================================\n');
  }
};

module.exports = {
  sendNotificationEmail,
};
