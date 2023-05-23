const ErrorHandler = require("../../utils/errorHandler");
const catchAsyncError = require("../../utils/catchAsyncError");
const { userModel, roleModel } = require("../user");
const getFormattedQuery = require("../../utils/apiFeatures");
const { warehouseModel } = require("../warehouse");

exports.userController = {
  createController: catchAsyncError(async (req, res, next) => {
    console.log("register", req.body);
    const { fullname, email, password, mobile_no, country, city, warehouses, role } = req.body;

    const userRole = await roleModel.findOne({ where: { role } });
    console.log({ userRole });
    if (!userRole) return next(new ErrorHandler("Invalid user role.", 400));

    let user = await userModel.create({
      fullname,
      email,
      password,
      mobile_no,
      country,
      city,
      roleId: userRole.id
    });

    const includeOptions = [{
      model: roleModel,
      as: "userRole",
      attributes: ["role"]
    }, {
      model: warehouseModel,
      as: 'warehouse',
      attributes: ["id", "name", "capacity", "filled"]
    }];

    if (warehouses && warehouses.length > 0) {
      if (userRole.role === "manager") {
        const warehouseId = warehouses[0];
        const warehouse_ = await warehouseModel.findByPk(warehouseId);
        if (!warehouse_) return next(new ErrorHandler("Warehouse not found", 400));

        warehouse_.managerId = user.id;
        await warehouse_.save();
      }
      else if (userRole.role === "controller") {
        const [warehouses_] = await warehouseModel.update({ controllerId: user.id }, {
          where: { id: { [Op.in]: warehouses } }
        });

        if (!warehouses_) return next(new ErrorHandler("Warehouses not found.", 404));

        includeOptions[1].as = 'warehouses';
      }
    }

    user = await userModel.findByPk(user.id, {
      include: includeOptions,
      attributes: {
        exclude: ["roleId"]
      }
    });

    res.status(201).json({ user });
  }),

  getAllUsers: catchAsyncError(async (req, res, next) => {
    console.log(req.query);
    const query = getFormattedQuery("fullname", req.query);
    console.log(JSON.stringify(query));
    let role = {};
    let houseAliasKey;
    const includeOptions = [];

    if (req.query.role) {
      role = { role: req.query.role };
      houseAliasKey = 'warehouse' + (req.query.role === "controller" ? "s" : "");
      includeOptions.push({
        model: warehouseModel,
        as: houseAliasKey,
        attributes: ["id", "name", "capacity", "filled"]
      })
    }
    console.log(role);
    const { rows, count } = await userModel.findAndCountAll({
      ...query,
      include: [{
        model: roleModel,
        as: "userRole",
        where: role,
        attributes: ["role"]
      }, ...includeOptions],
      attributes: {
        exclude: ["roleId"]
      }
    });

    res.status(200).json({ users: rows, usersCount: count });
  }),

  getUser: catchAsyncError(async (req, res, next) => {
    console.log("get user");

    let houseAliasKey = "warehouse";
    if (req.query.warehouse) houseAliasKey = "warehouses";

    const { id } = req.params;
    const user = await userModel.findByPk(id, {
      include: [{
        model: roleModel,
        as: "userRole",
        attributes: ["role"]
      }, {
        model: warehouseModel,
        as: houseAliasKey,
        attributes: ["id", "name", "capacity", "filled"],
        // through: { attributes: [] }
      }],
      attributes: {
        exclude: ["roleId"]
      }
    });
    if (!user) return next(new ErrorHandler("User not found", 404));

    res.status(200).json({ user });
  }),

  updateUser: catchAsyncError(async (req, res, next) => {
    console.log("update user", req.body);
    const { id } = req.params;

    const updateData = await userModel.getUpdateFields(req.body);
    console.log({ updateData });
    console.log({ id });

    const [_, user] = await userModel.update(updateData, {
      where: { id },
      returning: true, // Return the updated user object
    });

    if (_ === 0) return next(new ErrorHandler("User not found.", 404));

    res.status(200).json({ message: "User updated successfully.", user });
  }),

  deleteUser: catchAsyncError(async (req, res, next) => {
    const { id } = req.params;
    console.log("delete user id", { id })
    await userModel.destroy({ where: { id } });
    res.status(204).json({ message: "User Deleted Successfully." });
  })
}
