const express = require('express');
const router = express.Router();
const {auth, isAdmin} = require("../../middlewares/auth");
const { getAllUsers, getUser, updateUser, deleteUser } = require('./admin.controller');

router.get("/users", auth, isAdmin, getAllUsers)
router.route("/user/:id").get(auth, isAdmin, getUser).put(auth, isAdmin, updateUser).delete(auth, isAdmin, deleteUser);

module.exports = router;