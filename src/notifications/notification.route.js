const express = require("express");
const router = express.Router();
const { auth } = require("../../middlewares/auth");
const { getAllNotification, getNotification, updateNotification } = require("./notification.controller");

router.get("/", auth, getAllNotification);
router.route("/:id")
  .get(auth, getNotification)
  .put(auth, updateNotification);

module.exports = router;
