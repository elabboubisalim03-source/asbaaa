const Certificate = require('../models/Certificate');

// ── GET /api/verify?q=CERT-ID ────────────────────────────────

exports.verifyCertificate = async (req, res) => {
  try {
    const query = (req.query.q || '').trim().toUpperCase();

    if (!query) {
      return res.status(400).json({ success: false, message: 'Please provide a certificate ID.' });
    }

    if (query.length < 4) {
      return res.status(400).json({ success: false, message: 'Certificate ID too short.' });
    }

    const cert = await Certificate.findOne({ certificateId: query });

    if (!cert) {
      return res.status(404).json({
        success: false,
        found: false,
        message: 'No certificate found with this ID. Please check the ID and try again.',
      });
    }

    // Build safe public response (never expose internal IDs or admin info)
    const result = {
      success:           true,
      found:             true,
      certificateId:     cert.certificateId,
      holderName:        cert.holderName,
      country:           cert.country,
      certificationName: cert.certificationName,
      certificationCode: cert.certificationCode,
      issueDate:         cert.issueDate,
      expiryDate:        cert.expiryDate || null,
      status:            cert.status,
      holderPhoto:       cert.holderPhoto || null,
    };

    res.status(200).json(result);

  } catch (error) {
    console.error('verifyCertificate error:', error);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};
