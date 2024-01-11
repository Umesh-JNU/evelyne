const ErrorHandler = require("../../utils/errorHandler")
const catchAsyncError = require("../../utils/catchAsyncError")
const contentModel = require("./content.model");

exports.createUpdateContent = catchAsyncError(async (req, res, next) => {
	console.log("create content", req.body);

	let content = await contentModel.findAll();
	if (content && content.length === 0) {
		content = await contentModel.create(req.body);
	} else {
		[_, content] = await contentModel.update(req.body, { where: {}, returning: true });
	}

	res.status(201).json({ content });
})

exports.getContent = catchAsyncError(async (req, res, next) => {
	console.log("getContent");
	const content = await contentModel.findOne();
	res.status(200).json({ content });
});

// ------------------------ FOR USER / MANAGER / CONTROLLER --------------
const message = {
	terms_and_cond: "Terms & Condition not found.",
	privacy_policy: "Privacy Policy not found.",
	about_us: "About Us not found.",
	contact_us: "Contact Us not found."
};

const findContent = async (next, key) => {
	const content = await contentModel.findOne();
	if (!content) {
		return next(new ErrorHandler(message[key], 404));
	}

	return content;
};

exports.getTT = catchAsyncError(async (req, res, next) => {
	console.log("getTT");
	const content = await findContent(next, 'terms_and_cond');

	res.status(200).json({ success: true, data: content.terms_and_cond });
});

exports.getPP = catchAsyncError(async (req, res, next) => {
	console.log("getPP");
	const content = await findContent(next, 'privacy_policy');

	res.status(200).json({ success: true, data: content.privacy_policy });
});

exports.getAboutUs = catchAsyncError(async (req, res, next) => {
	console.log("getAboutUs");
	const content = await findContent(next, 'about_us');

	res.status(200).json({ success: true, data: content.about_us });
});

exports.getContactUs = catchAsyncError(async (req, res, next) => {
	console.log("getContactUs");
	const content = await findContent(next, 'contact_us');

	res.status(200).json({ email: content.email, contact_no: content.contact_no });
});

