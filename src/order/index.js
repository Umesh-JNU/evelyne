const { orderModel, orderItemModel } = require("./order.model");
const { createOrder, getAllOrder, getOrder, updateOrder, deleteOrder, addOrderItem, UpdateOrderItem, deleteOrderItem } = require("./order.controller");
const orderRoute = require("./order.route");

module.exports = { orderModel, createOrder, getAllOrder, getOrder, updateOrder, deleteOrder, addOrderItem, UpdateOrderItem, deleteOrderItem, orderRoute };
