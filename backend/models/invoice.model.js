module.exports = (sequelize, DataTypes) => {
  return sequelize.define("Invoice", {
    user_id: DataTypes.INTEGER,
    subscription_id: DataTypes.INTEGER,
    amount: DataTypes.FLOAT,
    status: DataTypes.STRING,
    invoice_number: DataTypes.STRING
  });
};