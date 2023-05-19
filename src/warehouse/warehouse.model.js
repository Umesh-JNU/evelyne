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
      validate: {
        isPositiveInteger(value) {
          if (value && !Number.isInteger(value) || value <= 0) {
            throw new Error("Capacity must be a positive integer");
          }
        },
      },
    },
    filled: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        isPositiveInteger(value) {
          console.log({value});
          if (value && !Number.isInteger(value) || value < 0) {
            throw new Error("Current Capacity must be a positive integer");
          }
        },
      },
    }
  },
  { timestamps: true }
)

module.exports = warehouseModel;
