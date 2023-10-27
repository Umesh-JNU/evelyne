const { orderModel, orderItemModel } = require("./order.model");
const { createOrder, getAllOrder, getOrder, updateOrder, updateOrderStatus, approveOrder, deleteOrder, addOrderItem, UpdateOrderItem, deleteOrderItem, discardOrder } = require("./order.controller");
const orderRoute = require("./order.route");

module.exports = { orderModel, createOrder, getAllOrder, getOrder, updateOrder, updateOrderStatus, approveOrder, deleteOrder, addOrderItem, UpdateOrderItem, deleteOrderItem, discardOrder, orderRoute };
