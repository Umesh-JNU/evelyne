const ErrorHandler = require("../../utils/errorHandler")
const catchAsyncError = require("../../utils/catchAsyncError")

var pdf = require("../../utils/pdf");
var fs = require("fs");
const path = require('path');
const { orderModel, orderItemModel, includeCountAttr } = require("../order/order.model");
const { Op } = require("sequelize");
const { warehouseModel } = require("../warehouse");
const { userModel } = require("../user");
const { transactionModel } = require("../transaction");


// Read HTML Template
// const templatePath = path.join(__dirname, 'template.html');
const templateHtml = (templateName) => {
  const templatePath = path.join(__dirname, templateName);
  return fs.readFileSync(templatePath, 'utf-8');
}

// contents: `<h1 style="text-align: center;">Daily Report (Entry and Exit)</h1>'
const getOption = (title) => {
  return {
    format: "A3",
    orientation: "portrait",
    border: "10mm",
    header: {
      height: "10mm",
      contents: `<h1 style="text-align: center; font-size: 2.5rem;">${title}</h1>`
    },
    footer: {
      height: "20mm",
      contents: {
        first: 'Cover page',
        2: 'Second page', // Any page number is working. 1-based index
        default: '<span style="color: #444;">{{page}}</span>/<span>{{pages}}</span>', // fallback value
        last: 'Last Page'
      }
    },
  };
}

const sendReport = async (templateName, title, data, res) => {
  const report = await pdf.create({
    html: templateHtml(templateName),
    data,
    path: "./output.pdf",
    type: "buffer",
  }, getOption(title));

  res.setHeader('Content-Type', 'application/pdf');
  res.status(200).send(report);
};

exports.getReport = catchAsyncError(async (req, res, next) => {
  const year = parseInt(req.query.year);
  const month = parseInt(req.query.month);
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

  const orders = await orderModel.findAll({
    where: {
      createdAt: {
        [Op.gte]: startDate,
        [Op.lt]: endDate
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

  let groupedOrders = {};
  orders.forEach(order => {
    const userId = order.userId;
    if (!groupedOrders[userId]) {
      groupedOrders[userId] = [];
    }
    groupedOrders[userId].push(order.toJSON());
  });

  groupedOrders = Object.entries(groupedOrders).map(([k, v]) => v);

  groupedOrders = groupedOrders.map(order => {
    return { client_name: order[0].user.fullname, order }
  })

  // return res.json({ groupedOrders })
  console.log({ groupedOrders });
  groupedOrders.forEach(v => console.log({ v: v.order }));
  console.log("download report", req.query);
  await sendReport("template.html", title, { orders: groupedOrders }, res);
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
  // return res.json({ order })
  // console.log({ order: order.toJSON() })
  await sendReport('trackOrder.html', 'Track Order Report', order.toJSON(), res);
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
  await sendReport('transaction.html', 'Transaction Report', transaction.toJSON(), res);
});

exports.bondReport = catchAsyncError(async (req, res, next) => {
  const data = [
    {
      date: '2023-06-19',
      declaration: 'Declaration',
      value: 159,
      deposit: 0,
      credit: 159,
    },
    {
      date: '2023-06-20',
      declaration: 'Declaration',
      value: 179,
      deposit: 0,
      credit: 179,
    },
    {
      date: '2023-06-21',
      declaration: 'Declaration',
      value: 200,
      deposit: 0,
      credit: 200,
    }
  ];

  await sendReport('bondReport.html', 'Bond Report', { data }, res);
})