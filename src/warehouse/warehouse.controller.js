const ErrorHandler = require("../../utils/errorHandler")
const catchAsyncError = require("../../utils/catchAsyncError")
const getFormattedQuery = require("../../utils/apiFeatures");
const warehouseModel = require("./warehouse.model");
const { orderModel } = require("../order");
const { userModel, roleModel } = require("../user/user.model");

exports.createWarehouse = catchAsyncError(async (req, res, next) => {
    console.log("create warehouse", req.body);

    const warehouse = await warehouseModel.create(req.body);

    res.status(201).json({ warehouse });
})

exports.getAllWarehouse = catchAsyncError(async (req, res, next) => {
    console.log(req.query);
    const query = getFormattedQuery("name", req.query);
    console.log(JSON.stringify(query));
    const { rows, count } = await warehouseModel.findAndCountAll({
        ...query,
        include: [{
            model: userModel,
            as: "manager",
            attributes: ["id", "fullname"],
        }],
        attributes: {
            exclude: ["controllerId", "managerId"]
        }
    });
    res.status(200).json({ warehouses: rows, warehousesCount: count });
})

exports.getWarehouse = catchAsyncError(async (req, res, next) => {
    console.log("get warehouse");
    const { id } = req.params;
    const warehouse = await warehouseModel.findByPk(id, {
        include: [{
            model: userModel,
            as: "manager",
            attributes: ["id", "fullname"],
        }],
        attributes: {
            exclude: ["controllerId", "managerId"]
        }
    });
    if (!warehouse) return next(new ErrorHandler("Warehouse not found", 404));

    res.status(200).json({ warehouse });
})

exports.updateWarehouse = catchAsyncError(async (req, res, next) => {
    console.log("update warehouse", req.body);
    const { id } = req.params;
    const { controllerId, managerId } = req.body;

    if (controllerId) {
        const controller = await userModel.findByPk(controllerId);
        if (!controller) return next(new ErrorHandler("Controller not found", 404));
    }

    if (managerId) {
        const manager = await userModel.findByPk(managerId);
        if (!manager) return next(new ErrorHandler("Manager not found", 404));
    }

    const [_, warehouse] = await warehouseModel.update(req.body, {
        where: { id },
        returning: true,
    });

    console.log(_, warehouse)
    if (!warehouse) return next(new ErrorHandler("Nothing to update.", 400));
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

{/**
warehouse = await warehouseModel.findByPk(warehouse.id, {
        include: [{
            model: userModel,
            as: "controlled_by",
            include: [{
                model: roleModel,
                as: "userRole",
                where: {role: "manager"},
                attributes: ["role"]
            }],
            attributes: {
                include: ["id", "fullname"],
                exclude: ["roleId"]
            }
        }],
        attributes: {
            exclude: ["userId"]
        }
    });
 */}