const express = require("express");
const router = express.Router();
const { auth, authRole } = require("../../middlewares/auth");

router.get("/", getAllContact);
router.get("/:id", getContact);

module.exports = router;
