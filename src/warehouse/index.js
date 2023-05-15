const warehouseModel = require("./warehouse.model");
const { createWarehouse, getAllWarehouse, getWarehouse, updateWarehouse, deleteWarehouse } = require("./warehouse.controller");
const warehouseRoute = require("./warehouse.route");

module.exports = { warehouseModel, createWarehouse, getAllWarehouse, getWarehouse, updateWarehouse, deleteWarehouse, warehouseRoute };
