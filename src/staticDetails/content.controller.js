const ErrorHandler = require("../../utils/errorHandler")
const catchAsyncError = require("../../utils/catchAsyncError")
const getFormattedQuery = require("../../utils/apiFeatures");
const contentModel = require("./content.model");

exports.createContent = catchAsyncError(async (req, res, next) => {
	console.log("create content", req.body);

	const content = await contentModel.create(req.body);
	res.status(201).json({ content });
})

exports.getAllContent = catchAsyncError(async (req, res, next) => {
	const contents = await contentModel.findAll({});
	res.status(200).json({ contents });
})

exports.getContent = catchAsyncError(async (req, res, next) => {
	console.log("get content");
	const { id } = req.params;
	const content = await contentModel.findByPk(id);

	if (!content) return next(new ErrorHandler("Content not found", 404));

	res.status(200).json({ content });
})

exports.updateContent = catchAsyncError(async (req, res, next) => {
	console.log("update content", req.body);
	const { id } = req.params;

	const [_, content] = await contentModel.update(req.body, {
		where: { id },
		returning: true, // Return the updated content object
	});

	if (content === 0) return next(new ErrorHandler("Content not found.", 404));

	res.status(200).json({ message: "Content updated successfully.", content });
})

exports.deleteContent = catchAsyncError(async (req, res, next) => {
	const { id } = req.params;
	const content = await contentModel.destroy({ where: { id } });
	if (content === 0) return next(new ErrorHandler("Content not found.", 404));

	res.status(200).json({ message: "Content Deleted Successfully.", content });
})