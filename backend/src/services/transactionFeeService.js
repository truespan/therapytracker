/**
 * Transaction Fee Calculator Service
 * Calculates Razorpay payout transaction fees based on payment method
 */

/**
 * Calculate payout fee for a given amount and payment method
 * @param {number} amount - Amount in INR
 * @param {string} paymentMethod - Payment method ('IMPS', 'NEFT', 'RTGS')
 * @returns {Object} Fee breakdown
 */
function calculatePayoutFee(amount, paymentMethod = 'IMPS') {
  // Get fee configuration from environment variables with defaults
  const IMPS_FEE = parseFloat(process.env.RAZORPAY_IMPS_FEE) || 2;
  const NEFT_FEE = parseFloat(process.env.RAZORPAY_NEFT_FEE) || 2;
  const RTGS_FEE = parseFloat(process.env.RAZORPAY_RTGS_FEE) || 25;
  const GST_RATE = parseFloat(process.env.RAZORPAY_GST_RATE) || 18;

  // Determine base fee based on payment method
  let baseFee = 0;
  switch (paymentMethod.toUpperCase()) {
    case 'IMPS':
      baseFee = IMPS_FEE;
      break;
    case 'NEFT':
      baseFee = NEFT_FEE;
      break;
    case 'RTGS':
      baseFee = RTGS_FEE;
      break;
    default:
      baseFee = IMPS_FEE; // Default to IMPS
  }

  // Calculate GST on fee
  const gstAmount = (baseFee * GST_RATE) / 100;
  
  // Total fee (base fee + GST)
  const totalFee = baseFee + gstAmount;
  
  // Net amount after fee deduction
  const netAmount = Math.max(0, amount - totalFee);

  return {
    baseFee: parseFloat(baseFee.toFixed(2)),
    gstAmount: parseFloat(gstAmount.toFixed(2)),
    totalFee: parseFloat(totalFee.toFixed(2)),
    netAmount: parseFloat(netAmount.toFixed(2)),
    grossAmount: parseFloat(amount.toFixed(2)),
    paymentMethod: paymentMethod.toUpperCase()
  };
}

module.exports = {
  calculatePayoutFee
};

