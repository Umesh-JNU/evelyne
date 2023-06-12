const ErrorHandler = require("../../utils/errorHandler")
const catchAsyncError = require("../../utils/catchAsyncError")
const getFormattedQuery = require("../../utils/apiFeatures");
const { orderModel, orderItemModel } = require("./order.model");
const warehouseModel = require("../warehouse/warehouse.model");
const { userModel } = require("../user/user.model");
const { transactionModel } = require("../transaction/transaction.model");
const { Op } = require("sequelize");

const includeItems = {
	model: orderItemModel,
	as: "items",
	attributes: ["id", "name", "quantity"],
};
const includeWarehouse = {
	model: warehouseModel,
	as: "warehouse",
	attributes: ["id", "name"],
};
const includeUser = {
	model: userModel,
	as: "user",
	attributes: ["id", "fullname", "avatar"],
};

const includeTransaction = {
	model: transactionModel,
	as: "transaction",
	attributes: { exclude: ["orderId"] }
};

const includeOptions = (isIncludeUser = false) => {
	if (isIncludeUser) return [includeItems, includeWarehouse, includeUser];

	return [includeItems, includeUser, includeWarehouse, includeTransaction];
}

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
		include: includeOptions(true),
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
	let options = includeOptions(true);
	console.log({ user });
	if (!user || user?.userRole?.role === 'user') {
		console.log(!user)
		query.where = {
			...query.where,
			userId: req.userId
		}
		options = includeOptions();
	};

	console.log(JSON.stringify(query));

	const { counts, total: orderCount } = await orderModel.getCounts(query.where);

	console.log({ options })
	const orders = await orderModel.findAll({
		...query,
		include: options,
		attributes: {
			exclude: ["warehouseId", "userId"]
		},
		order: [['createdAt', 'DESC']]
	});

	res.status(200).json({ orders, orderCount, counts });
})

exports.getOrder = catchAsyncError(async (req, res, next) => {
	console.log("get Order");
	const { id } = req.params;

	const user = req.user;
	let query = { where: { id } };
	let options = includeOptions(true);
	if (!user || user?.userRole?.role === 'user') {
		query.where = {
			...query.where,
			userId: req.userId
		}
		options = includeOptions();
	};

	console.log({ options });
	const order = await orderModel.findOne({
		...query,
		include: options,
		attributes: {
			exclude: ["warehouseId", "userId"]
		}
	});
	if (!order) return next(new ErrorHandler("Order not found", 404));

	console.log({ order })
	res.status(200).json({ order });
})

exports.updateOrder = catchAsyncError(async (req, res, next) => {
	console.log("update Order", req.body);
	const { id } = req.params;

	const [isUpdated] = await orderModel.update(req.body, {
		where: { id },
	});

	if (isUpdated === 0) return next(new ErrorHandler("Order not found.", 404));

	res.status(200).json({ message: "Order updated successfully.", isUpdated });
})

exports.deleteOrder = catchAsyncError(async (req, res, next) => {
	const { id } = req.params;
	const isDeleted = await orderModel.destroy({ where: { id } });
	if (isDeleted === 0) return next(new ErrorHandler("Order not found.", 404));

	res.status(200).json({ message: "Order Deleted Successfully.", isDeleted });
})

exports.addOrderItem = catchAsyncError(async (req, res, next) => {
	console.log("add order item", req.body);
	const { id } = req.params;
	const { items } = req.body;

	if (!items || items.length === 0) {

	}
	items.forEach(item => { item.orderId = id; });
	console.log(items);
	const added_items = await orderItemModel.bulkCreate(items);
	res.status(201).json({
		items: added_items,
		message: "Items added successfully."
	})
})

exports.UpdateOrderItem = catchAsyncError(async (req, res, next) => {
	console.log("update order item", req.body);
	const { id, item } = req.params;

	console.log({ id, item });
	console.log(await orderItemModel.findByPk(item));
	const [isUpdated] = await orderItemModel.update(req.body, {
		where: { [Op.and]: { orderId: parseInt(id), id: parseInt(item) } }
	});

	if (isUpdated === 0) return next(new ErrorHandler("Order Item not found.", 404));

	res.status(200).json({ message: "Order Item updated successfully.", isUpdated });
})

exports.deleteOrderItem = catchAsyncError(async (req, res, next) => {
	const { id, item } = req.params;
	const isDeleted = await orderItemModel.destroy({ where: { [Op.and]: { orderId: id, id: item } } });

	console.log({ isDeleted });
	if (isDeleted === 0)
		return next(new ErrorHandler("Order Item not found.", 404));

	res.status(200).json({ message: "Order Item Deleted Successfully.", isDeleted });
})