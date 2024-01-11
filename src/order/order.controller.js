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
	attributes: ["id", "name", "quantity", "weight", "value", "local_val", "itemId"],
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

const generateNotification = async (userNotiText, managerNotiText, order, managerId, title) => {
	// for user
	await notificationModel.create({
		text: userNotiText,
		userId: order.userId ? order.userId : order.user.id,
		orderId: order.id,
		title
	});

	// for manager
	await notificationModel.create({
		text: managerNotiText,
		userId: managerId,
		orderId: order.id,
		title
	});
};

const getFilledWarehouse = async (wID) => {
	const items = await orderItemModel.findAll({
		include: [
			{
				model: orderModel,
				as: "order",
				where: {
					warehouseId: wID,
					// [Op.or]: [{ status: 'in-bound' }, { status: 'out-bound' }]
					status: 'in-bound'
				},
				attributes: []
			}
		]
	});

	return items.reduce((t, i) => { return t + i.quantity * i.value; }, 0);
};

exports.createOrder = catchAsyncError(async (req, res, next) => {
	console.log("create Order", req.body, "manager", req.userId);
	const { warehouse, user, items, parentId, orderType } = req.body;

	if (!parseInt(warehouse)) {
		return next(new ErrorHandler("Invalid warehouse Id.", 400));
	}
	if (!parseInt(user)) {
		return next(new ErrorHandler("Invalid user Id.", 400));
	}
	if (parentId && !parseInt(parentId)) {
		return next(new ErrorHandler("Invalid parent order Id.", 400));
	}
	if (!items || items.length === 0) return next(new ErrorHandler("Please provide at least one product.", 400));

	const warehouse_ = await warehouseModel.findByPk(warehouse);
	if (!warehouse_) return next(new ErrorHandler("No such warehouse exists.", 404));

	const user_ = await userModel.findByPk(user);
	if (!user_) return next(new ErrorHandler("User not found.", 404));

	let transaction, order;

	try {
		// start
		transaction = await db.transaction();

		if (parentId) {
			const parentOrder = await orderModel.findOne({
				where: { id: parentId, status: 'in-bound' },
				// include: includeItems,
				attributes: { include: includeCountAttr }
			});
			if (!parentOrder) {
				await transaction.rollback();
				return next(new ErrorHandler("Bad Request. No Parent Order", 400));
			}

			const numItems = parentOrder.get('itemCount');
			const ttlQty = parseInt(parentOrder.get('totalWeight'));
			console.log({ parentOrder })
			if (!req.body.exit_date) {
				return next(new ErrorHandler("Exit Date is required.", 400));
			}

			// CREATED SUB_ORDER 
			order = await orderModel.create({ ...req.body, status: 'out-bound', }, { transaction });

			switch (orderType) {
				case 'complete':
					// ------------ UPDATING PARENT ORDER START ------------------
					const [updatedOrder] = await orderModel.update(
						{ status: 'out-bound', exit_date: req.body.exit_date },
						{ where: { id: parentId, status: 'in-bound' }, transaction });

					if (!updatedOrder) {
						await transaction.rollback();
						return next(new ErrorHandler("Bad Request", 400));
					}
					// ------------ UPDATING PARENT ORDER END --------------------

					// ------------ CREATING SUB ORDER IIEMS START ---------------------
					for (let i = 0; i < items.length; i++) {
						const { id, quantity, name } = items[i];
						const whereQry = { id, orderId: parentId, quantity };
						console.log({ whereQry });
						const item = await orderItemModel.findOne({ where: whereQry });
						if (!item) {
							await transaction.rollback();
							return next(new ErrorHandler("Bad Request. Item Not Found", 400));
						}

						await orderItemModel.create({
							name,
							quantity,
							value: item.get('value'),
							weight: item.get('weight'),
							local_val: item.get('local_val'),
							itemId: id,
							orderId: order.id,
						}, { transaction });
					}
					// items.forEach((item) => {
					// 	item.quantity = parseInt(item.quantity);
					// 	item.itemId = item.id;
					// 	item.orderId = order.id;
					// });
					// await orderItemModel.bulkCreate(items, { transaction });
					// ------------ CREATING SUB ORDER IIEMS END -----------------------
					break;

				case 'partial':
					console.log("PARTIAL ORDER REQUEST")
					// NOTHING TO DO WITH PARENT ORDER 
					// ONLY UPDATE PARENT ORDER ITEMS AND CREATE ITEMS FOR SUB_ORDER

					// This loop checks for the existence of item 
					// and validate at least one item is out and one item is kept
					console.log({ numItems, itemLen: items.length, ttlQty })
					if (items.length <= numItems) {
						var ttlOut = items.reduce((t, i) => { return t + i.out; }, 0);
						console.log({ ttlOut })
						if (ttlOut === 0) {
							return next(new ErrorHandler("Out Bound At least 1 item.", 400));
						}
						if (ttlOut === ttlQty) {
							return next(new ErrorHandler("All Items can't be out-bound at a time.", 400));
						}
					} else {
						await transaction.rollback();
						return next(new ErrorHandler("Bad Request", 400));
					}

					// return res.json({ ttlOut })
					for (let i = 0; i < items.length; i++) {
						const { id, keep, out, name } = items[i];
						const whereQry = { id, orderId: parentId, quantity: keep + out };
						console.log({ whereQry });
						const item = await orderItemModel.findOne({ where: whereQry });
						if (!item) {
							await transaction.rollback();
							return next(new ErrorHandler("Bad Request. Item Not Found", 400));
						}

						console.log({ i: items[i], id, keep, out, name })
						if (out === 0) {
							await transaction.rollback();
							return next(new ErrorHandler("Out bound quantity can't be 0.", 400));
						};

						// if (keep === 0) {
						// 	const isDeleted = await orderItemModel.destroy({ where: { [Op.and]: { orderId: parentId, id } }, transaction });
						// 	if (!isDeleted) {
						// 		await transaction.rollback();
						// 		return next(new ErrorHandler("Bad Request", 400));
						// 	}
						// 	console.log({ isDeleted });
						// } else {
						// 	const [isUpdated] = await orderItemModel.update({ quantity: keep }, {
						// 		where: { [Op.and]: { orderId: parentId, id } }, transaction
						// 	});

						// 	if (!isUpdated) {
						// 		await transaction.rollback();
						// 		return next(new ErrorHandler("Bad Request", 400));
						// 	}
						// }

						await orderItemModel.create({
							name,
							quantity: out,
							value: item.get('value'),
							weight: item.get('weight'),
							local_val: item.get('local_val'),
							itemId: id,
							orderId: order.id,
						}, { transaction });
					}
					break;

				default:
					console.log("Not partial and complete")
					await transaction.rollback();
					return next(new ErrorHandler("Bad Request", 400));
			}
		}
		else {
			switch (orderType) {
				case 'arrival':
					if (!req.body.arrival_date) {
						return next(new ErrorHandler("Arrival Date is required.", 400));
					}

					const filled = await getFilledWarehouse(warehouse);
					const ttl = items.reduce((t, i) => { return t + parseFloat(i.quantity) * parseFloat(i.value); }, 0);
					console.log({ filled, ttl, cap: warehouse_.get('capacity') });

					if (ttl > warehouse_.get('capacity') - filled) {
						await transaction.rollback();
						return next(new ErrorHandler("Order can't be placed in the given warehouse. Not enough space.", 400));
					};

					var status = 'arrived'

					break;

				case 'tranship':
					if (!req.body.trans_date) {
						return next(new ErrorHandler("Tranship Date is required.", 400));
					}
					var status = 'in-tranship'
					break;

				default:
					console.log("Not Arrival / Tranship - missing parent id")
					return next(new ErrorHandler("Bad Request", 400));
			}

			order = await orderModel.create({ ...req.body, status }, { transaction });

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
		if (orderType === 'arrival' || orderType === 'tranship') {
			await generateNotification(
				`Created new order for goods ${orderType} with order id ${order.id}.`,
				`Created new order for goods ${orderType} with order id ${order.id}.`,
				order,
				req.userId,
				"Created New Order"
			);
		}

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
			query.where.parentId = null;
			console.log({ query }, 1)
			var { counts, total: orderCount } = await orderModel.getCounts(query.where);
			var orders = await orderModel.findAll({
				...query,
				include: includeOptions(),
				attributes: { exclude: ["warehouseId", "userId"] },
				order: [['createdAt', 'DESC']]
			});
			return res.status(200).json({ orders, counts, orderCount });

		case "user":
			console.log("in user");
			var { counts } = await orderModel.getCounts({ userId, parentId: null });
			var orders = await orderModel.findAll({
				where: { userId, ...query.where, status: { [Op.ne]: "out-bound" }, parentId: null },
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
			attributes: {
				include: includeCountAttr,
				exclude: ["userId", "warehouseId"]
			}
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

	const history = await orderModel.findAll({
		where: { parentId: id },
		include: [includeItems],
		attributes: ['id', 'arrival_date', 'exit_date', 'parentId', 'subOrderId', 'orderType', 'status'],
		order: [['subOrderId', 'ASC']]
	});

	res.status(200).json({ order, history });
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
	try {
		// start
		const transaction = await db.transaction();

		await orderItemModel.destroy({ where: { orderId: id }, transaction });

		const isDeleted = await orderModel.destroy({ where: { id }, transaction });
		if (isDeleted === 0) {
			await transaction.rollback();
			return next(new ErrorHandler("Order not found.", 404));
		}

		// Commit the transaction
		await transaction.commit();

		res.status(200).json({ message: "Order Discarded Successfully.", isDeleted });
	} catch (error) {
		// Rollback the transaction if an error occurs
		if (transaction) await transaction.rollback();
		return next(new ErrorHandler(error.message, 500));
	}
})

exports.discardOrder = catchAsyncError(async (req, res, next) => {
	const { id } = req.params;
	const order = await orderModel.findByPk(id);

	order.status = "discarded";
	await order.save();

	await orderModel.update({ status: 'in-bound' }, { where: { id: order.get("parentId") } });

	res.status(200).json({ message: "Order Discarded Successfully." });
});

// exports.updateOrderStatus = catchAsyncError(async (req, res, next) => {
// 	console.log("change status", req.body);
// 	const { id } = req.params;
// 	const userId = req.userId;

// 	const texts = {
// 		"arrived": `Order number ${id} Status updated from Arrived to In-bound.`,
// 		"in-bound": `Order number ${id} Status updated from In-bound to Out-bound.`,
// 		"out-bound": `Order number ${id} is approved for exit. Soon this order will be dispatched.`,
// 		"in-tranship": `Order number ${id} is approved for transhipment.`
// 	};

// 	const order = await orderModel.findByPk(id);
// 	if (!order) return next(new ErrorHandler("Order not found.", 404));

// 	const curStatus = order.status;
// 	const curDateTime = new Date();
// 	let title = '';
// 	switch (curStatus) {
// 		case "arrived":
// 			order.arrival_date = curDateTime;
// 			order.status = "in-bound";
// 			title = "Goods Arrival";
// 			break;

// 		case "in-bound":
// 			order.inbound_date = curDateTime;
// 			order.status = "out-bound";
// 			break;

// 		case "out-bound":
// 			// if(!order.parentId && !order.client_valid) {
// 			// 	return next(new ErrorHandler("Can't be approved as client's validation is pending. Please wait.", 400));
// 			// }
// 			order.exit_date = curDateTime;
// 			order.status = "exit";
// 			title = "Goods "
// 			break;

// 		case "in-tranship":
// 			order.trans_date = curDateTime;
// 			order.status = "out-tranship";

// 			break;

// 		default:
// 			return next(new ErrorHandler("Bad Request", 400));
// 	}

// 	if (curStatus !== "in-bound") {
// 		await generateNotification(texts[curStatus], texts[curStatus], order, userId);
// 	}
// 	await order.save();
// 	res.status(200).json({ message: texts[curStatus] });
// });


const noticeText = (id, type) => {
	return {
		"arrived": `Order number ${id} Status updated from Arrived to In-bound.`,
		"in-bound": `Order number ${id} Status updated from In-bound to Out-bound.`,
		"out-bound": `${type} Order with order number ${id} is approved for exit. Soon this order will be dispatched.`,
		"in-tranship": `Order number ${id} is approved for transhipment.`
	};
};

exports.approveOrder = catchAsyncError(async (req, res, next) => {
	console.log("approve order", req.body);
	const { id } = req.params;
	const userId = req.userId;

	const order = await orderModel.findByPk(id, { include: includeItems });
	if (!order) return next(new ErrorHandler("Order not found.", 404));

	const curStatus = order.status;
	switch (curStatus) {
		case "arrived":
			console.log({ o: order.toJSON() })
			const apprBody = order.toJSON();

			var warehouse = await warehouseModel.findByPk(apprBody.warehouseId);
			const filled = await getFilledWarehouse(apprBody.warehouseId);
			const ttl = apprBody.items.reduce((t, i) => { return t + i.quantity * i.value; }, 0);

			if (ttl > warehouse.get('capacity') - filled) {
				return next(new ErrorHandler("Order can't be placed in the given warehouse. Not enough space.", 400));
			}

			["id", "createdAt", "updatedAt", "items", "parentId", "subOrderId"].forEach((k) => {
				delete apprBody[k];
			})
			console.log({ apprBody, o: order.toJSON() });

			const apprOrder = await orderModel.create({ ...apprBody, parentId: id, warehouseVal: filled });
			const apprItems = [];
			order.items.map(({ name, quantity, value, weight, local_val }) => {
				apprItems.push({ name, quantity, orderId: apprOrder.id, value, weight, local_val });
			});
			await orderItemModel.bulkCreate(apprItems);

			order.status = "in-bound";
			await order.save();

			warehouse.filled = filled + ttl;
			await warehouse.save();

			var msg = noticeText(id)[curStatus];
			await generateNotification(msg, msg, order, userId, "Goods Arrival");
			break;

		case "out-bound":
			// if(!order.parentId && !order.client_valid) {
			// 	return next(new ErrorHandler("Can't be approved as client's validation is pending. Please wait.", 400));
			// }

			{/**
				For out-bound, there will be two cases -
				1. partial out-bound - only suborder status will change on approval. in this status of parent and suborder will be different.
				2. complete out-bound - parent and suborder both status will change on approval
			*/}

			const parentOrder = await orderModel.findByPk(order.parentId);
			if (!parentOrder) {
				return next(new ErrorHandler("Bad Request", 400));
			}

			const items = order.get('items');
			switch (parentOrder.status) {
				case 'in-bound':
					var type = "Partial";
					for (let i in items) {
						const { itemId, quantity, value } = items[i];
						const item = await orderItemModel.findOne({ where: { id: itemId, orderId: order.parentId } });
						if (!item) {
							return next(new ErrorHandler("Item Not Found.", 400));
						}

						if (item.quantity < quantity) {
							return next(new ErrorHandler("Order can't be approved as some of item quantity is more than available quantity.", 400));
						}

						if (item.quantity - quantity === 0) {
							await item.destroy();
						} else {
							item.quantity = item.quantity - quantity;
							await item.save();
						}
						// await orderItemModel.decrement({ quantity }, { where: { id: itemId, orderId: order.parentId } });
					}

					parentOrder.exit_date = order.exit_date;
					await parentOrder.save();
					break;

				case 'out-bound':
					var type = "Complete";
					const isDel = await orderItemModel.destroy({ where: { orderId: order.parentId } });
					if (!isDel) {
						await transaction.rollback();
						return next(new ErrorHandler("Bad Request", 400));
					}
					console.log({ isDel });
					parentOrder.status = 'exit';
					await parentOrder.save();
					break;

				default:
					return next(new ErrorHandler("Bad Request.", 400));
			}

			var warehouse = await warehouseModel.findByPk(order.get('warehouseId'));
			const q = items.reduce((t, i) => { return t + i.quantity * i.value; }, 0);

			var msg = noticeText(order.parentId, type)[curStatus];
			await generateNotification(msg, msg, order, userId, `${type} Goods Exit`);
			// order.exit_date = curDateTime;
			order.status = "exit";
			order.warehouseVal = warehouse.filled;
			await order.save();

			warehouse.filled = warehouse.filled - q;
			await warehouse.save();
			break;

		case "in-tranship":
			var warehouse = await warehouseModel.findByPk(order.get('warehouseId'));
			const qua = items.reduce((t, i) => { return t + i.quantity * i.value; }, 0);
			// order.exit_date = curDateTime;
			order.status = "out-tranship";
			order.warehouseVal = warehouse.filled;

			var msg = noticeText(id)[curStatus];
			await generateNotification(msg, msg, order, userId, "Arrival Transhipment");
			break;

		default:
			return next(new ErrorHandler("Bad Request", 400));
	}

	await order.save();
	res.status(200).json({ message: msg });
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



