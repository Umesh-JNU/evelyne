const express = require("express");
const router = express.Router();
const { auth } = require("../../middlewares/auth");

const { getAllOrder, getOrder } = require("./order.controller");

router.get("/", auth, getAllOrder);
router.get("/:id/", auth, getOrder);

module.exports = router;
