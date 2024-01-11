const { DataTypes } = require("sequelize");
const { db } = require("../../config/database");

const warehouseModel = db.define(
  "Warehouse",
  {
    desc: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: "Warehouse's decription is required." },
        notNull: { msg: "Warehouse's decription is required." },
      }
    },
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
          console.log({ value });
          if (value && !Number.isInteger(value) || value < 0) {
            throw new Error("Current Capacity must be a positive integer");
          }
        },
      },
    },
    image: {
      type: DataTypes.STRING,
      defaultValue: "https://cdn0.iconfinder.com/data/icons/containers/512/palet03.png",
      allowNull: false,
      validate: {
        notEmpty: { msg: "Image for warehouse is required." },
        notNull: { msg: "Image for warehouse is required." },
      },
    },
    countryName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: "Country Name for warehouse is required." },
        notNull: { msg: "Country Name for warehouse is required." },
      },
    },
    iso: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: "ISO for warehouse is required." },
        notNull: { msg: "ISO for warehouse is required." },
      },
    },
    symbol: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: "Currency Symbol for warehouse is required." },
        notNull: { msg: "Currency Symbol for warehouse is required." },
      },
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: "Currency for warehouse is required." },
        notNull: { msg: "Currency for warehouse is required." },
      },
    }
  },
  { timestamps: true }
)

module.exports = warehouseModel;
