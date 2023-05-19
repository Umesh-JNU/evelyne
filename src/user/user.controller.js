const ErrorHandler = require("../../utils/errorHandler");
const catchAsyncError = require("../../utils/catchAsyncError");
const { userModel, roleModel } = require("./user.model");
const { Op } = require("sequelize");
const bcrypt = require("bcryptjs");
const { warehouseModel } = require("../warehouse");

const sendData = (user, statusCode, res) => {
  const token = user.getJWTToken();
  res.status(statusCode).json({
    user,
    token,
  });
};

exports.create = catchAsyncError(async (req, res, next) => {
  console.log("register", req.body);
  const { fullname, email, password, mobile_no, country, city, warehouses } = req.body;
  let { role } = req.body;

  if (!role) role = "user";
  console.log({ role })

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
  }];

  if (warehouses && warehouses.length > 0) {
    if (userRole.role === "manager") {
      const warehouseId = warehouses[0];
      const warehouse_ = await warehouseModel.findByPk(warehouseId);
      if (!warehouse_) return next(new ErrorHandler("Warehouse not found", 400));

      warehouse_.managerId = user.id;
      await warehouse_.save();

      user = await userModel.findByPk(user.id, {
        include: [...includeOptions, {
          model: warehouseModel,
          as: 'warehouse',
          attributes: ["id", "name", "capacity", "filled"],
        }],
        attributes: {
          exclude: ["roleId"]
        }
      });
    }
    else if (userRole.role === "controller") {
      const [warehouses_] = await warehouseModel.update({ controllerId: user.id }, {
        where: { id: { [Op.in]: warehouses } }
      });

      if (!warehouses_) return next(new ErrorHandler("Warehouses not found.", 404));

      user = await userModel.findByPk(user.id, {
        include: [...includeOptions, {
          model: warehouseModel,
          as: 'warehouses',
          attributes: ["id", "name", "capacity", "filled"],
        }],
        attributes: {
          exclude: ["roleId"]
        }
      });
    }
  }

  sendData(user, 201, res);
});

exports.login = catchAsyncError(async (req, res, next) => {
  console.log("user login", req.body);

  const { username, password } = req.body;

  if (!username || !password) {
    return next(
      new ErrorHandler("Please enter your email/mobile and password", 400)
    );
  }

  const user = await userModel.scope("withPassword").findOne({
    where: { [Op.or]: [{ email: username }, { mobile_no: username }] },
    include: [{
      model: roleModel,
      as: "userRole",
      attributes: ["role"]
    }],
    attributes: {
      exclude: ["roleId"]
    }
  });

  console.log({ user });
  if (!user) {
    return next(new ErrorHandler("Invalid email/mobile or password", 401));
  }

  const isPasswordMatched = await user.comparePassword(password);
  console.log({ isPasswordMatched })
  if (!isPasswordMatched)
    return next(new ErrorHandler("Invalid email or password!", 401));

  sendData(user, 200, res);
});

exports.getProfile = catchAsyncError(async (req, res, next) => {
  console.log("user profile", req.userId);
  const userId = req.userId;

  const user = await userModel.findByPk(userId, {
    include: [{
      model: roleModel,
      as: "userRole",
      attributes: ["role"]
    }],
    attributes: {
      exclude: ["roleId"]
    }
  });
  if (!user) return next(new ErrorHandler("User not found.", 400));

  res.status(200).json({ user });
});

exports.updateProfile = catchAsyncError(async (req, res, next) => {
  console.log("update profile", req.body);

  const userId = req.userId;
  const updateData = await userModel.getUpdateFields(req.body);
  if (Object.keys(updateData).length === 0)
    return next(new ErrorHandler("Please provide some data to update", 500));

  console.log(updateData);
  const [_, user] = await userModel.update(updateData, {
    where: { id: userId },
    returning: true, // Return the updated user object
  });

  if (_ === 0) return next(new ErrorHandler("User not found.", 404));

  res.status(200).json({ message: "Profile updated successfully.", user });
});

exports.resetPassword = catchAsyncError(async (req, res, next) => {
  const userId = req.userId;
  const { password, confirmPassword } = req.body;
  if (!password || !confirmPassword)
    return next(
      new ErrorHandler("Password or Confirm Password is required.", 400)
    );

  if (password !== confirmPassword)
    return next(new ErrorHandler("Please confirm your password,", 400));

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const [_, user] = await userModel.update(
    { password: hashedPassword },
    { where: { id: userId } }
  );

  if (_ === 0)
    return next(new ErrorHandler("User not found.", 404));

  res.status(200).json({ message: "Password Updated Successfully." });
});
