const express = require('express');
const { auth, authRole } = require("../../middlewares/auth");
const { warehouse, order } = require("../../middlewares/validate");

const { createController, getAllUsers, getUser, updateUser, deleteUser, unDeleteUser, summary } = require('./admin.controller').userController;

const { createUpdateContent, getContent } = require("../staticDetails");

const { createWarehouse, updateWarehouse, deleteWarehouse, myWarehouse, housesAndOrderCount, warehouseAndAllOrders, getWarehouseOrder, housesAndTransactionCount, getWarehouseTransaction, assignHandler, removeHandler } = require("../warehouse");

const { createOrder, getAllOrder, getOrder, updateOrder, approveOrder, deleteOrder, UpdateOrderItem, addOrderItem, deleteOrderItem, discardOrder } = require('../order');

const { createTransaction, getAllTransaction, getTransaction, updateTransaction, deleteTransaction, addComment } = require("../transaction");

// --------------------------------------------------------------------------------------------------------------
const adminRoute = express.Router();
const authAdmin = authRole(["admin"]);

adminRoute.get("/summary", auth, authAdmin, summary);

adminRoute.post("/controller", auth, authAdmin, createController);
adminRoute.post("/manager", auth, authAdmin, createController);
adminRoute.post("/user", auth, authAdmin, createController);
adminRoute.get("/users", auth, authAdmin, getAllUsers);
adminRoute.put("/user/:id/undelete", auth, authAdmin, unDeleteUser);

adminRoute.route("/user/:id")
  .get(auth, authAdmin, getUser)
  .put(auth, authAdmin, updateUser)
  .delete(auth, authAdmin, deleteUser);

adminRoute.route("/content")
  .post(auth, authAdmin, createUpdateContent)
  .get(auth, authAdmin, getContent);

adminRoute.post("/warehouse", auth, authAdmin, createWarehouse);
adminRoute.put("/warehouse/assign", warehouse.assign, auth, authAdmin, assignHandler);
adminRoute.put("/warehouse/remove", warehouse.remove, auth, authAdmin, removeHandler);
adminRoute.route("/warehouse/:id")
  .put(auth, authAdmin, updateWarehouse)
  .delete(auth, authAdmin, deleteWarehouse);

adminRoute.post("/order", auth, authAdmin, createOrder);
adminRoute.get("/orders", auth, authAdmin, getAllOrder);

adminRoute.route("/order/:id")
  .put(auth, authAdmin, updateOrder)
  .get(auth, authAdmin, getOrder)
  .delete(auth, authAdmin, deleteOrder);

adminRoute.post("/order/:id/items", order.item, auth, authAdmin, addOrderItem);
adminRoute.route("/order/:id/item/:item")
  .put(auth, order.itemObj, authAdmin, UpdateOrderItem)
  .delete(auth, authAdmin, deleteOrderItem);

adminRoute.post("/transaction", auth, authRole(['admin', 'manager']), createTransaction);
adminRoute.get("/transactions", auth, authAdmin, getAllTransaction);
adminRoute.post("/transaction/:id/add-comment", auth, authAdmin, addComment);
adminRoute.route("/transaction/:id")
  .put(auth, authRole(['admin', 'manager']), updateTransaction)
  .get(auth, authAdmin, getTransaction)
  .delete(auth, authRole(['admin', 'manager']), deleteTransaction);

// --------------------------------------------------------------------------------------------------------------
const controllerRoute = express.Router();
const authController = authRole(["controller"]);

controllerRoute.get("/warehouse/orders/count", auth, authController, housesAndOrderCount);
controllerRoute.get("/warehouse/orders", auth, authController, getWarehouseOrder);
controllerRoute.get("/order/:id", auth, authController, getOrder);
controllerRoute.get("/all-warehouse/orders", auth, authController, warehouseAndAllOrders);
controllerRoute.get("/warehouse/transactions/count", auth, authController, housesAndTransactionCount);
controllerRoute.get("/warehouse/transactions", auth, authController, getWarehouseTransaction);
controllerRoute.get("/transaction/:id", auth, authController, getTransaction);
controllerRoute.get("/my-warehouses", auth, authController, myWarehouse);

// --------------------------------------------------------------------------------------------------------------
const managerRoute = express.Router();
const authManager = authRole(["manager"]);

// managerRoute.get("/warehouse/goods-notices", auth, authManager, getAllOrder);
managerRoute.post("/order", order.post, auth, authManager, createOrder);
managerRoute.get("/warehouse/orders", auth, authManager, getWarehouseOrder);
managerRoute.route("/order/:id")
  .get(auth, authManager, getOrder)
  .put(order.put, auth, authManager, updateOrder)
  .delete(auth, authManager, deleteOrder);
managerRoute.put("/order/:id/discard", auth, authManager, discardOrder);
// managerRoute.post("/order/:id/items", order.item, auth, authManager, addOrderItem);
// managerRoute.route("/order/:id/item/:item")
//   .put(auth, order.itemObj, authManager, UpdateOrderItem)
//   .delete(auth, authManager, deleteOrderItem);
// managerRoute.put("/order/:id/update-status", order.updateStatus, auth, authManager, updateOrderStatus);
managerRoute.put("/order/:id/approve", auth, authManager, approveOrder);
managerRoute.get("/warehouse/transactions", auth, authManager, getWarehouseTransaction);
managerRoute.get("/transaction/:id", auth, authManager, getTransaction);
managerRoute.post("/transaction/:id/add-comment", auth, authManager, addComment);
managerRoute.get("/my-warehouse", auth, authManager, myWarehouse);

module.exports = { adminRoute, controllerRoute, managerRoute };