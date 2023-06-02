const ErrorHandler = require("../../utils/errorHandler")
const catchAsyncError = require("../../utils/catchAsyncError")
const getFormattedQuery = require("../../utils/apiFeatures");
const warehouseModel = require("./warehouse.model");
const { userModel } = require("../user/user.model");
const { orderModel, orderItemModel, subQueryAttr } = require("../order/order.model");
const { db } = require("../../config/database");
const { Op } = require("sequelize");
const transactionModel = require("../transaction/transaction.model");

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

const getManager = async (userId, next) => {
	const manager = await userModel.findByPk(userId, {
		include: [{
			model: warehouseModel,
			as: "warehouse",
			attributes: ["id"]
		}],
	})

	if (!manager) return next(new ErrorHandler("Manager not found.", 404));

	if (!manager.warehouse) return next(new ErrorHandler("No warehouse assigned", 200));

	return manager;
}

exports.myWarehouse = catchAsyncError(async (req, res, next) => {
	const userId = req.userId;
	const manager = await getManager(userId, next);

	const warehouse = await warehouseModel.findByPk(manager.warehouse.id, {
		attributes: { exclude: ["controllerId", "managerId"] }
	});
	if (!warehouse) return next(new ErrorHandler("Warehouse not found", 404));

	res.status(200).json({ warehouse });
})

exports.getWarehouseOrder = catchAsyncError(async (req, res, next) => {
	console.log("get warehouse orders");
	const userId = req.userId;
	const manager = await getManager(userId, next);

	let whereQuery = { warehouseId: manager.warehouse.id };

	const counts = await orderModel.getCounts(whereQuery);
	console.log({ counts });

	const orders = await orderModel.findAll({
		where: whereQuery,
		attributes: subQueryAttr,
		include: [{
			model: orderItemModel,
			as: "items",
			attributes: ["id", "name", "quantity"]
		}]
	})

	res.status(200).json({ orders, counts });
})

exports.getWarehouseTransaction = catchAsyncError(async (req, res, next) => {
	console.log("get warehouse transaction");
	const userId = req.userId;
	const manager = await getManager(userId, next);

	let whereQuery = { warehouseId: manager.warehouse.id };

	const transactions = await transactionModel.findAll({
		include: [{
			model: orderModel,
			as: "order",
			attributes: ["id", "status"],
			where: whereQuery,
			include: [{
				model: userModel,
				as: "user",
				attributes: ["id", "fullname"]
			}]
		}],
		attributes: {
			exclude: ["orderId"]
		}
	})

	res.status(200).json({ transactions });
})

exports.assignHandler = catchAsyncError(async (req, res, next) => {
	console.log("assign handler", req.body);
	const { warehouse, warehouses, controllerId, managerId } = req.body;

	if (controllerId) {
		const controller = await userModel.findByPk(controllerId);
		if (!controller) return next(new ErrorHandler("Controller not found.", 404));

		const something = await controller.addWarehouses(warehouses);
		console.log({ something })
	}
	else if (managerId) {
		const manager = await userModel.findByPk(managerId);
		if (!manager) return next(new ErrorHandler("Manager not found.", 404));

		const warehouse_ = await warehouseModel.findByPk(warehouse);
		if (!warehouse_) return next(new ErrorHandler("Warehouse not found.", 404));

		warehouse_.managerId = managerId;
		await warehouse_.save();
	}
	else return next(new ErrorHandler("Something went wrong", 500));

	res.status(200).json({ message: "Warehouse updated successfully" });
});