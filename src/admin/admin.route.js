const express = require('express');
const { auth, authRole } = require("../../middlewares/auth");
const { warehouse } = require("../../middlewares/validate");

const { createController, getAllUsers, getUser, updateUser, deleteUser } = require('./admin.controller').userController;

const { createContent, updateContent, deleteContent } = require("../staticDetails");

const { createWarehouse, updateWarehouse, deleteWarehouse, myWarehouse, housesAndOrderCount, warehouseAndAllOrders, getWarehouseOrder, housesAndTransactionCount, getWarehouseTransaction, assignHandler } = require("../warehouse");

const { createOrder, getAllOrder, getOrder, updateOrder, deleteOrder } = require('../order');

const { createTransaction, getAllTransaction, getTransaction, updateTransaction, deleteTransaction } = require("../transaction");

// --------------------------------------------------------------------------------------------------------------
const adminRoute = express.Router();

adminRoute.post("/controller", auth, authRole(['admin']), createController);
adminRoute.post("/manager", auth, authRole(['admin']), createController);
adminRoute.get("/users", auth, authRole(["admin"]), getAllUsers);
adminRoute.route("/user/:id")
  .get(auth, authRole(["admin"]), getUser)
  .put(auth, authRole(["admin"]), updateUser)
  .delete(auth, authRole(["admin"]), deleteUser);

adminRoute.post("/content", auth, authRole(["admin"]), createContent);
adminRoute.route("/content/:id")
  .put(auth, authRole(["admin"]), updateContent)
  .delete(auth, authRole(["admin"]), deleteContent);

adminRoute.post("/warehouse", auth, authRole(["admin"]), createWarehouse);
adminRoute.put("/warehouse/assign", warehouse.assign, auth, authRole(["admin"]), assignHandler);
adminRoute.route("/warehouse/:id")
  .put(auth, authRole(["admin"]), updateWarehouse)
  .delete(auth, authRole(["admin"]), deleteWarehouse);

adminRoute.post("/order", auth, authRole(['admin', 'manager']), createOrder);
adminRoute.get("/orders", auth, authRole(['admin']), getAllOrder);

adminRoute.route("/order/:id")
  .put(auth, authRole(['admin', 'manager']), updateOrder)
  .get(auth, authRole(['admin']), getOrder)
  .delete(auth, authRole(['admin', 'manager']), deleteOrder);

adminRoute.post("/transaction", auth, authRole(['admin', 'manager']), createTransaction);
adminRoute.get("/transactions", auth, authRole(['admin']), getAllTransaction);

adminRoute.route("/transaction/:id")
  .put(auth, authRole(['admin', 'manager']), updateTransaction)
  .get(auth, authRole(['admin']), getTransaction)
  .delete(auth, authRole(['admin', 'manager']), deleteTransaction);

// --------------------------------------------------------------------------------------------------------------
const controllerRoute = express.Router();

controllerRoute.get("/warehouse/orders/count", auth, authRole(["controller"]), housesAndOrderCount);
controllerRoute.get("/all-warehouse/orders", auth, authRole(["controller"]), warehouseAndAllOrders);
controllerRoute.get("/warehouse/orders", auth, authRole(["controller"]), getWarehouseOrder);
controllerRoute.get("/warehouse/order/:id", auth, authRole(["controller"]), getOrder);
controllerRoute.get("/warehouse/transactions", auth, authRole(["controller"]), getWarehouseTransaction);
controllerRoute.get("/warehouse/transactions/count", auth, authRole(["controller"]), housesAndTransactionCount);
// controllerRoute.get("/my-warehouse", auth, authRole(["controller"]), myWarehouse);

// --------------------------------------------------------------------------------------------------------------
const managerRoute = express.Router();

managerRoute.get("/warehouse/orders", auth, authRole(["manager"]), getWarehouseOrder);
managerRoute.get("/warehouse/order/:id", auth, authRole(["manager"]), getOrder);
managerRoute.get("/warehouse/transactions", auth, authRole(["manager"]), getWarehouseTransaction);
managerRoute.get("/my-warehouse", auth, authRole(["manager"]), myWarehouse);

module.exports = { adminRoute, controllerRoute, managerRoute };