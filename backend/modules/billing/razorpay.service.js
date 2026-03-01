const Razorpay = require("razorpay");
const crypto = require("crypto");

const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY,
  key_secret: process.env.RAZORPAY_SECRET
});

exports.createOrder = async (amount) => {
  return await instance.orders.create({
    amount: amount * 100,
    currency: "INR",
    receipt: "receipt_" + Date.now()
  });
};

exports.verifySignature = (body, signature) => {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_SECRET)
    .update(JSON.stringify(body))
    .digest("hex");

  return expected === signature;
};