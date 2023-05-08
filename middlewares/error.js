const multer = require("multer");
const ErrorHandler = require("../utils/errorHandler");

module.exports = (err, req, res, next) => {
	console.log({err});
	err.message = err.message || "Internal Server Error";

	if (err instanceof multer.MulterError) {
		if (err.code === "LIMIT_FILE_SIZE") {
			err = new ErrorHandler("File size is too large", 400);
		}

		if (err.code === "LIMIT_FILE_COUNT") {
			err = new ErrorHandler("File limit reached", 400);
		}

		if (err.code === "LIMIT_UNEXPECTED_FILE") {
			err = new ErrorHandler("File must be an image", 400);
		}
	}

	if (err.name === "CastError") {
		const msg = `Resource not found. Invalid: ${err.path}`;
		err = new ErrorHandler(msg, 400);
	}

	if (err.name === "SequelizeValidationError") {
		let errors = Object.values(err.errors).map((el) => {
			console.log({el})
			let e;
			if (el.validatorKey === 'notEmpty' || el.validatorKey === 'notNull' || el.validatorKey === 'is_null') e = el.message;
			else e = el.message;

			const er = JSON.stringify({	[el.path]: e});
			console.log(er);
			return er
		});

		const msg = `Validation Failed. ${errors}`;
		err = new ErrorHandler(msg, 400);
	}

	// sequelize duplicate key error
	if (err.name === "SequelizeUniqueConstraintError") {
		let errors = Object.values(err.errors).map((el) => {
			console.log({ el });
			if (el.path === "email") {
				return JSON.stringify({
					[el.path]: "Email is already registered.",
				});
			}

			return JSON.stringify({ [el.path]: el.message })
		});

		err = new ErrorHandler(errors, 400);
	}

	// wrong jwt error
	if (err.name === "JsonWebTokenError") {
		const message = `Json Web Token is invalid, try again`;
		err = new ErrorHandler(message, 400);
	}

	// JWT expire error
	if (err.name === "TokenExpiredError") {
		const message = `Json Web Token is expired, try again`;
		err = new ErrorHandler(message, 400);
	}

	res.status(err.statusCode || 500).json({
		success: false,
		error: {
			message: err.message,
		},
	});
};
