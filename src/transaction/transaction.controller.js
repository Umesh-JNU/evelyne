const ErrorHandler = require("../../utils/errorHandler")
const catchAsyncError = require("../../utils/catchAsyncError")
const getFormattedQuery = require("../../utils/apiFeatures");
const transactionModel = require("./transaction.model");
const { orderModel } = require("../order");
const { userModel } = require("../user");

const includeOptions = {
	include: [{
		model: orderModel,
		as: "order",
		include: [{
			model: userModel,
			as: "user",
			attributes: ["id", "fullname"]
		}],
		attributes: {
			exclude: ["userId",]
		}
	}],
	attributes: {
		exclude: ["orderId",]
	}
}

exports.createTransaction = catchAsyncError(async (req, res, next) => {
	console.log("create transaction", req.body);
	const { orderId, amount, mode } = req.body;

	const order = await orderModel.findByPk(orderId, {
		include: [{
			model: userModel,
			as: "user",
			attributes: ["id", "fullname"],
		}]
	});
	if (!order) return next(new ErrorHandler("Order not found.", 404));

	console.log(order.toJSON())
	let transaction = await transactionModel.create({ amount, mode, orderId: order.id });

	transaction = await transactionModel.findByPk(transaction.id, {
		...includeOptions
	});

	res.status(201).json({ transaction });
})

exports.getAllTransaction = catchAsyncError(async (req, res, next) => {
	console.log(req.query);
	const query = getFormattedQuery("orderId", req.query);

	const user = req.user;
	console.log({ user });
	const options = { ...includeOptions };
	if (!user || user?.userRole?.role === 'user') {
		console.log(!user)
		options.include[0].where = { userId: req.userId }
	};

	console.log(options.include[0])
	console.log(JSON.stringify(query));
	const { rows, count } = await transactionModel.findAndCountAll({
		...query, ...options, order: [['createdAt', 'DESC']]
	});
	res.status(200).json({ transactions: rows, transactionCount: count });
})

exports.getTransaction = catchAsyncError(async (req, res, next) => {
	console.log("get transaction");
	const { id } = req.params;

	const user = req.user;
	const options = { ...includeOptions };
	if (!user || user?.userRole?.role === 'user') {
		options.include[0].where = { userId: req.userId }
	};

	const transaction = await transactionModel.findByPk(id, {
		...options
	});

	if (!transaction) return next(new ErrorHandler("Transaction not found", 404));

	res.status(200).json({ transaction });
})

exports.updateTransaction = catchAsyncError(async (req, res, next) => {
	console.log("update transaction", req.body);
	const { id } = req.params;

	const [_, transaction] = await transactionModel.update(req.body, {
		where: { id },
		returning: true, // Return the updated transaction object
	});

	if (transaction === 0) return next(new ErrorHandler("Transaction not found.", 404));

	res.status(200).json({ message: "Transaction updated successfully.", transaction });
})

exports.deleteTransaction = catchAsyncError(async (req, res, next) => {
	const { id } = req.params;
	const transaction = await transactionModel.destroy({ where: { id } });
	if (transaction === 0) return next(new ErrorHandler("Transaction not found.", 404));

	res.status(200).json({ message: "Transaction Deleted Successfully.", transaction });
})