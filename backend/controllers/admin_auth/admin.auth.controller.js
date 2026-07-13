const Admin = require("../../models/admin.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const AdminOtp = require("../../models/admin.otp.model");
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


exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({
      email: email.toLowerCase()
    });

    if (!admin) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    if (admin.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Account disabled"
      });
    }

    // Check account lockout
    if (admin.lockUntil && admin.lockUntil > Date.now()) {
      const remainingTime = admin.lockUntil - Date.now();
      const minutes = Math.ceil(remainingTime / (60 * 1000));
      return res.status(429).json({
        success: false,
        message: `Too many login attempts. Account is temporarily locked. Please try again after ${minutes} minute(s).`
      });
    }

    // If lock has expired, reset attempts in-memory (we'll save it during standard save)
    if (admin.lockUntil && admin.lockUntil <= Date.now()) {
      admin.loginAttempts = 0;
      admin.lockUntil = undefined;
    }

    const isMatch = await bcrypt.compare(
      password,
      admin.password
    );

    if (!isMatch) {
      admin.loginAttempts += 1;
      let message = "Invalid credentials";

      if (admin.loginAttempts >= 5) {
        admin.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes lockout
        message = "Too many failed attempts. Your account has been temporarily locked for 15 minutes.";
      } else {
        const attemptsLeft = 5 - admin.loginAttempts;
        message = `Invalid credentials. ${attemptsLeft} attempt(s) remaining before temporary lockout.`;
      }

      await admin.save();
      return res.status(400).json({
        success: false,
        message
      });
    }

    // Reset login attempts on successful login
    if (admin.loginAttempts > 0 || admin.lockUntil) {
      admin.loginAttempts = 0;
      admin.lockUntil = undefined;
      await admin.save();
    }

    const token = jwt.sign(
      {
        id: admin._id,
        role: admin.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    });

    res.json({
      success: true,
      message: "Login successful",
      token,
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
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
/* FORGOT PASSWORD - SEND OTP */
exports.sendForgotPasswordOtp = async (req, res) => {
  try {
    const { email } = req.body;

    const admin = await Admin.findOne({
      email: email.toLowerCase()
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Email not found"
      });
    }

    const otp = generateOtp();

    await AdminOtp.deleteMany({
      email: email.toLowerCase(),
      purpose: "forgot-password"
    });

    await AdminOtp.create({
      email: email.toLowerCase(),
      otp,
      purpose: "forgot-password",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    });

    await transporter.sendMail({
      from: `"CatchWatch Support" <${process.env.EMAIL_USER}>`,
      to: email.toLowerCase(),
      subject: "Forgot Password OTP",
      text: `Your CatchWatch Admin Forgot Password OTP is ${otp}. This code is valid for 5 minutes. If you did not request this, please ignore this email.`,
      html: getOtpEmailTemplate(
        otp,
        "Forgot Password OTP",
        "We received a request to reset the password for your CatchWatch Admin account. Use the verification code below to proceed. This code is valid for 5 minutes."
      )
    });

    res.json({
      success: true,
      message: "OTP sent successfully"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* FORGOT PASSWORD - VERIFY OTP */
exports.verifyForgotPasswordOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required"
      });
    }

    const record = await AdminOtp.findOne({
      email: email.toLowerCase(),
      otp,
      purpose: "forgot-password",
      expiresAt: { $gt: new Date() }
    });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP"
      });
    }

    res.json({
      success: true,
      message: "OTP verified successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* FORGOT PASSWORD - RESET */
exports.resetForgotPassword = async (req, res) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match"
      });
    }

    const record = await AdminOtp.findOne({
      email: email.toLowerCase(),
      otp,
      purpose: "forgot-password",
      expiresAt: { $gt: new Date() }
    });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP"
      });
    }

    const admin = await Admin.findOne({
      email: email.toLowerCase()
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }

    admin.password = await bcrypt.hash(newPassword, 10);
    await admin.save();

    await AdminOtp.deleteMany({
      email: email.toLowerCase(),
      purpose: "forgot-password"
    });

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

exports.getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id).select("-password -__v");
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }
    res.json({
      success: true,
      admin
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.refreshAdminToken = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    if (admin.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Account disabled",
      });
    }

    const token = jwt.sign(
      {
        id: admin._id,
        role: admin.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.cookie("adminToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    });

    return res.json({
      success: true,
      message: "Admin token refreshed successfully",
      token,
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
        isActive: admin.isActive
      }
    });
  } catch (error) {
    console.error("ADMIN REFRESH TOKEN ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Token refresh failed",
    });
  }
};
