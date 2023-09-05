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
					if(!isDeleted) {
						await transaction.rollback();
						return next(new ErrorHandler("Bad Request", 400));
					}
					console.log({ isDeleted });
				} else {
					const [isUpdated] = await orderItemModel.update({ quantity: keep }, {
						where: { [Op.and]: { orderId: parentId, id } }
					}, { transaction });

					if(!isUpdated) {
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
				where: { userId, ...query.where },
				include: includeOptions(false),
				attributes: { exclude: ["warehouseId", "userId"] },
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

	let options = includeOptions(false);
	if (user.userRole.role === 'user') {
		options = includeOptions();
		var order = await orderModel.findOne({
			where: { id, userId },
			include: includeOptions(),
			attributes: { exclude: ["userId", "warehouseId"] }
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

const saveTrackTime = (order, newStatus) => {
	console.log({ order: order.toJSON(), newStatus })
	switch (newStatus) {
		case "in-bound":
			order.arrival_date = new Date();
			break;
		case "out-bound":
			order.trans_date = new Date();
			break;
		case "exit":
			order.exit_date = new Date();
			break;
	}
	console.log("afeter", { order: order.toJSON(), newStatus })
};

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

exports.updateOrderStatus = catchAsyncError(async (req, res, next) => {
	console.log("change status", req.body);
	const { id } = req.params;
	const userId = req.userId;
	const { status, manager_valid } = req.body;

	const texts = {
		"arrived": `Order number ${id} Status updated from Arrived to In-bound`,
		"in-bound": `Order number ${id} Status updated from In-bound to Out-bound`,
		"out-bound": `Your order number ${id} is ready to dispatch. Soon this order will be dispatched.`
	};

	const order = await orderModel.findByPk(id);
	if (!order) return next(new ErrorHandler("Order not found.", 404));

	const currentStatus = order.status;
	const newStatus = await order.nextStatus();

	console.log({ manager_valid, status, newStatus, currentStatus })
	if (!newStatus) {
		return next(new ErrorHandler("Bad Request", 400));
	}

	const userNotiText = texts[currentStatus];
	var managerNotiText = newStatus === 'exit' ? `You have approved the order ${id} for exit.` : texts[currentStatus];

	// CASE - when only order status is to be updated
	if (status) {
		/**
		 * currentStatus - current status of the order
		 * status - new order status from frontend
		 * newStatus - new order status evaluated 
		 * if both status and new status is not equal then there will be no status update
		 */
		if (status !== newStatus)
			return next(new ErrorHandler(`Status can't be updated from ${currentStatus} to ${status}`, 400));

		await generateNotification(userNotiText, managerNotiText, order, userId);
		// other we update the status
		order.status = newStatus;
		saveTrackTime(order, newStatus);
	}

	// CASE - when manager is approving 
	if (manager_valid) {
		/**
		 * We check the new status
		 * if it is `exit` that means now manager has done all approval except for the last (for exit).
		 * to approve this client_valid field must be true.
		 */
		if (newStatus === "exit") {
			// either already approved
			if (order.manager_valid)
				return next(new ErrorHandler("Already approved.", 400));

			// not approved then check client has approved or not
			console.log(order.dataValues, order.client_valid, "client valid")
			if (!order.client_valid)
				return next(new ErrorHandler("Can't be approved as client hasn't approved.", 400));

			// otherwise we update the manager_valid field to true and also create notifications.
			saveTrackTime(order, newStatus);
			order.manager_valid = true;
		}
		// if it is not exit we update the status
		else {
			saveTrackTime(order, newStatus);
			order.status = newStatus;
		}

		await generateNotification(userNotiText, managerNotiText, order, userId);
	}

	// after everystep is okay we save the order.
	await order.save();

	res.status(200).json({ message: managerNotiText });
});

exports.clientValidation = catchAsyncError(async (req, res, next) => {
	const { id } = req.params;
	const userId = req.userId;

	const order = await orderModel.findOne({
		where: { userId, id },
		include: [{
			model: warehouseModel,
			as: "warehouse",
			include: [{
				model: userModel,
				as: "manager",
			}]
		}]
	});
	if (!order) return next(new ErrorHandler("Order not found."));

	if (order.client_valid)
		return next(new ErrorHandler("Already Approved.", 400));

	console.log({ order })
	order.client_valid = true;
	await order.save();

	await generateNotification(
		`You have approved for the exit of order ${id}`,
		`Client has approved for the exit of  order ${id}`,
		order,
		order.warehouse?.manager?.id
	);

	res.status(200).json({ message: `You have approve order ${id} for exit from warehouse.` });
});

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



