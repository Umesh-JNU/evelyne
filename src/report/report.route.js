const express = require("express");
const { getReport } = require("./report.controller");
const router = express.Router();

router.get("/download", getReport);

module.exports = router;