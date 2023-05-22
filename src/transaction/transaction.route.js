const express = require("express");
const router = express.Router();
const { auth } = require("../../middlewares/auth");

const { getAllTransaction, getTransaction } = require("./transaction.controller");

router.get("/", auth, getAllTransaction);
router.get("/:id/", auth, getTransaction);

module.exports = router;
