const ErrorHandler = require("../../utils/errorHandler")
const catchAsyncError = require("../../utils/catchAsyncError")
const getFormattedQuery = require("../../utils/apiFeatures");
const warehouseModel = require("./warehouse.model");
const { userModel, roleModel } = require("../user/user.model");
const { orderModel, orderItemModel } = require("../order/order.model");
const { transactionModel } = require("../transaction/transaction.model");
const { Op } = require("sequelize");
const { db } = require("../../config/database");

const includeOptions = [{
	model: userModel,
	as: "manager",
	attributes: ["id", "fullname"],
}];

exports.createWarehouse = catchAsyncError(async (req, res, next) => {
	console.log("create warehouse", req.body);

	const warehouse = await warehouseModel.create(req.body);

	res.status(201).json({ warehouse });
})

exports.getAllWarehouse = catchAsyncError(async (req, res, next) => {
	console.log(req.query);
	const query = getFormattedQuery("name", req.query);
	console.log(JSON.stringify(query));
	const warehouses = await warehouseModel.findAll({
		...query,
		include: [...includeOptions, {
			model: userModel,
			as: "controller",
			attributes: ["id", "fullname"],
			through: { attributes: [] }
		}],
		attributes: { exclude: ["controllerId", "managerId"] },
		order: [['createdAt', 'DESC']]
	});
	res.status(200).json({ warehouses, warehousesCount: warehouses.length });
})

exports.getWarehouse = catchAsyncError(async (req, res, next) => {
	console.log("get warehouse");
	const { id } = req.params;
	const warehouse = await warehouseModel.findByPk(id, {
		include: [...includeOptions, {
			model: userModel,
			as: "controller",
			attributes: ["id", "fullname"],
			through: { attributes: [] }
		}],
		attributes: { exclude: ["controllerId", "managerId"] }
	});
	if (!warehouse) return next(new ErrorHandler("Warehouse not found", 404));

	res.status(200).json({ warehouse });
})

exports.updateWarehouse = catchAsyncError(async (req, res, next) => {
	console.log("update warehouse", req.body);
	const { id } = req.params;

	const [isUpdated] = await warehouseModel.update(req.body, {
		where: { id },
	});

	if (isUpdated === 0) return next(new ErrorHandler("Warehouse not found.", 404));

	res.status(200).json({ message: "Warehouse updated successfully.", isUpdated });
})

exports.deleteWarehouse = catchAsyncError(async (req, res, next) => {
	const { id } = req.params;
	const warehouse = await warehouseModel.destroy({ where: { id } });
	if (warehouse === 0) return next(new ErrorHandler("Warehouse not found.", 404));

	res.status(200).json({ message: "Warehouse Deleted Successfully.", warehouse });
})

exports.myWarehouse = catchAsyncError(async (req, res, next) => {
	console.log("my warehouse/s");
	const userId = req.userId;
	const handler = await userModel.getHandler(userId, next);

	switch (handler.userRole.role) {
		case "controller":
			const { id } = req.query;
			if (id) {
				return res.status(200).json({
					warehouse: (await handler.getWarehouses({
						joinTableAttributes: [],
						include: includeOptions,
						where: { id },
						attributes: { exclude: ['managerId'] }
					}))[0] || null
				});
			}
			return res.status(200).json({
				warehouses:
					await handler.getWarehouses({
						joinTableAttributes: [],
						include: includeOptions,
						attributes: { exclude: ["managerId"] }
					})
			});

		case "manager":
			return res.status(200).json({
				warehouse:
					await handler.getWarehouse({
						attributes: ["id", "name", "image", "capacity", "filled"]
					})
			});

		default:
			return next(new ErrorHandler("Invalid manager/controller.", 400));
	}
})

exports.housesAndOrderCount = catchAsyncError(async (req, res, next) => {
	const userId = req.userId;
	const handler = await userModel.getHandler(userId, next);
	const warehouses = await handler.getWarehouses({
		joinTableAttributes: [],
		include: [{
			model: userModel,
			as: 'manager',
			attributes: ['id', 'fullname']
		}],
		attributes: { exclude: ["managerId"] }
	});

	const housesAndOrderCounts = await Promise.all(warehouses.map(async (warehouse) => {
		const { counts, total } = await orderModel.getCounts({ warehouseId: warehouse.id });

		return { warehouse, total, counts };
	}));

	res.json({ housesAndOrderCounts });
})

exports.getWarehouseOrder = catchAsyncError(async (req, res, next) => {
	const userId = req.userId;
	const handler = await userModel.getHandler(userId, next);

	let orders;
	switch (handler.userRole.role) {
		case "controller":
			const { warehouseId } = req.query;
			const warehouse = await warehouseModel.findByPk(warehouseId, {
				include: [{
					model: userModel,
					as: "manager",
					attributes: ["id", "fullname"]
				}],
				attributes: { exclude: ["managerId"] }
			});

			orders = await orderModel.warehouseOrders(warehouseId);

			return res.json({ warehouse, orders });

		case "manager":
			const wId = (await handler.getWarehouse())?.id;
			if (!wId) return next(new ErrorHandler("Warehouse not assigned.", 400));

			orders = await orderModel.warehouseOrders(wId, req.query.status);

			return res.status(200).json({ orders, image: "https://cdn0.iconfinder.com/data/icons/containers/512/palet03.png" });

		default:
			return next(new ErrorHandler("Invalid manager/controller.", 400));
	}
})

exports.warehouseAndAllOrders = catchAsyncError(async (req, res, next) => {
	console.log("get warehouse orders");
	const userId = req.userId;
	const handler = await userModel.getHandler(userId, next);

	const warehouses = await handler.getWarehouses({
		joinTableAttributes: [],
		include: [{
			model: userModel,
			as: "manager",
			attributes: ["id", "fullname"]
		}],
		attributes: { exclude: ["managerId"] }
	});

	const orderList = [];
	for (const warehouse of warehouses) {
		console.log({ warehouse });
		const orders = await orderModel.warehouseOrders(warehouse.id);
		console.log({ orders });
		for (const order of orders) {
			console.log({ order });
			orderList.push({
				...order.dataValues,
				houseName: warehouse.name,
				houseManager: warehouse.manager?.fullname,
				houseImage: warehouse.image,
			});
		}
	}

	return res.status(200).json({ orders: orderList });
})

exports.housesAndTransactionCount = catchAsyncError(async (req, res, next) => {
	const userId = req.userId;
	const handler = await userModel.getHandler(userId, next);
	const warehouses = await handler.getWarehouses({
		joinTableAttributes: [],
		include: [{
			model: userModel,
			as: 'manager',
			attributes: ['id', 'fullname']
		}],
		attributes: { exclude: ["managerId"] }
	});

	const housesAndTransCount = await Promise.all(warehouses.map(async (warehouse) => {
		const { counts, total } = await transactionModel.getCounts({ warehouseId: warehouse.id });

		return { warehouse, total, counts };
	}));

	res.json({ housesAndTransCount });
})

exports.getWarehouseTransaction = catchAsyncError(async (req, res, next) => {
	console.log("get warehouse transaction");
	const userId = req.userId;
	const handler = await userModel.getHandler(userId, next);

	let transactions;
	switch (handler.userRole.role) {
		case "controller":
			const { warehouseId } = req.query;
			const warehouse = await warehouseModel.findByPk(warehouseId, {
				include: [{
					model: userModel,
					as: "manager",
					attributes: ["id", "fullname"]
				}],
				attributes: { exclude: ["managerId"] }
			});

			transactions = await transactionModel.warehouseTrans(warehouseId);
			return res.status(200).json({ warehouse, transactions });

		case "manager":
			const wId = (await handler.getWarehouse())?.id;
			if (!wId) return next(new ErrorHandler("Warehouse not assigned.", 400));

			transactions = await transactionModel.warehouseTrans(wId);
			return res.status(200).json({ transactions });

		default:
			return next(new ErrorHandler("Invalid manager/controller.", 400));
	}
})

exports.assignHandler = catchAsyncError(async (req, res, next) => {
	console.log("assign handler", req.body);
	const { warehouse, warehouses, controllerId, managerId, controllers, warehouseId } = req.body;

	if (controllerId) {
		const controller = await userModel.getHandler(controllerId, next);

		console.log({ controller });
		if (controller.userRole.role !== "controller") return next(new ErrorHandler("Invalid Controller.", 400));

		const something = await controller.addWarehouses(warehouses);
		console.log({ something })
	}
	else if (managerId) {
		console.log(req.body);
		const manager = await userModel.getHandler(managerId, next);

		if (manager.userRole.role !== "manager") return next(new ErrorHandler("Invalid Manager.", 400));

		const warehouse_ = await warehouseModel.findByPk(warehouse);
		if (!warehouse_) return next(new ErrorHandler("Warehouse not found.", 404));

		warehouse_.managerId = managerId;
		await warehouse_.save();
	}
	else if (warehouseId) {
		const house = await warehouseModel.findByPk(warehouseId);
		if (!house) return next(new ErrorHandler("Warehouse not found.", 404));

		const assign = await house.addController(controllers);
		console.log({ assign })
	}
	else return next(new ErrorHandler("Something went wrong", 500));

	res.status(200).json({ message: "Warehouse updated successfully" });
});

exports.removeHandler = catchAsyncError(async (req, res, next) => {
	console.log("remove handler", req.body);
	const { controllerId, managerId, warehouseId } = req.body;

	let isRemoved;
	if (controllerId) {
		const controller = await userModel.getHandler(controllerId, next);
		if (!controller) return next(new ErrorHandler("Controller not found.", 404));

		console.log({ controller });
		if (controller.userRole.role !== "controller") return next(new ErrorHandler("Invalid Controller.", 400));

		isRemoved = await controller.removeWarehouse(warehouseId);
		console.log({ isRemoved })
		res.status(200).json({ isRemoved, message: "Controller removed succesfully." });
	}
	else if (managerId) {
		console.log(req.body);
		const manager = await userModel.getHandler(managerId, next);
		if (!manager) return next(new ErrorHandler("Manager not found.", 404));

		if (manager.userRole.role !== "manager") return next(new ErrorHandler("Invalid Manager.", 400));

		isRemoved = await manager.setWarehouse(null);
		res.status(200).json({ isRemoved, message: "Manager removed succesfully." });
	}
	else return next(new ErrorHandler("Something went wrong", 500));
});