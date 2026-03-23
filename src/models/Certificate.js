const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema(
  {
    // The ID the user types on the verification page
    certificateId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    // Certificate holder info
    holderName:       { type: String, required: true, trim: true },
    holderEmail:      { type: String, trim: true, lowercase: true },
    holderPhoto:      { type: String, default: null }, // base64 or URL
    holderPhoto:      { type: String, trim: true }, // base64 or URL
    country:          { type: String, trim: true },

    // What was certified
    certificationName: { type: String, required: true, trim: true },
    certificationCode: { type: String, trim: true }, // e.g. CPA, CMA, TOT

    // Dates
    issueDate:      { type: Date, required: true },
    expiryDate:     { type: Date },  // null = no expiry

    // Status
    status: {
      type: String,
      enum: ['active', 'expired', 'revoked'],
      default: 'active',
    },

    // Link back to the original application (optional)
    applicationRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },

    // Who issued it
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true }
);

// Index for fast verification lookups
certificateSchema.index({ holderEmail: 1 });

module.exports = mongoose.model('Certificate', certificateSchema);
