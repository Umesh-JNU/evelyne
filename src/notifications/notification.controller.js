const ErrorHandler = require("../../utils/errorHandler")
const catchAsyncError = require("../../utils/catchAsyncError")
const getFormattedQuery = require("../../utils/apiFeatures");
const notificationModel = require("./notification.model");

exports.getAllNotification = catchAsyncError(async (req, res, next) => {
  const userId = req.userId;

  const notifications = await notificationModel.findAll({
    where: { userId },
    attributes: { exclude: ["userId"] },
    order: [['date', 'DESC']]
  });

  const unread = await notificationModel.count({ where: { userId, seen: false } });
  res.status(200).json({ notifications, unread });
})

exports.getNotification = catchAsyncError(async (req, res, next) => {
  console.log("get notification");
  const { id } = req.params;
  const notification = await notificationModel.findOne({
    where: { id, userId: req.userId },
    attributes: { exclude: ["userId"] }
  });

  if (!notification) return next(new ErrorHandler("Notification not found", 404));

  res.status(200).json({ notification });
})

exports.updateNotification = catchAsyncError(async (req, res, next) => {
  console.log("update notification", req.body);
  const { id } = req.params;
  const userId = req.userId;

  const notification = await notificationModel.findOne({ where: { id, userId } });

  if (!notification) return next(new ErrorHandler("Notification not found", 404));

  notification.seen = true;
  await notification.save();

  res.status(200).json({ message: "Notification updated successfully." });
})

exports.marKAllRead = catchAsyncError(async (req, res, next) => {
  console.log("marKAllRead");
  const userId = req.userId;

  const [isUpdated] = await notificationModel.update({ seen: true }, {
    where: { userId },
  });

  res.status(200).json({ isUpdated, success: true });
})

exports.deleteNotification = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const isDeleted = await notificationModel.destroy({ where: { id } });
  if (isDeleted === 0) return next(new ErrorHandler("Notification not found.", 404));

  res.status(200).json({ message: "Notification Deleted Successfully.", isDeleted });
})