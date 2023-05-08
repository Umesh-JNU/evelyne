const ErrorHandler = require("../../utils/errorHandler")
const catchAsyncError = require("../../utils/catchAsyncError")
const getFormattedQuery = require("../../utils/apiFeatures");
const warehouseModel = require("./warehouse.model");

exports.createWarehouse = catchAsyncError(async (req, res, next) => {
    console.log("create warehouse", req.body);
    const { name } = req.body;

    const warehouse = await warehouseModel.create({ name });
    res.status(201).json({ warehouse });
})

exports.getAllWarehouse = catchAsyncError(async (req, res, next) => {
    console.log(req.query);
    const query = getFormattedQuery("name", req.query);
    console.log(JSON.stringify(query));
    const { rows, count } = await warehouseModel.findAndCountAll(query);
    res.status(200).json({ warehouses: rows, warehouseCount: count });
})

exports.getWarehouse = catchAsyncError(async (req, res, next) => {
    console.log("get warehouse");
    const { id } = req.params;
    const warehouse = await warehouseModel.findByPk(id);
    if (!warehouse) return next(new ErrorHandler("Warehouse not found", 404));

    res.status(200).json({ warehouse });
})

exports.updateWarehouse = catchAsyncError(async (req, res, next) => {
    console.log("update warehouse", req.body);
    const { id } = req.params;

    const [_, warehouse] = await warehouseModel.update(req.body, {
        where: { id },
        returning: true, // Return the updated warehouse object
    });

    if (warehouse === 0) return next(new ErrorHandler("Warehouse not found.", 404));

    res.status(200).json({ message: "Warehouse updated successfully.", warehouse });
})

exports.deleteWarehouse = catchAsyncError(async (req, res, next) => {
    const { id } = req.params;
    const warehouse = await warehouseModel.destroy({ where: { id } });
    if (warehouse === 0) return next(new ErrorHandler("Warehouse not found.", 404));

    res.status(200).json({ message: "Warehouse Deleted Successfully.", warehouse });
})