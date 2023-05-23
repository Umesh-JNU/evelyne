const express = require("express");
const router = express.Router();
const { auth } = require("../../middlewares/auth");

const { create, login, updatePassword, getProfile, updateProfile, forgotPassword, verifyOTP } = require("./user.controller");

router.post("/register", create);
router.post("/login", login);
router.get("/profile", auth, getProfile);
router.put("/reset-password", auth, updatePassword);
router.put("/update-profile", auth, updateProfile);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOTP);

module.exports = router;
