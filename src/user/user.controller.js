const ErrorHandler = require("../../utils/errorHandler");
const catchAsyncError = require("../../utils/catchAsyncError");
const { userModel, roleModel, otpModel } = require("./user.model");
const { Op } = require("sequelize");
const generateOTP = require('../../utils/otpGenerator');
const sendEmail = require("../../utils/sendEmail");

const options = {
  include: [{
    model: roleModel,
    as: "userRole",
    attributes: ["role"]
  }],
  attributes: { exclude: ["roleId"] },
};

const sendData = async (user, statusCode, res) => {
  const token = user.getJWTToken();
  user = await userModel.findByPk(user.id, options);

  res.status(statusCode).json({
    user,
    token,
  });
};

exports.create = catchAsyncError(async (req, res, next) => {
  console.log("register", req.body);

  const [role, _] = await roleModel.findOrCreate({ where: { role: 'user' } });

  let user = await userModel.create({
    ...req.body,
    roleId: role.id
  });

  await sendData(user, 201, res);
});

exports.login = catchAsyncError(async (req, res, next) => {
  const { username, password } = req.body;
  if (!username || !password)
    return next(new ErrorHandler("Please enter your email/mobile and password", 400));

  const user = await userModel.scope("withPassword").findOne({
    where: { [Op.or]: [{ email: username }, { mobile_no: username }] },
  });
  if (!user)
    return next(new ErrorHandler("Invalid email/mobile or password", 401));

  const isPasswordMatched = await user.comparePassword(password);
  if (!isPasswordMatched)
    return next(new ErrorHandler("Invalid email or password!", 401));

  await sendData(user, 200, res);
});

exports.getProfile = catchAsyncError(async (req, res, next) => {
  console.log("user profile", req.userId);
  const userId = req.userId;

  const user = await userModel.findByPk(userId, options);
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
  const [isUpdated] = await userModel.update(updateData, {
    where: { id: userId },
  });

  if (isUpdated === 0) return next(new ErrorHandler("User not found.", 404));

  res.status(200).json({ message: "Profile updated successfully.", isUpdated });
});

exports.updatePassword = catchAsyncError(async (req, res, next) => {
  const userId = req.userId || req.body.userId;
  const { password, confirmPassword } = req.body;
  if (!password || !confirmPassword)
    return next(
      new ErrorHandler("Password or Confirm Password is required.", 400)
    );

  if (password !== confirmPassword)
    return next(new ErrorHandler("Please confirm your password,", 400));

  const user = await userModel.findOne({ where: { id: userId } });

  user.password = password;
  await user.save();

  res.status(200).json({ message: "Password Updated Successfully." });
});

exports.forgotPassword = catchAsyncError(async (req, res, next) => {
  console.log("forgot password", req.body.email);

  const user = await userModel.findOne({ where: { email: req.body.email } });
  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  // get resetPassword OTP
  const otp = generateOTP();
  await otpModel.create({
    otp: otp,
    userId: user.id
  });

  const message = `<b>Your password reset OTP is :- <h2>${otp}</h2></b><div>If you have not requested this email then, please ignore it.</div>`;

  try {
    await sendEmail({
      email: user.email,
      subject: `Password Reset`,
      message,
    });

    res.status(200).json({
      message: `Email sent to ${user.email} successfully.`,
    });
  } catch (error) {
    await otpModel.destroy({
      where: { otp: otp, userId: user.id }
    });
    return next(new ErrorHandler(error.message, 500));
  }
});

exports.verifyOTP = catchAsyncError(async (req, res, next) => {
  const { otp } = req.body;

  const otpInstance = await otpModel.findOne({ where: { otp } });
  if (!otpInstance || !otpInstance.isValid())
    return next(new ErrorHandler("OTP is invalid or has been expired.", 400));

  await otpModel.destroy({ where: { id: otpInstance.id } });

  res.status(200).json({
    message: "OTP verified successfully.", userId: otpInstance.userId
  });
});