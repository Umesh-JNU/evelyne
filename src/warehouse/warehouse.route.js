const express = require("express");
const router = express.Router();
const { auth } = require("../../middlewares/auth");

const { getAllWarehouse, getWarehouse } = require("./warehouse.controller");

router.get("/", getAllWarehouse);
router.get("/:id", getWarehouse);

module.exports = router;

// search by Id, name warehouse,
