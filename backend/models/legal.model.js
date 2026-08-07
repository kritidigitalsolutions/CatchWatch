const mongoose = require("mongoose");

// Dynamic legal/document page schema
const sectionSchema = new mongoose.Schema({
  heading: { type: String, trim: true },
  paragraphs: [{ type: String, trim: true }]
}, { _id: true });

const legalSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    title: { type: String, required: true, trim: true },
    content: { type: String, default: "" }, // rich text / fallback text
    sections: [sectionSchema], // Dynamic sections with heading & multiple paragraphs
    icon: { type: String, default: "" },
    order: { type: Number, default: 0 },
    lastUpdatedBy: { type: String, default: "Admin" },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Legal", legalSchema);
