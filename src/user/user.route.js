const express = require("express");
const router = express.Router();
const { auth } = require("../../middlewares/auth");

const { create, login, resetPassword, getProfile, updateProfile } = require("./user.controller");

router.post("/register", create);
router.post("/login", login);
router.get("/profile", auth, getProfile);
router.put("/reset-password", auth, resetPassword);
router.put("/update-profile", auth, updateProfile);

module.exports = router;
