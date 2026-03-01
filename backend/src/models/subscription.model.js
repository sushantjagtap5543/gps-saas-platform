const { DataTypes } = require("sequelize");
module.exports = (sequelize) => sequelize.define("subscriptions", {
  id:                  { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id:             { type: DataTypes.UUID, allowNull: false },
  plan_id:             { type: DataTypes.UUID, allowNull: false },
  start_date:          { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  end_date:            { type: DataTypes.DATE, allowNull: false },
  status:              { type: DataTypes.ENUM("ACTIVE","EXPIRED","CANCELLED"), defaultValue: "ACTIVE" },
  razorpay_order_id:   DataTypes.STRING,
  razorpay_payment_id: DataTypes.STRING
}, { tableName: "subscriptions", timestamps: true });
