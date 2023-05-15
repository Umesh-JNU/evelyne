const ErrorHandler = require("../../utils/errorHandler")
const catchAsyncError = require("../../utils/catchAsyncError")
const getFormattedQuery = require("../../utils/apiFeatures");
const contactModel = require("./contact.model");

exports.createContact = catchAsyncError(async (req, res, next) => {
	console.log("create contact", req.body);
	const { contact_no, email } = req.body;

	const contact = await contactModel.create({ contact_no, email });

	res.status(201).json({ contact });
})

exports.getAllContact = catchAsyncError(async (req, res, next) => {
	const contacts = await contactModel.findAll({});
	res.status(200).json({ contacts });
})

exports.getContact = catchAsyncError(async (req, res, next) => {
	console.log("get contact");
	const { id } = req.params;
	const contact = await contactModel.findByPk(id);	
  
  if (!contact) return next(new ErrorHandler("Contact not found", 404));

	res.status(200).json({ contact });
})

exports.updateContact = catchAsyncError(async (req, res, next) => {
	console.log("update contact", req.body);
	const { id } = req.params;

	const [_, contact] = await contactModel.update(req.body, {
		where: { id },
		returning: true, // Return the updated contact object
	});

	if (contact === 0) return next(new ErrorHandler("Contact not found.", 404));

	res.status(200).json({ message: "Contact updated successfully.", contact });
})

exports.deleteContact = catchAsyncError(async (req, res, next) => {
	const { id } = req.params;
	const contact = await contactModel.destroy({ where: { id } });
	if (contact === 0) return next(new ErrorHandler("Contact not found.", 404));

	res.status(200).json({ message: "Contact Deleted Successfully.", contact });
})