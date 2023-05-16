const ErrorHandler = require("../../utils/errorHandler")
const catchAsyncError = require("../../utils/catchAsyncError")
const getFormattedQuery = require("../../utils/apiFeatures");
const warehouseModel = require("./warehouse.model");
const { orderModel } = require("../order");
const { userModel } = require("../user");

exports.createWarehouse = catchAsyncError(async (req, res, next) => {
    console.log("create warehouse", req.body);
    const { name, capacity, curr_capacity, userId: user_id } = req.body;

    if (!user_id) return next(new ErrorHandler("Please provide the userId", 400));

    const user = await userModel.findByPk(user_id);
    if (!user) return next(new ErrorHandler("User not found", 404));

    console.log({ user })
    const warehouse = await warehouseModel.create({ name, capacity, curr_capacity, userId: user.id });
    res.status(201).json({ warehouse });
})

exports.getAllWarehouse = catchAsyncError(async (req, res, next) => {
    console.log(req.query);
    const query = getFormattedQuery("name", req.query);
    console.log(JSON.stringify(query));
    const { rows, count } = await warehouseModel.findAndCountAll({
        ...query,
        include: [{ model: userModel, as: "managed_by" }],
        attributes: {
            exclude: "userId",
        }
    });
    res.status(200).json({ warehouses: rows, warehousesCount: count });
})

exports.getWarehouse = catchAsyncError(async (req, res, next) => {
    console.log("get warehouse");
    const { id } = req.params;
    const warehouse = await warehouseModel.findByPk(id, {
        include: [{ model: userModel, as: "managed_by" }],
        attributes: {
            exclude: "userId",
        }
    });
    if (!warehouse) return next(new ErrorHandler("Warehouse not found", 404));

    res.status(200).json({ warehouse });
})

exports.updateWarehouse = catchAsyncError(async (req, res, next) => {
    console.log("update warehouse", req.body);
    const { id } = req.params;

    const [_, warehouse] = await warehouseModel.update(req.body, {
        where: { id },
        returning: true,
    });

    console.log(_, warehouse)
    if (warehouse === 0) return next(new ErrorHandler("Warehouse not found.", 404));

    res.status(200).json({ message: "Warehouse updated successfully.", warehouse });
})

exports.deleteWarehouse = catchAsyncError(async (req, res, next) => {
    const { id } = req.params;
    const warehouse = await warehouseModel.destroy({ where: { id } });
    if (warehouse === 0) return next(new ErrorHandler("Warehouse not found.", 404));

    res.status(200).json({ message: "Warehouse Deleted Successfully.", warehouse });
})

exports.warehouseOrder = catchAsyncError(async (req, res, next) => {
    const { id } = req.params;
    const userId = req.userId;
    const orders = await warehouseModel.findOne({
        where: { id, userId },
        include: [{
            model: orderModel,
            as: "orders"
        }]
    })
})