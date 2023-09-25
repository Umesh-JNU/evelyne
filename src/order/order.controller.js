const ErrorHandler = require("../../utils/errorHandler")
const catchAsyncError = require("../../utils/catchAsyncError")
const getFormattedQuery = require("../../utils/apiFeatures");
const { db } = require("../../config/database");
const { orderModel, orderItemModel, includeCountAttr } = require("./order.model");
const warehouseModel = require("../warehouse/warehouse.model");
const { userModel } = require("../user/user.model");
const { transactionModel } = require("../transaction/transaction.model");
const { Op } = require("sequelize");
const { notificationModel } = require("../notifications");

const includeItems = {
	model: orderItemModel,
	as: "items",
	attributes: ["id", "name", "quantity"],
};
const includeWarehouse = {
	model: warehouseModel,
	as: "warehouse",
	attributes: ["id", "name", "image"],
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

const includeOptions = (isIncludeTrans = true) => {
	if (isIncludeTrans) return [includeItems, includeWarehouse, includeUser, includeTransaction];

	return [includeItems, includeUser, includeWarehouse];
}

const generateNotification = async (userNotiText, managerNotiText, order, managerId) => {
	// for user
	await notificationModel.create({
		text: userNotiText,
		userId: order.userId,
		orderId: order.id
	});

	// for manager
	await notificationModel.create({
		text: managerNotiText,
		userId: managerId,
		orderId: order.id
	});

};

exports.createOrder = catchAsyncError(async (req, res, next) => {
	console.log("create Order", req.body);
	const { warehouse, user, items, parentId } = req.body;

	if (!items || items.length === 0) return next(new ErrorHandler("Please provide at least one product.", 400));

	const warehouse_ = await warehouseModel.findByPk(warehouse);
	if (!warehouse_) return next(new ErrorHandler("No such warehouse exists.", 404));

	const user_ = await userModel.findByPk(user);
	if (!user_) return next(new ErrorHandler("User not found.", 404));

	let transaction;

	try {
		// start
		transaction = await db.transaction();

		let order = await orderModel.create(req.body, { transaction });

		if (parentId) {
			for (let i = 0; i < items.length; i++) {
				const { id, keep, out, name } = items[i];
				console.log({ i: items[i], id, keep, out, name })
				if (keep === 0) {
					const isDeleted = await orderItemModel.destroy({ where: { [Op.and]: { orderId: parentId, id } } }, { transaction });
					if (!isDeleted) {
						await transaction.rollback();
						return next(new ErrorHandler("Bad Request", 400));
					}
					console.log({ isDeleted });
				} else {
					const [isUpdated] = await orderItemModel.update({ quantity: keep }, {
						where: { [Op.and]: { orderId: parentId, id } }
					}, { transaction });

					if (!isUpdated) {
						await transaction.rollback();
						return next(new ErrorHandler("Bad Request", 400));
					}
				}

				await orderItemModel.create({ name, quantity: out, orderId: order.id }, { transaction });
			}
		} else {
			items.forEach((item) => { item.orderId = order.id; });
			await orderItemModel.bulkCreate(items, { transaction });
		}

		await warehouse_.addOrder(order, { transaction });
		await user_.addOrder(order, { transaction });

		// Commit the transaction
		await transaction.commit();

		order = await orderModel.findByPk(order.id, {
			include: includeOptions(false),
			attributes: {
				exclude: ["warehouseId", "userId"],
			},
		});

		// generate notice for partial out-bound
		// if (parentId) {
		// 	await generateNotification(
		// 		`Partial Out-Bound Order is created from order ${parentId} to order ${order.id}. Waiting for manager approval.`,
		// 		`Partial Out-Bound Order is created from order ${parentId} to order ${order.id}.`,
		// 		order,
		// 		req.userId)
		// }
		res.status(201).json({ order });
	} catch (error) {
		// Rollback the transaction if an error occurs
		if (transaction) await transaction.rollback();
		return next(new ErrorHandler(error.message, 500));
	}
});

exports.getAllOrder = catchAsyncError(async (req, res, next) => {
	console.log(req.query);
	const query = getFormattedQuery("id", req.query);

	const userId = req.userId;
	const user = await userModel.getHandler(userId, next);

	switch (user.userRole.role) {
		case "admin":
			var { counts, total: orderCount } = await orderModel.getCounts(query.where);
			var orders = await orderModel.findAll({
				where: { ...query.where },
				include: includeOptions(),
				attributes: { exclude: ["warehouseId", "userId"] },
				order: [['createdAt', 'DESC']]
			});
			return res.status(200).json({ orders, counts, orderCount });

		case "user":
			console.log("in user");
			var { counts } = await orderModel.getCounts({ userId });
			var orders = await orderModel.findAll({
				where: { userId, ...query.where, status: { [Op.ne]: "out-bound" } },
				include: [includeItems],
				attributes: ["id", "status", "createdAt"],
				// { exclude: ["warehouseId", "userId"] },
				order: [['createdAt', 'DESC']]
			});
			console.log({ counts, orders });
			return res.status(200).json({ orders, counts });

		case "manager":
			const wId = (await user.getWarehouse()).id;
			var { counts } = await orderModel.getCounts({ warehouseId: wId });
			return res.status(200).json({ ...counts });

		// case "controller":		
		default:
			return next(new ErrorHandler("Bad Request", 400));
	}
})

exports.getOrder = catchAsyncError(async (req, res, next) => {
	console.log("get Order");
	const { id } = req.params;
	const userId = req.userId;
	const user = await userModel.getHandler(userId);

	if (user.userRole.role === 'user') {
		var order = await orderModel.findOne({
			where: { id, userId },
			include: includeOptions(),
			attributes: { exclude: ["userId", "warehouseId"] }
		});
	}
	else if (user.userRole.role === 'controller') {
		var order = await orderModel.findByPk(id, {
			include: [
				includeItems,
				includeUser, {
					model: warehouseModel,
					as: "warehouse",
					attributes: ["id", "name", "image"],
					include: {
						model: userModel,
						as: 'manager',
						attributes: ['id', 'fullname']
					}
				}],
			attributes: {
				include: includeCountAttr,
				exclude: ["userId", "warehouseId"]
			}
		});
	}
	else {
		var order = await orderModel.findByPk(id, {
			include: includeOptions(false),
			attributes: {
				include: includeCountAttr,
				exclude: ["userId", "warehouseId"]
			}
		});
	}

	if (!order) {
		return next(new ErrorHandler("Order Not Found", 404));
	}

	const outBound = await orderModel.findAll({
		where: { parentId: id },
		include: [includeItems],
		attributes: ['id', 'createdAt']
	});

	res.status(200).json({ order, outBound });
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


exports.updateOrderStatus = catchAsyncError(async (req, res, next) => {
	console.log("change status", req.body);
	const { id } = req.params;
	const userId = req.userId;

	const texts = {
		"arrived": `Order number ${id} Status updated from Arrived to In-bound.`,
		"in-bound": `Order number ${id} Status updated from In-bound to Out-bound.`,
		"out-bound": `Order number ${id} is approved for exit. Soon this order will be dispatched.`,
		"in-tranship": `Order number ${id} is approved for transhipment.`
	};

	const order = await orderModel.findByPk(id);
	if (!order) return next(new ErrorHandler("Order not found.", 404));

	const curStatus = order.status;
	const curDateTime = new Date();
	switch (curStatus) {
		case "arrived":
			order.arrival_date = curDateTime;
			order.status = "in-bound";
			break;

		case "in-bound":
			order.inbound_date = curDateTime;
			order.status = "out-bound";
			break;

		case "out-bound":
			// if(!order.parentId && !order.client_valid) {
			// 	return next(new ErrorHandler("Can't be approved as client's validation is pending. Please wait.", 400));
			// }
			order.exit_date = curDateTime;
			order.status = "exit";
			break;

		case "in-tranship":
			order.trans_date = curDateTime;
			order.status = "out-tranship";
			break;

		default:
			return next(new ErrorHandler("Bad Request", 400));
	}

	if (curStatus !== "in-bound") {
		await generateNotification(texts[curStatus], texts[curStatus], order, userId);
	}
	await order.save();
	res.status(200).json({ message: texts[curStatus] });
});

// exports.clientValidation = catchAsyncError(async (req, res, next) => {
// 	const { id } = req.params;
// 	const userId = req.userId;

// 	const order = await orderModel.findOne({
// 		where: { userId, id },
// 		include: [{
// 			model: warehouseModel,
// 			as: "warehouse",
// 			include: [{
// 				model: userModel,
// 				as: "manager",
// 			}]
// 		}]
// 	});
// 	if (!order) return next(new ErrorHandler("Order not found."));

// 	if (order.client_valid)
// 		return next(new ErrorHandler("Already Approved.", 400));

// 	console.log({ order })
// 	order.client_valid = true;
// 	await order.save();

// 	await generateNotification(
// 		`You have approved for the exit of order ${id}`,
// 		`Client has approved for the exit of  order ${id}`,
// 		order,
// 		order.warehouse?.manager?.id
// 	);

// 	res.status(200).json({ message: `You have approve order ${id} for exit from warehouse.` });
// });

exports.addOrderItem = catchAsyncError(async (req, res, next) => {
	console.log("add order item", req.body);
	const { id } = req.params;
	const { items } = req.body;

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



