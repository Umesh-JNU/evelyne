const express = require("express");
const router = express.Router();
const { auth, authRole } = require("../../middlewares/auth");

const { createOrder, getAllOrder, updateOrder, getOrder, deleteOrder, getMyAllOrder, getMyOrder } = require("./order.controller");

router.route("/")
  .post(auth, authRole(['admin', 'manager']), createOrder)
  .get(auth, authRole(['admin', 'manager', 'controller']), getAllOrder);

router.get("/me", auth, getMyAllOrder);
router.get("/:id/me", auth, getMyOrder);

router.route("/:id")
  .put(auth, authRole(['admin', 'manager']), updateOrder)
  .get(auth, authRole(['admin', 'manager', 'controller']), getOrder)
  .delete(auth, authRole(['admin', 'manager']), deleteOrder);

module.exports = router;
