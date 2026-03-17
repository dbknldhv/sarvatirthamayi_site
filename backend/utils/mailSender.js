const nodemailer = require("nodemailer");

/**
 * STM MERN Backend - Mail Utility
 * Handles automated email dispatch with PDF attachment support.
 */

// Create a reusable transporter object using Hostinger SMTP
const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: 465,
    secure: true, // Use SSL (Port 465)
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
    // Adding pool: true improves performance for multiple emails
    pool: true, 
    maxConnections: 5,
    maxMessages: 100
});

/**
 * @param {string} email - Recipient's email address
 * @param {string} title - Email subject line
 * @param {string} body  - HTML body content
 * @param {Array} attachments - Optional array: [{ filename: 'Ticket.pdf', path: '/absolute/path/to/file.pdf' }]
 */
const mailSender = async (email, title, body, attachments = []) => {
    try {
        // Verify connection configuration before sending
        await transporter.verify();

        const mailOptions = {
            from: `Sarvatirthamayi <${process.env.MAIL_USER}>`,
            to: `${email}`,
            subject: `${title}`,
            html: `${body}`,
            attachments: attachments, // Array of PDF objects from pdfGenerator
        };

        const info = await transporter.sendMail(mailOptions);

        console.log(`✅ Email sent successfully to ${email}. ID: ${info.messageId}`);
        return info;
        
    } catch (error) {
        console.error("❌ Mail Dispatch Error:", {
            recipient: email,
            message: error.message,
            code: error.code
        });
        
        // Return null instead of throwing to prevent crashing the booking/verify routes
        return null; 
    }
};

module.exports = mailSender;