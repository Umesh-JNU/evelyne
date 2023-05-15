const { DataTypes } = require("sequelize");
const { db } = require("../../config/database");

const orderItemModel = db.define("OrderItem", {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notNull: { msg: "Item name is required" },
      notEmpty: { msg: "Item name is required" },
    },
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      isNumeric: {
        args: true,
        msg: "Quantity must be a number."
      }
    }
  },
  address: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notNull: { msg: "Address is required" },
      notEmpty: { msg: "Address is required" },
    },
  }
}, { timestamps: true });

const orderModel = db.define("Order", {
  status: {
    type: DataTypes.ENUM("arrived", "in-bound", "out-bound", "in-transit"),
    defaultValue: "out-bound",
  }
},
  { timestamps: true }
);

orderModel.hasMany(orderItemModel, { foreignKey: "orderId", as: "items" });
orderItemModel.belongsTo(orderModel, { foreignKey: "orderId", as: "order" });

module.exports = {orderModel, orderItemModel};
