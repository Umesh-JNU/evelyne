const express = require("express");
const router = express.Router();
const { auth, authRole } = require("../../middlewares/auth");
const { getAllContent, getContent } = require("./content.controller");

router.get("/", getAllContent);
router.get("/:id", getContent);

module.exports = router;
