const { DataTypes } = require("sequelize");
const { db } = require("../../config/database");

const transactionModel = db.define(
  "Transaction",
  {
    mode: {
      type: DataTypes.ENUM("cash", "card", "bank"),
      defaultValue: "cash",
    },
    status: {
      type: DataTypes.ENUM("processing", "paid", "failed"),
      defaultValue: "processing",
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "Amount can't be empty",
        },
        notNull: {
          msg: "Amount can't be null",
        },
      },
    },
  },
  { timestamps: true }
);

module.exports = transactionModel;
