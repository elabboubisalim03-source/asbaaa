const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
  {
    // Which form was submitted
    type: {
      type: String,
      enum: ['institution', 'instructor', 'diploma'],
      required: true,
    },

    // ── Institution fields ──────────────────────────────────
    organizationName: { type: String, trim: true },
    ownerName:        { type: String, trim: true },
    field:            { type: String, trim: true },
    website:          { type: String, trim: true },
    facebook:         { type: String, trim: true },

    // ── Instructor / Diploma fields ─────────────────────────
    name: { type: String, trim: true },
    job:  { type: String, trim: true },

    // ── Shared fields ───────────────────────────────────────
    country:  { type: String, required: true, trim: true },
    email:    { type: String, required: true, trim: true, lowercase: true },
    phone:    { type: String, required: true, trim: true },
    whatsapp: { type: String, required: true, trim: true },

    // ── Admin management ────────────────────────────────────
    status: {
      type: String,
      enum: ['pending', 'reviewing', 'approved', 'rejected'],
      default: 'pending',
    },
    adminNotes: { type: String, trim: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    reviewedAt: { type: Date },
  },
  { timestamps: true } // adds createdAt and updatedAt automatically
);

// Index for faster admin queries
applicationSchema.index({ status: 1, createdAt: -1 });
applicationSchema.index({ email: 1 });

module.exports = mongoose.model('Application', applicationSchema);
