const ErrorHandler = require("../../utils/errorHandler")
const catchAsyncError = require("../../utils/catchAsyncError")
const getFormattedQuery = require("../../utils/apiFeatures");
const { transactionModel, commentModel } = require("./transaction.model");
const { orderModel } = require("../order");
const { userModel } = require("../user");
const { warehouseModel } = require("../warehouse");

const includeOptions = {
	include: [{
		model: orderModel,
		as: "order",
		include: [{
			model: userModel,
			as: "user",
			attributes: ["id", "fullname"]
		}, {
			model: warehouseModel,
			as: "warehouse",
			attributes: ["id", "name"],
			include: [{
				model: userModel,
				as: "manager",
				attributes: ["id", "fullname"]
			}]
		}],
		attributes: ["id", "status"]
	}, {
		model: warehouseModel,
		as: "warehouse",
		attributes: ["id", "name"]
	}],
	attributes: {
		exclude: ["orderId","warehouseId"]
	}
}

exports.createTransaction = catchAsyncError(async (req, res, next) => {
	console.log("create transaction", req.body);
	const { orderId, comments, warehouseId } = req.body;

	if (orderId) {
		const order = await orderModel.findByPk(orderId);
		if (!order) return next(new ErrorHandler("Order not found.", 404));
	}
	else if (warehouseId) {
		const warehouse = await warehouseModel.findByPk(warehouseId);
		if (!warehouse) return next(new ErrorHandler("Warehouse not found.", 404));
	}

	let transaction = await transactionModel.create(req.body);

	if (comments && comments.length > 0) {
		comments.forEach((comment) => { comment.transactionId = transaction.id; });
		await commentModel.bulkCreate(comments);
	}

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
	const transactions = await transactionModel.findAll({
		...query, ...options, order: [['createdAt', 'DESC']]
	});
	res.status(200).json({ transactions, transactionCount: transactions.length });
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

	const [isUpdated] = await transactionModel.update(req.body, {
		where: { id },
	});

	if (isUpdated === 0) return next(new ErrorHandler("Transaction not found.", 404));

	res.status(200).json({ message: "Transaction updated successfully.", isUpdated });
})

exports.addComment = catchAsyncError(async (req, res, next) => {
	const { id } = req.params;
	const { comment } = req.body;

	const comment_ = await commentModel.create({ comment, transactionId: id });
	res.status(201).json({ comment: comment_, message: "Comment Added Successfully." });
});


exports.deleteTransaction = catchAsyncError(async (req, res, next) => {
	const { id } = req.params;
	const transaction = await transactionModel.destroy({ where: { id } });
	if (transaction === 0) return next(new ErrorHandler("Transaction not found.", 404));

	res.status(200).json({ message: "Transaction Deleted Successfully.", transaction });
})