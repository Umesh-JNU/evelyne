const ErrorHandler = require("../../utils/errorHandler");
const catchAsyncError = require("../../utils/catchAsyncError");
const { userModel, roleModel } = require("../user");
const getFormattedQuery = require("../../utils/apiFeatures");
const { warehouseModel } = require("../warehouse");

const includeRole = {
  model: roleModel,
  as: "userRole",
  attributes: ["role"]
};
const includeWarehouse = {
  model: warehouseModel,
  as: 'warehouse',
  attributes: ["id", "name", "capacity", "filled"]
};

exports.userController = {
  createController: catchAsyncError(async (req, res, next) => {
    console.log("create controller", req.body);
    const { warehouses, role } = req.body;

    const [userRole, _] = await roleModel.findOrCreate({ where: { role } });

    let user = await userModel.create({ ...req.body, roleId: userRole.id });
    let includeOptions = [includeRole, includeWarehouse];
    if (warehouses && warehouses.length > 0) {
      switch (role) {
        case "manager":
          const warehouseId = warehouses[0];
          const warehouse_ = await warehouseModel.findByPk(warehouseId);
          if (!warehouse_) return next(new ErrorHandler("Warehouse not found", 404));

          warehouse_.managerId = user.id;
          await warehouse_.save();
          break;

        case "controller":
          const [warehouses_] = await warehouseModel.update({ controllerId: user.id }, {
            where: { id: { [Op.in]: warehouses } }
          });

          if (!warehouses_) return next(new ErrorHandler("Warehouses not found.", 404));

          includeOptions[1].as = 'warehouses';
          break;

        default:
          break;
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
    console.log("all users", req.query);

    const query = getFormattedQuery("fullname", req.query);
    let { role } = req.query;

    let includeOptions = [includeRole, includeWarehouse];
    if (role) {
      console.log({ role })
      if (role === "controller")
        includeOptions[1].as = "warehouses";

      includeOptions[0].where = { role }
    }

    console.log({ includeOptions }, includeOptions[0].where);
    const { rows, count } = await userModel.findAndCountAll({
      ...query,
      include: includeOptions,
      attributes: { exclude: ["roleId"] },
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({ users: rows, usersCount: count });
  }),

  getUser: catchAsyncError(async (req, res, next) => {
    console.log("get user");
    let includeOptions = [includeRole, includeWarehouse];
    if (req.query.warehouses) {
      includeOptions[1].as = "warehouses";
    }

    const { id } = req.params;
    const user = await userModel.findByPk(id, {
      include: includeOptions,
      attributes: { exclude: ["roleId"] }
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
