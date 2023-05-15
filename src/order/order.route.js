const express = require("express");
const router = express.Router();
const { auth } = require("../../middlewares/auth");

const { createOrder, getAllOrder, updateOrder, getOrder, deleteOrder, getMyAllOrder, getMyOrder } = require("./order.controller");

router.route("/").post(createOrder).get(getAllOrder);
router.get("/me", auth, getMyAllOrder);
router.get("/:id/me", auth, getMyOrder);
router.route("/:id").put(updateOrder).get(getOrder).delete(deleteOrder);

module.exports = router;
