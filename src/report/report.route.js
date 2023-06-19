const express = require("express");
const { getReport, trackOrder, transaction } = require("./report.controller");
const { auth, authRole } = require("../../middlewares/auth");
const router = express.Router();

router.get("/", auth, authRole(["admin", "manager", "controller"]), getReport);
router.get("/track-order/:id", auth, trackOrder);
router.get("/transaction/:id", auth, authRole(["controller"]), transaction);

module.exports = router;