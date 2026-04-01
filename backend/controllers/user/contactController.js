const nodemailer = require("nodemailer");
const ContactUs = require("../../models/ContactUs");

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT || 465),
  secure: String(process.env.MAIL_SECURE).toLowerCase() === "true",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

const getNextSqlId = async () => {
  const lastRecord = await ContactUs.findOne().sort({ sql_id: -1 }).lean();
  return Number(lastRecord?.sql_id || 0) + 1;
};

exports.contactUs = async (req, res) => {
  try {
    const { mobile_number, email, address } = req.body;

    if (!mobile_number || !String(mobile_number).trim()) {
      return res.status(400).json({
        status: "false",
        message: "Mobile number is required.",
        data: "",
      });
    }

    if (!email || !String(email).trim()) {
      return res.status(400).json({
        status: "false",
        message: "Email is required.",
        data: "",
      });
    }

    if (!address || !String(address).trim()) {
      return res.status(400).json({
        status: "false",
        message: "Address is required.",
        data: "",
      });
    }

    const sql_id = await getNextSqlId();

    const contact = await ContactUs.create({
      sql_id,
      first_name: null,
      last_name: null,
      mobile_number: String(mobile_number).trim(),
      email: String(email).trim().toLowerCase(),
      address: String(address).trim(),
      message: null,
    });

    const mailTo = process.env.MAIL_FROM || process.env.MAIL_USER;

    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.MAIL_USER,
      to: mailTo,
      replyTo: String(email).trim().toLowerCase(),
      subject: `New Contact Us Request #${contact.sql_id}`,
      html: `
        <h2>New Contact Us Request</h2>
        <p><strong>ID:</strong> ${contact.sql_id}</p>
        <p><strong>Mobile Number:</strong> ${contact.mobile_number}</p>
        <p><strong>Email:</strong> ${contact.email}</p>
        <p><strong>Address:</strong> ${contact.address}</p>
        <p><strong>Created At:</strong> ${contact.created_at}</p>
      `,
    });

    return res.status(200).json({
      status: "true",
      message: "Success",
      data: "ok",
    });
  } catch (error) {
    console.error("Contact Us error:", error);
    return res.status(500).json({
      status: "false",
      message: "Something went wrong while submitting contact request.",
      data: "",
    });
  }
};