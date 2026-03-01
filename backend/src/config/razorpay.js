const Razorpay = require("razorpay");

if (!process.env.RAZORPAY_KEY || !process.env.RAZORPAY_SECRET) {
  console.warn("[RAZORPAY] Keys not set — billing will not work");
}

module.exports = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY,
  key_secret: process.env.RAZORPAY_SECRET
});
