const express = require("express");
const { getReport, trackOrder, transaction, bondReport, getOrderPDF } = require("./report.controller");
const { auth, authRole } = require("../../middlewares/auth");
const router = express.Router();

router.get("/:id", auth, authRole(["admin", "manager", "controller"]), getReport); // id = warehouse id
router.get("/track-order/:id", auth, trackOrder); // id = order id
router.get("/transaction/:id", auth, authRole(["controller"]), transaction); // id = transaction id
router.get("/bond-report/:id", auth, bondReport); // id = warehouse id
router.get("/order/:id", auth, getOrderPDF);

module.exports = router;