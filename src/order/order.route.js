const express = require("express");
const router = express.Router();
const { auth } = require("../../middlewares/auth");

const { getAllOrder, getOrder, clientValidation } = require("./order.controller");

router.get("/", auth, getAllOrder);
router.get("/:id/", auth, getOrder);
router.put("/:id/client-approval", auth, clientValidation);

module.exports = router;
