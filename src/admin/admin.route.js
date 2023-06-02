const express = require('express');
const router = express.Router();
const { auth, authRole } = require("../../middlewares/auth");
const { user, warehouse } = require("../../middlewares/validate");

const { createController, getAllUsers, getUser, updateUser, deleteUser } = require('./admin.controller').userController;

const { createContent, updateContent, deleteContent } = require("../staticDetails/content.controller");

const { createWarehouse, updateWarehouse, deleteWarehouse, getWarehouseOrder, myWarehouse, assignHandler } = require("../warehouse");

const { createOrder, getAllOrder, getOrder, updateOrder, deleteOrder } = require('../order');

const { createTransaction, getAllTransaction, updateTransaction, getTransaction, deleteTransaction } = require('../transaction/transaction.controller');
const { getWarehouseTransaction } = require('../warehouse/warehouse.controller');

router.post("/controller", auth, authRole(['admin']), createController);
router.post("/manager", auth, authRole(['admin']), createController);
router.get("/users", auth, authRole(["admin"]), getAllUsers);
router.route("/user/:id")
  .get(auth, authRole(["admin"]), getUser)
  .put(auth, authRole(["admin"]), updateUser)
  .delete(auth, authRole(["admin"]), deleteUser);

router.post("/content", auth, authRole(["admin"]), createContent);
router.route("/content/:id")
  .put(auth, authRole(["admin"]), updateContent)
  .delete(auth, authRole(["admin"]), deleteContent);

router.post("/warehouse", auth, authRole(["admin"]), createWarehouse);
router.get("/warehouse/orders", auth, authRole(["admin", "controller", "manager"]), getWarehouseOrder);
router.get("/warehouse/transactions", auth, authRole(["admin", "controller", "manager"]), getWarehouseTransaction);
router.get("/my-warehouse", auth, authRole(["admin", "controller", "manager"]), myWarehouse);
router.put("/warehouse/assign", warehouse.assign, auth, authRole(["admin"]), assignHandler);
router.route("/warehouse/:id")
  .put(auth, authRole(["admin"]), updateWarehouse)
  .delete(auth, authRole(["admin"]), deleteWarehouse);

router.post("/order", auth, authRole(['admin', 'manager']), createOrder);
router.get("/orders", auth, authRole(['admin', 'manager', 'controller']), getAllOrder);

router.route("/order/:id")
  .put(auth, authRole(['admin', 'manager']), updateOrder)
  .get(auth, authRole(['admin', 'manager', 'controller']), getOrder)
  .delete(auth, authRole(['admin', 'manager']), deleteOrder);

router.post("/transaction", auth, authRole(['admin', 'manager']), createTransaction);
router.get("/transactions", auth, authRole(['admin', 'manager', 'controller']), getAllTransaction);

router.route("/transaction/:id")
  .put(auth, authRole(['admin', 'manager']), updateTransaction)
  .get(auth, authRole(['admin', 'manager', 'controller']), getTransaction)
  .delete(auth, authRole(['admin', 'manager']), deleteTransaction);


module.exports = router;