const express = require("express");
const router = express.Router();
const { auth } = require("../../middlewares/auth");

const { create, index, update, show, destroy } = require("./invoice.controller");

router.route("/").post(create).get(index);
router.route("/:id").put(update).get(show).delete(destroy);

module.exports = router;
