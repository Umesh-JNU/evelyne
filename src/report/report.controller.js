const ErrorHandler = require("../../utils/errorHandler")
const catchAsyncError = require("../../utils/catchAsyncError")

var pdf = require("pdf-creator-node");
var fs = require("fs");
const path = require('path');
const { orderModel, orderItemModel, includeCountAttr } = require("../order/order.model");
const { Op } = require("sequelize");
const { warehouseModel } = require("../warehouse");
const { userModel } = require("../user");
const { transactionModel } = require("../transaction");

// Read HTML Template
const templateHtml = (templateName) => {
  const templatePath = path.join(__dirname, templateName);
  return fs.readFileSync(templatePath, 'utf-8');
}

const options = {
  format: "A3",
  orientation: "portrait",
  border: "10mm",
  // header: {
  //   height: "10mm",
  //   contents: `<h1 style="text-align: center; font-size: 2.5rem;">${title}</h1>`,
  // },
  footer: {
    height: "10mm",
    contents: {
      // first: 'Cover page',
      // 2: 'Second page', // Any page number is working. 1-based index
      default: '<span style="color: #444; float: right; margin-top: 20px;">{{page}}</span>' // /<span>{{pages}}</span>', // fallback value
      // last: 'Last Page'
    }
  },
};

const sendReport = async (templateName, data, res) => {
  const report = await pdf.create({
    html: templateHtml(templateName),
    data,
    path: "./output.pdf",
    type: "buffer",
  }, options);

  res.setHeader('Content-Type', 'application/pdf');
  res.status(200).send(report);
};

const getOrdersJSON = async (date_type, warehouseId, startDate, endDate) => {
  const orders = await orderModel.findAll({
    where: {
      warehouseId,
      createdAt: {
        [Op.gte]: startDate,
        [Op.lt]: endDate,
      },
      [date_type]: {
        [Op.not]: null
      }
    },
    include: [{
      model: userModel,
      as: "user",
      attributes: ["id", "fullname"]
    }, {
      model: orderItemModel,
      as: "items",
      attributes: ["id", "name", "quantity"],
    }],
    attributes: {
      include: includeCountAttr
    }
  });

  // map a particular user with thier orders
  let groupedOrders = {};
  orders.forEach(order => {
    const userId = order.userId;
    if (!groupedOrders[userId]) {
      groupedOrders[userId] = [];
    }
    groupedOrders[userId].push(order.toJSON());
  });

  // now convert into list of list of orders 
  // for eg [
  //   [order1, order2],   // for user1
  //   [order1]            // for user2
  // ]
  groupedOrders = Object.entries(groupedOrders).map(([k, v]) => v);

  groupedOrders.forEach(orders => {
    let index = 1;
    orders.forEach(order => {
      order.index = index;
      order[date_type] = order[date_type].toISOString().split('T')[0]; index++;
    })
  });

  // now the above list in below format
  // for eg [
  //   {client_name: order1.user.fullname, orders: [order1, order2],           // for user1
  //   {client_name: order1.user.fullname, orders: [order1, order2, order3],   // for user1
  // ]
  groupedOrders = groupedOrders.map(orders => {
    return { client_name: orders[0].user.fullname, orders }
  })

  console.log({ groupedOrders });
  return groupedOrders;
};

const formattedDate = (date) => {
  if (!date || isNaN(date)) return;
  return date.toISOString().split('T')[0];
};

const formattedOrder = (order) => {
  order.arrival_date = formattedDate(order.arrival_date);
  order.trans_date = formattedDate(order.trans_date);
  order.exit_date = formattedDate(order.exit_date);
  order.last_storage_date = formattedDate(order.last_storage_date);
  order.createdAt = formattedDate(order.createdAt);
  order.updatedAt = formattedDate(order.updatedAt);
  order.transaction.createdAt = formattedDate(order.transaction.createdAt);

  return order;
};

const formatedTransaction = (transaction) => {
  transaction.createdAt = formattedDate(transaction.createdAt);
  return transaction;
};

exports.getReport = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  if (!id)
    return next(new ErrorHandler("Please provide the warehouseId", 400));

  const year = parseInt(req.query.year);
  const month = parseInt(req.query.month) - 1;
  const date = req.query.date;

  if (year) {
    var title = `Yearly Report - ${year}`;
    var startDate = new Date(Date.UTC(year, 0, 1));
    var endDate = new Date(Date.UTC(year + 1, 0, 1));
    console.log({ startDate, endDate });
  }
  else if (month) {
    var title = `Monthly Report - ${new Date(0, month).toLocaleString('en', { month: 'long' })}`;
    const currentYear = new Date().getFullYear();
    var startDate = new Date(Date.UTC(currentYear, month, 1));
    var endDate = new Date(Date.UTC(currentYear, month + 1, 1));
  }
  else if (date) {
    var title = "Daily Report";
    var startDate = new Date(date);
    startDate.setUTCHours(0, 0, 0, 0);
    var endDate = new Date(date);
    endDate.setUTCHours(24, 0, 0, 0);
  }
  else {
    return next(new ErrorHandler("Bad Request", 400));
  }

  const arrivedOrders = await getOrdersJSON('arrival_date', id, startDate, endDate);
  const transOrders = await getOrdersJSON('trans_date', id, startDate, endDate);
  const exitOrders = await getOrdersJSON('exit_date', id, startDate, endDate);

  if (arrivedOrders.length === 0 && transOrders.length === 0 && exitOrders.length === 0) {
    return next(new ErrorHandler("No orders", 400));
  }

  console.log("download report", req.query);
  await sendReport("template.html", { heading: title, arrivedOrders, transOrders, exitOrders }, res);
});

exports.trackOrder = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.userId;

  const order = await orderModel.findOne({
    where: { id, userId },
    include: [{
      model: orderItemModel,
      as: "items",
      attributes: ["id", "name", "quantity"],
    },
    {
      model: warehouseModel,
      as: "warehouse",
      include: [{
        model: userModel,
        as: "manager",
        attributes: ["id", "fullname"]
      }],
      attributes: ["id", "name", "image"],
    },
    {
      model: userModel,
      as: "user",
      attributes: ["id", "fullname"],
    },
    {
      model: transactionModel,
      as: "transaction",
      attributes: { exclude: ["orderId"] }
    }],
    attributes: {
      include: includeCountAttr,
      exclude: ["userId", "warehouseId"]
    }
  });

  if (!order) return next(new ErrorHandler("Order not found", 404));

  await sendReport('trackOrder.html', { heading: 'Track Order Report', order: formattedOrder(order.toJSON()) }, res);
});

exports.transaction = catchAsyncError(async (req, res, next) => {
  console.log("get transaction report");
  const { id } = req.params;

  const transaction = await transactionModel.findByPk(id, {
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
    }],
    attributes: {
      exclude: ["orderId",]
    }
  });

  if (!transaction) return next(new ErrorHandler("Transaction not found", 404));

  // res.status(200).json({ transaction });
  console.log({ transaction: transaction.toJSON().comments })
  await sendReport('transaction.html', { heading: 'Transaction Report', ...formatedTransaction(transaction.toJSON()) }, res);
});

exports.bondReport = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const { date } = req.query;

  if (!date) {
    return next(new ErrorHandler("Please select the date.", 400));
  }

  const startDate = new Date(date);
  startDate.setUTCHours(0, 0, 0, 0);
  const endDate = new Date(date);
  endDate.setUTCHours(24, 0, 0, 0);
  let transactions = await transactionModel.findAll({
    where: {
      updatedAt: {
        [Op.gte]: startDate,
        [Op.lt]: endDate,
      },
      warehouseId: id,
      status: 'paid',
    },
  });

  let transactionData = [];
  transactions.forEach(transaction => {
    console.log({ transaction })
    transactionData.push({
      date,
      declaration: transaction.desc,
      value: 0,
      debit: transaction.type === 'debit' ? transaction.amount : 0,
      credit: transaction.type === 'credit' ? transaction.amount : 0,
    });
  });

  transactions = await transactionModel.findAll({
    include: [{
      model: orderModel,
      as: "order",
      where: { warehouseId: id },
      attributes: ["quantity_decl"],
    }],
    where: { status: 'paid' }
  });

  transactions.forEach(transaction => {
    console.log({ transaction })
    transactionData.push({
      date,
      declaration: transaction.desc,
      value: 0,
      debit: transaction.type === 'debit' ? transaction.amount : 0,
      credit: transaction.type === 'credit' ? transaction.amount : 0,
    });
  });

  if (transactionData.length === 0) {
    return next(new ErrorHandler("No Transaction Today.", 400));
  };

  console.log({ transactionData })

  await sendReport('bondReport.html', { heading: 'Bond Report', data: transactionData }, res);
})