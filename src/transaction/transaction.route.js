const express = require("express");
const router = express.Router();

const { createTransaction, getAllTransaction, updateTransaction, getTransaction, deleteTransaction } = require("./transaction.controller");

router.route("/").post(createTransaction).get(getAllTransaction);
router.route("/:id").put(updateTransaction).get(getTransaction).delete(deleteTransaction);

module.exports = router;
