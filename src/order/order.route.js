const express = require("express");
const router = express.Router();

const { createOrder, getAllOrder, updateOrder, getOrder, deleteOrder } = require("./order.controller");

router.route("/").post(createOrder).get(getAllOrder);
router.route("/:id").put(updateOrder).get(getOrder).delete(deleteOrder);

module.exports = router;
