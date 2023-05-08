const ErrorHandler = require("../../utils/errorHandler")
const catchAsyncError = require("../../utils/catchAsyncError")
const getFormattedQuery = require("../../utils/apiFeatures");
const { orderModel, orderItemModel } = require("./order.model");
const { warehouseModel } = require("../warehouse");
const { userModel } = require("../user");

exports.createOrder = catchAsyncError(async (req, res, next) => {
	console.log("create Order", req.body);
	const { warehouse, user, items } = req.body;

	const warehouse_ = await warehouseModel.findByPk(warehouse);
	if (!warehouse_) return next(new ErrorHandler("No such warehouse exists.", 404));

	const user_ = await userModel.findByPk(user);
	if (!user_) return next(new ErrorHandler("User not found.", 404));

	const order = await orderModel.create({});

	items.forEach(item => { item.orderId = order.id; });
	console.log(items);
	await orderItemModel.bulkCreate(items);

	await warehouse_.addOrder(order);
	await user_.addOrder(order);

	res.status(201).json({ order });
})

exports.getAllOrder = catchAsyncError(async (req, res, next) => {
	console.log(req.query);
	const query = getFormattedQuery("id", req.query);
	console.log(JSON.stringify(query));
	const { rows, count } = await orderModel.findAndCountAll({
		...query, include: [
			{
				model: orderItemModel,
				as: "items",
				attributes: ["id", "name", "quantity"],
			},
		]
	});
	res.status(200).json({ orders: rows, orderCount: count });
})

exports.getOrder = catchAsyncError(async (req, res, next) => {
	console.log("get Order");
	const { id } = req.params;
	const order = await orderModel.findByPk(id, {
		include: [
			{
				model: orderItemModel,
				as: "items",
				attributes: ["id", "name", "quantity"],
			},
		]
	});
	if (!order) return next(new ErrorHandler("Order not found", 404));

	res.status(200).json({ order });
})

exports.updateOrder = catchAsyncError(async (req, res, next) => {
	console.log("update Order", req.body);
	const { id } = req.params;

	const [_, order] = await orderModel.update(req.body, {
		where: { id },
		returning: true, // Return the updated order object
	});

	if (_ === 0) return next(new ErrorHandler("Order not found.", 404));

	res.status(200).json({ message: "Order updated successfully.", order });
})

exports.deleteOrder = catchAsyncError(async (req, res, next) => {
	const { id } = req.params;
	await orderModel.destroy({ where: { id } });
	res.status(204).json({ message: "Order Deleted Successfully." });
})