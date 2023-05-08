const express = require("express");
const router = express.Router();

const { createWarehouse, getAllWarehouse, updateWarehouse, getWarehouse, deleteWarehouse } = require("./warehouse.controller");

router.route("/").post(createWarehouse).get(getAllWarehouse);
router.route("/:id").put(updateWarehouse).get(getWarehouse).delete(deleteWarehouse);

module.exports = router;
