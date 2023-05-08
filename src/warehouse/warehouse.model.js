const { DataTypes } = require("sequelize");
const { db } = require("../../config/database");

const warehouseModel = db.define(
  "Warehouse",
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: "A warehouse name can't be empty." },
        notNull: { msg: "A warehouse name can't be null" },
      },
    }, 
    capacity: {
      type: DataTypes.INTEGER,
      defaultValue: 1000,
    },
  },
  { timestamps: true }
)

module.exports = warehouseModel;
