// Lazy-loaded Razorpay instance — safe to import even if keys are not yet set.
// The instance is created only when a billing request is first made.
const Razorpay = require("razorpay");

let instance = null;

function getRazorpay() {
  if (instance) return instance;
  if (!process.env.RAZORPAY_KEY || !process.env.RAZORPAY_SECRET) {
    throw new Error(
      "Razorpay keys not configured. " +
      "Set RAZORPAY_KEY and RAZORPAY_SECRET in .env.production"
    );
  }
  instance = new Razorpay({
    key_id:     process.env.RAZORPAY_KEY,
    key_secret: process.env.RAZORPAY_SECRET
  });
  return instance;
}

module.exports = getRazorpay;
