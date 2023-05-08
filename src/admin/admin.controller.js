const ErrorHandler = require("../../utils/errorHandler");
const catchAsyncError = require("../../utils/catchAsyncError");
const { userModel } = require("../user");
const getFormattedQuery = require("../../utils/apiFeatures");

exports.getAllUsers = catchAsyncError(async (req, res, next) => {
  console.log(req.query);
  const query = getFormattedQuery("fullname", req.query);
  console.log(JSON.stringify(query));
  const { rows, count } = await userModel.findAndCountAll(query);
  res.status(200).json({ users: rows, usersCount: count });
});

exports.getUser = catchAsyncError(async (req, res, next) => {
  console.log("get user");
  const { id } = req.params;
  const user = await userModel.findByPk(id);
  if (!user) return next(new ErrorHandler("User not found", 404));

  res.status(200).json({ user });
});

exports.updateUser = catchAsyncError(async (req, res, next) => {
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
});

exports.deleteUser = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  await userModel.destroy({ where: { id } });
  res.status(204).json({ message: "User Deleted Successfully." });
});
