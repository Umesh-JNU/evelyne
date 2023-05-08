const { userRoute, userModel, userController } = require("./user");
const { warehouseRoute, warehouseModel, warehouseController } = require("./warehouse");
const { transactionRoute, transactionModel, transactionController } = require("./transaction");
const { invoiceRoute, invoiceModel, invoiceController } = require("./invoice");
const { orderRoute, orderModel, orderController } = require("./order");
const { adminRoute } = require("./admin");

userModel.hasMany(orderModel, { foreignKey: "userId", as: "orders" });
orderModel.belongsTo(userModel, { foreignKey: "userId", as: "user" });

warehouseModel.hasMany(orderModel, { foreignKey: "warehouseId", as: "orders" });
orderModel.belongsTo(warehouseModel, { foreignKey: "warehouseId", as: "warehouse" });

orderModel.hasOne(transactionModel, {foreignKey: "orderId", as: "transaction"});
transactionModel.belongsTo(orderModel, {foreignKey: "orderId", as: "order"});

module.exports = {
  userRoute, userModel,
  warehouseRoute,
  transactionRoute,
  invoiceRoute,
  orderRoute,
  adminRoute,
};
