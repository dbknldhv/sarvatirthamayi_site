const nodemailer = require("nodemailer");

/**
 * Updated to support Attachments for PDF Tickets
 * @param {string} email - Recipient
 * @param {string} title - Subject line
 * @param {string} body - HTML body content
 * @param {Array} attachments - Optional: [{ filename: '...', path: '...' }]
 */
const mailSender = async (email, title, body, attachments = []) => {
  try {
    let transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: 465,
      secure: true, 
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    let info = await transporter.sendMail({
      from: `Sarvatirthamayi <${process.env.MAIL_USER}>`,
      to: `${email}`,
      subject: `${title}`,
      html: `${body}`,
      attachments: attachments, // Added to send the PDF ticket
    });

    console.log("Email sent successfully: ", info.messageId);
    return info;
  } catch (error) {
    console.error("Mail Error:", error.message);
    // In production, we don't want the app to crash if mail fails
    return null; 
  }
};

module.exports = mailSender;