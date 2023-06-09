const warehouseModel = require("./warehouse.model");
const { createWarehouse, getAllWarehouse, getWarehouse, updateWarehouse, deleteWarehouse, myWarehouse, housesAndOrderCount, warehouseAndAllOrders, getWarehouseOrder, housesAndTransactionCount, getWarehouseTransaction, assignHandler, removeHandler } = require("./warehouse.controller");
const warehouseRoute = require("./warehouse.route");

module.exports = { warehouseModel, createWarehouse, getAllWarehouse, getWarehouse, updateWarehouse, deleteWarehouse, myWarehouse, housesAndOrderCount, warehouseAndAllOrders, getWarehouseOrder, housesAndTransactionCount, getWarehouseTransaction, assignHandler, removeHandler, warehouseRoute };
