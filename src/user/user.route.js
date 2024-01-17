const express = require("express");
const router = express.Router();
const { auth } = require("../../middlewares/auth");

const { create, login, updatePassword, getProfile, updateProfile, forgotPassword, verifyOTP, deleteAccount } = require("./user.controller");

router.post("/register", create);
router.post("/login", login);
router.get("/profile", auth, getProfile);
router.put("/change-password", auth, updatePassword);
router.put("/update-profile", auth, updateProfile);
router.delete("/delete", auth, deleteAccount);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOTP);
router.put("/reset-password", updatePassword);
module.exports = router;
