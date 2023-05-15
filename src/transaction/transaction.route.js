const express = require("express");
const router = express.Router();
const {auth, authRole} = require("../../middlewares/auth");

const { createTransaction, getAllTransaction, updateTransaction, getTransaction, deleteTransaction } = require("./transaction.controller");

router.route("/").post(createTransaction).get(auth, authRole("admin"), getAllTransaction);
router.route("/:id").put(updateTransaction).get(getTransaction).delete(deleteTransaction);

module.exports = router;
