const { userRoute, userModel, userController } = require("./user");
const { warehouseRoute, warehouseModel, warehouseController } = require("./warehouse");
const { transactionRoute, transactionModel, transactionController } = require("./transaction");
const { invoiceRoute, invoiceModel, invoiceController } = require("./invoice");
const { orderRoute, orderModel, orderController } = require("./order");
const { adminRoute } = require("./admin");
const {contentRoute} = require("./staticDetails");

userModel.hasMany(orderModel, { foreignKey: "userId", as: "orders" });
orderModel.belongsTo(userModel, { foreignKey: "userId", as: "user" });

warehouseModel.hasMany(orderModel, { foreignKey: "warehouseId", as: "orders" });
orderModel.belongsTo(warehouseModel, { foreignKey: "warehouseId", as: "warehouse" });

orderModel.hasOne(transactionModel, { foreignKey: "orderId", as: "transaction" });
transactionModel.belongsTo(orderModel, { foreignKey: "orderId", as: "order" });

userModel.hasOne(warehouseModel, { foreignKey: "userId", as: "warehouse" });
warehouseModel.belongsTo(userModel, { foreignKey: "userId", as: "managed_by" });

module.exports = {
  userRoute, userModel,
  warehouseRoute,
  transactionRoute,
  invoiceRoute,
  orderRoute,
  adminRoute,
  contentRoute,
};
