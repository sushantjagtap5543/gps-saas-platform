module.exports = (sequelize, DataTypes) => {
  return sequelize.define("Subscription", {
    user_id: DataTypes.INTEGER,
    plan_id: DataTypes.INTEGER,
    start_date: DataTypes.DATE,
    end_date: DataTypes.DATE,
    status: {
      type: DataTypes.ENUM("active", "expired", "suspended"),
      defaultValue: "active"
    },
    razorpay_payment_id: DataTypes.STRING
  });
};