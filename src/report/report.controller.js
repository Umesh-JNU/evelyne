const ErrorHandler = require("../../utils/errorHandler")
const catchAsyncError = require("../../utils/catchAsyncError")

var pdf = require("pdf-creator-node");
var fs = require("fs");
const path = require('path');
const { orderModel, orderItemModel, includeCountAttr, includeValueAttr } = require("../order/order.model");
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
  format: "A4",
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
      default: '<span style="color: #444; float: right;">{{page}}</span>' // /<span>{{pages}}</span>', // fallback value
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

const notNull = { [Op.ne]: null };

const getOrdersJSON = async (date_type, warehouseId, startDate, endDate, symbol) => {
  const dt = {
    'arrival_date': 'arrival_date',
    'exit_date': 'exit_date',
    'in_trans': 'arrival_date',
    'out_trans': 'trans_date'
  }[date_type];

  switch (date_type) {
    case 'arrival_date':
      var query = {
        arrival_date: notNull,
        arrival_date: {
          [Op.gte]: startDate,
          [Op.lt]: endDate,
        },
        status: 'arrived',
        parentId: notNull
      }
      break;

    case 'exit_date':
      var query = {
        exit_date: notNull,
        exit_date: {
          [Op.gte]: startDate,
          [Op.lt]: endDate,
        },
        status: 'exit',
        parentId: notNull
      }
      break;

    case 'in_trans':
      var query = {
        arrival_date: notNull,
        arrival_date: {
          [Op.gte]: startDate,
          [Op.lt]: endDate,
        },
        status: 'in-tranship',
      }
      break;

    case 'out_trans':
      var query = {
        trans_date: notNull,
        trans_date: {
          [Op.gte]: startDate,
          [Op.lt]: endDate,
        },
        status: 'out-tranship'
      }
      break;

    default:
      throw new ErrorHandler('Something Went Wrong', 500);
  }

  console.log({ query, warehouseModel });

  const orderItems = await orderItemModel.findAll({
    include: [
      {
        model: orderModel,
        as: "order",
        where: {
          warehouseId,
          ...query
        },
        include: [{
          model: userModel,
          as: "user",
          attributes: ["id", "fullname"],
          paranoid: false
        }],
        attributes: ["id", "DDCOM_no", "arrival_date", "trans_date", "exit_date", "userId"]
      }
    ]
  });
  // return orderItems;
  const orders = await orderModel.findAll({
    where: {
      warehouseId,
      ...query
    },
    include: [{
      model: userModel,
      as: "user",
      attributes: ["id", "fullname"]
    }, {
      model: orderItemModel,
      as: "items",
      attributes: ["id", "name", "quantity", "value", "weight", "local_val"],
    }],
    attributes: {
      include: includeCountAttr
    }
  });

  // map a particular user with thier orders
  let groupedOrders = {};
  orderItems.forEach(item => {
    const userId = item.order.userId;
    if (!groupedOrders[userId]) {
      groupedOrders[userId] = [];
    }
    groupedOrders[userId].push(item.toJSON());
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
      order[dt] = order.order[dt].toISOString().split('T')[0];
      order.DDCOM_no = order.order.DDCOM_no,
        order.ttlValue = order.value * order.quantity,
        order.ttlWeight = order.weight * order.quantity,
        order.local_val = order.local_val * order.quantity,
        index++;
    })
  });

  // now the above list in below format
  // for eg [
  //   {client_name: order1.user.fullname, orders: [order1, order2],           // for user1
  //   {client_name: order1.user.fullname, orders: [order1, order2, order3],   // for user1
  // ]
  groupedOrders = groupedOrders.map(orders => {
    console.log({ orders })

    return { client_name: orders[0].order.user.fullname, orders, symbol }
  })

  console.log({ groupedOrders });
  return groupedOrders;
};

const formattedDate = (date) => {
  if (!date || isNaN(date)) return;
  return date.toISOString().split('T')[0];
};

const formattedOrder = (order) => {
  console.log({ order })
  order.arrival_date = formattedDate(order.arrival_date);
  order.trans_date = formattedDate(order.trans_date);
  order.exit_date = formattedDate(order.exit_date);
  order.last_storage_date = formattedDate(order.last_storage_date);
  order.createdAt = formattedDate(order.createdAt);
  order.updatedAt = formattedDate(order.updatedAt);
  if (order.transaction)
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

  const warehouse = await warehouseModel.findByPk(id);
  if (!warehouse) {
    return next(new ErrorHandler("Warehouse Not Found", 404));
  }
  const year = parseInt(req.query.year);
  const month = parseInt(req.query.month) - 1;
  const date = req.query.date;

  console.log({ month, date, year })
  let template = "warehouseReport.html";
  // let template = "template.html";
  if (year) {
    var title = `Yearly Report - ${year}`;
    var startDate = new Date(Date.UTC(year, 0, 1));
    var endDate = new Date(Date.UTC(year + 1, 0, 1));
    console.log({ startDate, endDate });
  }
  else if (month >= 0) {
    var title = `Monthly Report - ${new Date(0, month).toLocaleString('en', { month: 'long' })}`;
    const currentYear = new Date().getFullYear();
    var startDate = new Date(Date.UTC(currentYear, month, 1));
    var endDate = new Date(Date.UTC(currentYear, month + 1, 1));
  }
  else if (date) {
    // template = "daily.html";
    var title = "Daily Report";
    var startDate = new Date(date);
    startDate.setUTCHours(0, 0, 0, 0);
    var endDate = new Date(date);
    endDate.setUTCHours(24, 0, 0, 0);
  }
  else {
    return next(new ErrorHandler("Bad Request", 400));
  }

  const arrivedOrders = await getOrdersJSON('arrival_date', id, startDate, endDate, warehouse.symbol);
  const inTransOrders = await getOrdersJSON('in_trans', id, startDate, endDate, warehouse.symbol);
  const outTransOrders = await getOrdersJSON('out_trans', id, startDate, endDate, warehouse.symbol);
  const exitOrders = await getOrdersJSON('exit_date', id, startDate, endDate, warehouse.symbol);

  if (arrivedOrders.length === 0 && inTransOrders.length === 0 && outTransOrders.length === 0 && exitOrders.length === 0) {
    return next(new ErrorHandler("No orders", 400));
  }
  // return res.json({arrivedOrders, inTransOrders, outTransOrders, exitOrders})
  console.log("download report", req.query);
  // return res.json({ arrivedOrders, inTransOrders, outTransOrders, exitOrders });
  await sendReport(template, { heading: title, arrivedOrders, inTransOrders, outTransOrders, exitOrders }, res);
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
        attributes: ["id", "fullname"],
        paranoid: false
      }],
      attributes: ["id", "name", "image"],
    },
    {
      model: userModel,
      as: "user",
      attributes: ["id", "fullname"],
      paranoid: false
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
        attributes: ["id", "fullname"],
        paranoid: false,
      }, {
        model: warehouseModel,
        as: "warehouse",
        attributes: ["id", "name"],
        include: [{
          model: userModel,
          as: "manager",
          attributes: ["id", "fullname"],
          paranoid: false
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
  const { FROM, TO } = req.query;

  if (!FROM || !TO) {
    return next(new ErrorHandler("Please select the from and to date.", 400));
  }

  const startDate = new Date(FROM);
  startDate.setUTCHours(0, 0, 0, 0);
  const endDate = new Date(TO);
  endDate.setUTCHours(24, 0, 0, 0);

  const getOrder = async (dateKey, isParent, status) => {
    return await orderModel.findAll({
      where: {
        status,
        ...isParent,
        [dateKey]: {
          [Op.gte]: startDate,
          [Op.lt]: endDate,
        },
        warehouseId: id,
      },
      attributes: {
        include: includeValueAttr
      }
    });
  };

  const arrivalOrders = await getOrder("arrival_date", { parentId: notNull }, 'arrived');
  const exitOrders = await getOrder("exit_date", { parentId: notNull }, 'exit');
  const transOrders = await getOrder("trans_date", {}, 'out-tranship');

  let orders = [...arrivalOrders, ...exitOrders, ...transOrders];

  const warehouse = await warehouseModel.findByPk(id);
  if (!warehouse) {
    return next(new ErrorHandler("Warehouse not found", 400));
  }

  if (orders.length <= 0) {
    return next(new ErrorHandler("No Order arrived / exit / tranship for given dates.", 400));
  }

  const keyMap = {
    arrived: 'arrival_date',
    exit: 'exit_date',
    "out-tranship": 'trans_date',
  };
  orders = orders.map(order => ({
    status: order.status,
    ttlVal: parseFloat(order.get('totalValue')),
    declaration: order.DDCOM_no,
    warehouseVal: order.warehouseVal,
    date: order[keyMap[order.status]],
    id: order.status === 'out-tranship' ? order.id : order.parentId
  }));

  orders.sort((o1, o2) => new Date(o1.date) - new Date(o2.date));

  let value = warehouse.capacity - orders[0].warehouseVal;
  const initialVal = value;
  let valueData = [];

  orders.forEach(order => {
    order.date = new Date(order.date).toISOString().slice(0, 10);
    switch (order.status) {
      case 'arrived':
        value -= order.ttlVal;
        valueData.push({
          ...order,
          value: value,
          credit: order.ttlVal,
          debit: 0
        });
        break;

      case 'exit':
        value += order.ttlVal;
        valueData.push({
          ...order,
          value: value,
          credit: 0,
          debit: order.ttlVal
        });
        break;

      case 'out-tranship':
        valueData.push({
          ...order,
          value: value - order.ttlVal,
          credit: order.ttlVal,
          debit: 0
        });
        valueData.push({
          ...order,
          value: value,
          credit: 0,
          debit: order.ttlVal
        });
        break;

      default:
        break;
    }
  });

  await sendReport('bondReport.html', { heading: 'Bond Report', data: valueData, name: warehouse.name, capacity: initialVal }, res);
});

exports.getOrderPDF = catchAsyncError(async (req, res, next) => {
  console.log({ q: req.query })
  const heading = {
    'ARRIVAL': "Goods Arrival Notice",
    'TRANSHIP': "Goods Transhipment Notice",
    'EXIT': "Goods Exit Notice"
  }[req.query.notice];
  const noticeSts = {
    'ARRIVAL': "arrived",
    'TRANSHIP': "out-tranship",
    'EXIT': "exit"
  }[req.query.notice];

  const { id } = req.params;
  const userId = req.userId;

  const order = await orderModel.findOne({
    where: { id, status: noticeSts },
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
        where: { id: userId },
        attributes: ["id", "fullname"],
        paranoid: false
      }],
      attributes: ["id", "name", "image"],
    },
    {
      model: userModel,
      as: "user",
      attributes: ["id", "fullname"],
      paranoid: false
    }],
    attributes: {
      include: includeCountAttr,
      exclude: ["userId", "warehouseId"]
    }
  });

  if (!order) return next(new ErrorHandler("Order not found", 404));

  await sendReport(`${req.query.notice}.html`, { heading, order: formattedOrder(order.toJSON()) }, res);
});