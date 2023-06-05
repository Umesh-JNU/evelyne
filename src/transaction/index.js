const transactionModel = require("./transaction.model");
const { createTransaction, getAllTransaction, updateTransaction, getTransaction, deleteTransaction } = require("./transaction.controller");
const transactionRoute = require("./transaction.route");

module.exports = { transactionModel, createTransaction, getAllTransaction, updateTransaction, getTransaction, deleteTransaction, transactionRoute };
