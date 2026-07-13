const Admin = require("../../models/admin.model");
const AdminOtp = require("../../models/admin.otp.model");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const getOtpEmailTemplate = (otp, title, description) => {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f6f9fc;
      margin: 0;
      padding: 0;
    }
    .wrapper {
      width: 100%;
      background-color: #f6f9fc;
      padding: 40px 0;
    }
    .container {
      max-width: 540px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      border: 1px solid #e6ebf1;
    }
    .header {
      background-color: #1a1a2e;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .content {
      padding: 40px 30px;
      color: #32325d;
      line-height: 1.6;
    }
    .content h2 {
      font-size: 20px;
      font-weight: 600;
      margin-top: 0;
      margin-bottom: 20px;
      color: #1a1a2e;
    }
    .content p {
      font-size: 16px;
      margin-bottom: 24px;
    }
    .otp-container {
      background-color: #f4f6f8;
      border-radius: 6px;
      padding: 20px;
      text-align: center;
      margin-bottom: 24px;
      border: 1px dashed #ccd6e0;
    }
    .otp-code {
      font-family: "Courier New", Courier, monospace;
      font-size: 32px;
      font-weight: 700;
      letter-spacing: 6px;
      color: #e50914;
      margin: 0;
    }
    .warning {
      font-size: 14px;
      color: #8898aa;
      border-top: 1px solid #e6ebf1;
      padding-top: 20px;
      margin-top: 30px;
    }
    .footer {
      background-color: #fcfdfd;
      padding: 20px 30px;
      text-align: center;
      font-size: 12px;
      color: #8898aa;
      border-top: 1px solid #f0f2f5;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>CatchWatch</h1>
      </div>
      <div class="content">
        <h2>${title}</h2>
        <p>Hello,</p>
        <p>${description}</p>
        <div class="otp-container">
          <div class="otp-code">${otp}</div>
        </div>
        <p>If you did not request this verification, please ignore this email or contact support if you have concerns.</p>
        <div class="warning">
          <strong>Security Note:</strong> Never share this OTP with anyone. CatchWatch Support will never ask for your password or OTP.
        </div>
      </div>
      <div class="footer">
        &copy; 2026 CatchWatch. All rights reserved.
      </div>
    </div>
  </div>
</body>
</html>`;
};


/* SEND PASSWORD OTP */
exports.sendPasswordOtp = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    const admin = await Admin.findById(req.user.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Old password and new password are required"
      });
    }

    const isMatch = await bcrypt.compare(
      oldPassword,
      admin.password
    );

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Old password is incorrect"
      });
    }

    const otp = generateOtp();

    await AdminOtp.deleteMany({
      email: admin.email
    });

    await AdminOtp.create({
      email: admin.email,
      otp,
      purpose: "change-password",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    });

    await transporter.sendMail({
      from: `"CatchWatch Support" <${process.env.EMAIL_USER}>`,
      to: admin.email,
      subject: "Password Change OTP",
      text: `Your CatchWatch Admin Password Change OTP is ${otp}. This code is valid for 5 minutes. If you did not request this, please ignore this email.`,
      html: getOtpEmailTemplate(
        otp,
        "Password Change OTP",
        "We received a request to change the password for your CatchWatch Admin account. Use the verification code below to proceed. This code is valid for 5 minutes."
      )
    });

    res.json({
      success: true,
      message: "OTP sent to your email"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* CHANGE PASSWORD */
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, otp, newPassword } = req.body;

    const admin = await Admin.findById(req.user.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }

    if (!oldPassword || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Old password, OTP, and new password are required"
      });
    }

    const isMatch = await bcrypt.compare(
      oldPassword,
      admin.password
    );

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Old password is incorrect"
      });
    }

    const record = await AdminOtp.findOne({
      email: admin.email,
      otp,
      purpose: "change-password",
      expiresAt: { $gt: new Date() }
    });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP"
      });
    }

    admin.password = await bcrypt.hash(newPassword, 10);
    await admin.save();

    await AdminOtp.findByIdAndDelete(record._id);

    res.json({
      success: true,
      message: "Password changed successfully"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* SEND EMAIL OTP */
exports.sendEmailOtp = async (req, res) => {
  try {
    const { oldEmail, newEmail } = req.body;

    const admin = await Admin.findById(req.user.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }

    if (admin.email !== oldEmail.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: "Old email does not match"
      });
    }

    const exists = await Admin.findOne({
      email: newEmail.toLowerCase()
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "New email already in use"
      });
    }

    const otp = generateOtp();

    await AdminOtp.deleteMany({
      email: oldEmail.toLowerCase()
    });

    await AdminOtp.create({
      email: oldEmail.toLowerCase(),
      newEmail: newEmail.toLowerCase(),
      otp,
      purpose: "change-email",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    });

    await transporter.sendMail({
      from: `"CatchWatch Support" <${process.env.EMAIL_USER}>`,
      to: oldEmail.toLowerCase(),
      subject: "Email Change OTP",
      text: `Your CatchWatch Admin Email Change OTP is ${otp}. This code is valid for 5 minutes. If you did not request this, please ignore this email.`,
      html: getOtpEmailTemplate(
        otp,
        "Email Change OTP",
        `We received a request to change the email address for your CatchWatch Admin account to ${newEmail.toLowerCase()}. Use the verification code below to proceed. This code is valid for 5 minutes.`
      )
    });

    res.json({
      success: true,
      message: "OTP sent to old email"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* CHANGE EMAIL */
exports.changeEmail = async (req, res) => {
  try {
    const { oldEmail, newEmail, otp } = req.body;

    const record = await AdminOtp.findOne({
      email: oldEmail.toLowerCase(),
      newEmail: newEmail.toLowerCase(),
      otp,
      purpose: "change-email",
      expiresAt: { $gt: new Date() }
    });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP"
      });
    }

    const admin = await Admin.findById(req.user.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }

    if (admin.email !== oldEmail.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: "Old email mismatch"
      });
    }

    admin.email = newEmail.toLowerCase();
    await admin.save();

    await AdminOtp.findByIdAndDelete(record._id);

    res.json({
      success: true,
      message: "Email changed successfully"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* UPDATE PROFILE NAME */
exports.updateAdminProfile = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name is required"
      });
    }

    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }

    admin.name = name.trim();
    await admin.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        isActive: admin.isActive
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};