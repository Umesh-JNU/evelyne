const ErrorHandler = require("../../utils/errorHandler");
const catchAsyncError = require("../../utils/catchAsyncError");
const { userModel, roleModel } = require("../user");
const getFormattedQuery = require("../../utils/apiFeatures");
const { warehouseModel } = require("../warehouse");
const { Op } = require("sequelize");
const { orderModel } = require("../order/order.model");
const { db } = require("../../config/database");

const includeRole = (role) => {
  const roleObj = {
    model: roleModel,
    as: "userRole",
    attributes: ["role"]
  };

  return role ? { ...roleObj, where: { role } } : { ...roleObj, where: { role: { [Op.ne]: "admin" } } };
};

const includeWarehouse = {
  model: warehouseModel,
  as: "warehouse",
  attributes: ["id", "name", "image", "capacity", "filled"],
};

const includeWarehouses = {
  model: warehouseModel,
  as: "warehouses",
  attributes: ["id", "name", "image", "capacity", "filled"],
  through: { attributes: [] }
};

const includeOptions = (role) => {
  const options = [];
  if (role) {
    console.log({ role });
    options.push(includeRole(role));
    switch (role) {
      case "controller":
        options.push(includeWarehouses);
        break;
      case "manager":
        options.push(includeWarehouse);
        break;
      default: break;
    }
  } else {
    options.push(includeRole());
  }
  return options;
};

exports.userController = {
  createController: catchAsyncError(async (req, res, next) => {
    console.log("create controller", req.body);
    const { warehouses, role } = req.body;

    const [userRole, _] = await roleModel.findOrCreate({ where: { role } });

    let user = await userModel.create({ ...req.body, roleId: userRole.id });

    let options = includeOptions(role);
    // if (warehouses && warehouses.length > 0) {
    //   switch (role) {
    //     case "manager":
    //       const warehouseId = warehouses[0];
    //       const warehouse_ = await warehouseModel.findByPk(warehouseId);
    //       if (!warehouse_) return next(new ErrorHandler("Warehouse not found", 404));

    //       warehouse_.managerId = user.id;
    //       await warehouse_.save();
    //       break;

    //     case "controller":
    //       const [warehouses_] = await warehouseModel.update({ controllerId: user.id }, {
    //         where: { id: { [Op.in]: warehouses } }
    //       });

    //       if (!warehouses_) return next(new ErrorHandler("Warehouses not found.", 404));
    //       break;

    //     default:
    //       break;
    //   }
    // }

    console.log({ options })
    user = await userModel.findByPk(user.id, {
      include: options,
      attributes: {
        exclude: ["roleId"]
      }
    });

    res.status(201).json({ user });
  }),

  getAllUsers: catchAsyncError(async (req, res, next) => {
    console.log("all users", req.query);

    const query = getFormattedQuery("fullname", req.query);
    const { role } = req.query;

    const countQry = {
      ...query,
      include: includeOptions(role),
      paranoid: false,
    };

    const usersCount = await userModel.count({ ...countQry });
    const users = await userModel.findAll({
      ...countQry,
      attributes: { exclude: ["roleId"] },
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({ users, usersCount });
  }),

  getUser: catchAsyncError(async (req, res, next) => {
    console.log("get user");
    const { id } = req.params;
    const { role } = req.query;

    const user = await userModel.findByPk(id, {
      include: includeOptions(role),
      attributes: { exclude: ["roleId"] },
      paranoid: false,
    });

    if (!user) return next(new ErrorHandler("User not found", 404));

    res.status(200).json({ user });
  }),

  updateUser: catchAsyncError(async (req, res, next) => {
    console.log("update user", req.body);
    const { id } = req.params;

    const [role, isCreated] = await roleModel.findOrCreate({ where: { role: req.body.role } });
    const updateData = await userModel.getUpdateFields(req.body);
    updateData.roleId = role.id;
    console.log({ updateData });
    console.log({ id });

    const [isUpdated] = await userModel.update(updateData, {
      where: { id },
    });

    if (isUpdated === 0) return next(new ErrorHandler("User not found.", 404));

    res.status(200).json({ message: "User updated successfully.", isUpdated });
  }),

  unDeleteUser: catchAsyncError(async (req, res, next) => {
    const { id } = req.params;
    console.log("un delete user id", { id })
    const result = await userModel.update(
      { deletedAt: null },
      { where: { id }, paranoid: false }
    );
    console.log({ result })
    if (result[0] === 0) {
      return next(new ErrorHandler("User Not Found", 404));
    }

    res.status(200).json({ message: "User Re-created Successfully." });
  }),

  deleteUser: catchAsyncError(async (req, res, next) => {
    const { id } = req.params;
    console.log("delete user id", { id })
    await userModel.destroy({ where: { id } });
    res.status(200).json({ message: "User Deleted Successfully." });
  }),

  summary: catchAsyncError(async (req, res, next) => {
    const { counts } = await orderModel.getCounts({});
    const warehouse = await warehouseModel.count();
    const userCount = await userModel.findAll({
      paranoid: false,
      include: [{
        model: roleModel,
        as: "userRole",
        attributes: ["role"]
      }],
      attributes: [[db.fn('COUNT', db.col('userRole.role')), 'count']],
      group: ['userRole.role'],
    });

    const userCnt = {};
    userCount.forEach((c) => {
      const { count, userRole } = c.dataValues;
      userCnt[userRole.role] = count;
    });

    res.status(200).json({
      ...counts,
      warehouse,
      ...userCnt,
    })
  })
}
