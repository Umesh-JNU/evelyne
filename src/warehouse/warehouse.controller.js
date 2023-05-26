const ErrorHandler = require("../../utils/errorHandler")
const catchAsyncError = require("../../utils/catchAsyncError")
const getFormattedQuery = require("../../utils/apiFeatures");
const warehouseModel = require("./warehouse.model");
const { userModel } = require("../user/user.model");
const { orderModel, orderItemModel } = require("../order/order.model");
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
        include: includeOptions,
        attributes: { exclude: ["controllerId", "managerId"] },
        order: [['createdAt', 'DESC']]
    });
    res.status(200).json({ warehouses, warehousesCount: warehouses.length });
})

exports.getWarehouse = catchAsyncError(async (req, res, next) => {
    console.log("get warehouse");
    const { id } = req.params;
    const warehouse = await warehouseModel.findByPk(id, {
        include: includeOptions,
        attributes: { exclude: ["controllerId", "managerId"] }
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

const getManager = async (userId, next) => {
    const manager = await userModel.findByPk(userId, {
        include: [{
            model: warehouseModel,
            as: "warehouse",
            attributes: ["id"]
        }],
    })

    if (!manager) return next(new ErrorHandler("Manager not found.", 404));
    return manager;
}

exports.getWarehouseOrder = catchAsyncError(async (req, res, next) => {
    console.log("get warehouse orders");
    const userId = req.userId;
    const manager = await getManager(userId, next);

    let whereQuery = {};
    if (manager.warehouse) whereQuery = { warehouseId: manager.warehouse.id };

    const counts = await orderModel.getCounts(whereQuery);
    console.log({ counts });

    const orders = await orderModel.findAll({
        where: whereQuery,
        attributes: {
            include: [
                [
                    // Note the wrapping parentheses in the call below!
                    db.literal(`(
                            SELECT COUNT(*)
                            FROM orderitems AS item
                            WHERE	item.orderId = order.id
                        )`),
                    'itemCount'
                ],
                [
                    db.literal(`(
                            SELECT SUM(quantity)
                            FROM orderitems AS item
                            WHERE	item.orderId = order.id
                        )`),
                    'totalWeight'
                ]
            ]
        },
        include: [{
            model: orderItemModel,
            as: "items",
            attributes: ["id", "name", "quantity"]
        }]
    })

    res.status(200).json({ orders, counts });
})

exports.myWarehouse = catchAsyncError(async (req, res, next) => {
    const userId = req.userId;
    const manager = await getManager(userId, next);

    const warehouse = await warehouseModel.findByPk(manager.warehouse?.id, {
        attributes: { exclude: ["controllerId", "managerId"] }
    });
    if (!warehouse) return next(new ErrorHandler("Warehouse not found", 404));

    res.status(200).json({ warehouse });
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

    email is already register due to soft delete.
    is editing in order if so then what.
    is editing in transaction ?
 */}