const { userRoute, userModel, userController } = require("./user");
const { warehouseRoute, warehouseModel, warehouseController } = require("./warehouse");
const { transactionRoute, transactionModel, transactionController } = require("./transaction");
const { invoiceRoute, invoiceModel, invoiceController } = require("./invoice");
const { orderRoute, orderModel, orderController } = require("./order");
const { adminRoute } = require("./admin");
const { contentRoute } = require("./staticDetails");

userModel.hasMany(orderModel, { foreignKey: "userId", as: "orders" });
orderModel.belongsTo(userModel, { foreignKey: "userId", as: "user" });

warehouseModel.hasMany(orderModel, { foreignKey: "warehouseId", as: "orders" });
orderModel.belongsTo(warehouseModel, { foreignKey: "warehouseId", as: "warehouse" });

orderModel.hasOne(transactionModel, { foreignKey: "orderId", as: "transaction" });
transactionModel.belongsTo(orderModel, { foreignKey: "orderId", as: "order" });

// warehouseModel.belongsToMany(userModel, { through: "UserWarehouse", as: "controlled_by" });
// userModel.belongsToMany(warehouseModel, { through: "UserWarehouse", as: "warehouses" });

// Define one-to-one relationship 
// - one manager has only one warehouse
userModel.hasOne(warehouseModel, { foreignKey: 'managerId', as: 'warehouse' });
warehouseModel.belongsTo(userModel, { foreignKey: 'managerId', as: 'manager' });

// Define one-to-many relationship
// - one controller has may have more than warehouse
userModel.hasMany(warehouseModel, { foreignKey: 'controllerId', as: 'warehouses' });
warehouseModel.belongsTo(userModel, { foreignKey: 'controllerId', as: 'controller' });

module.exports = {
  userRoute, userModel,
  warehouseRoute,
  transactionRoute,
  invoiceRoute,
  orderRoute,
  adminRoute,
  contentRoute,
};
