const ErrorHandler = require("../../utils/errorHandler")
const catchAsyncError = require("../../utils/catchAsyncError")
const getFormattedQuery = require("../../utils/apiFeatures");
const { orderModel, orderItemModel } = require("./order.model");
const warehouseModel = require("../warehouse/warehouse.model");
const { userModel } = require("../user/user.model");

const includeOptions = [
	{
		model: orderItemModel,
		as: "items",
		attributes: ["id", "name", "quantity"],
	},
	{
		model: userModel,
		as: "user",
		attributes: ["id", "fullname"],
	},
	{
		model: warehouseModel,
		as: "warehouse",
		attributes: ["id", "name"],
	},
];

exports.createOrder = catchAsyncError(async (req, res, next) => {
	console.log("create Order", req.body);
	const { warehouse, user, items } = req.body;

	if (!items || items.length === 0) return next(new ErrorHandler("Please provide at least one product.", 400));

	const warehouse_ = await warehouseModel.findByPk(warehouse);
	if (!warehouse_) return next(new ErrorHandler("No such warehouse exists.", 404));

	const user_ = await userModel.findByPk(user);
	if (!user_) return next(new ErrorHandler("User not found.", 404));

	let order = await orderModel.create(req.body);

	items.forEach(item => { item.orderId = order.id; });
	console.log(items);
	await orderItemModel.bulkCreate(items);

	await warehouse_.addOrder(order);
	await user_.addOrder(order);

	order = await orderModel.findByPk(order.id, {
		include: includeOptions,
		attributes: {
			exclude: ["warehouseId", "userId"]
		}
	})
	res.status(201).json({ order });
})

exports.getAllOrder = catchAsyncError(async (req, res, next) => {
	console.log(req.query);
	const query = getFormattedQuery("id", req.query);

	const user = req.user;
	console.log({ user });
	if (!user || user?.userRole?.role === 'user') {
		console.log(!user)
		query.where = {
			...query.where,
			userId: req.userId
		}
	};

	console.log(JSON.stringify(query));

	const counts = await orderModel.getCounts(query.where);

	const orders = await orderModel.findAll({
		...query,
		include: includeOptions,
		attributes: {
			exclude: ["warehouseId", "userId"]
		},
		order: [['createdAt', 'DESC']]
	});

	res.status(200).json({ orders, orderCount: orders.length, counts });
})

exports.getOrder = catchAsyncError(async (req, res, next) => {
	console.log("get Order");
	const { id } = req.params;

	const user = req.user;
	let query = { where: { id } };
	if (!user || user?.userRole?.role === 'user') {
		query.where = {
			...query.where,
			userId: req.userId
		}
	};

	const order = await orderModel.findOne({
		...query,
		include: includeOptions,
		attributes: {
			exclude: ["warehouseId", "userId"]
		}
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
