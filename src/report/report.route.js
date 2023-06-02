const express = require("express");
const { getReport } = require("./report.controller");
const router = express.Router();

router.get("/", getReport);

module.exports = router;