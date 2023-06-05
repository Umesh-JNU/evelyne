const { DataTypes } = require("sequelize");
const { db } = require("../../config/database");
const { orderModel } = require("../order");
const { userModel } = require("../user");
const warehouseModel = require("../warehouse/warehouse.model");

const transactionModel = db.define(
  "Transaction",
  {
    mode: {
      type: DataTypes.ENUM("cash", "card", "bank"),
      defaultValue: "cash",
    },
    status: {
      type: DataTypes.ENUM("paid", "processing", "failed"),
      defaultValue: "processing",
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "Amount can't be empty",
        },
        notNull: {
          msg: "Amount can't be null",
        },
      },
    },
  },
  { timestamps: true }
);

transactionModel.warehouseTrans = async function (warehouseId) {
  return await transactionModel.findAll({
    include: [{
      model: orderModel,
      as: "order",
      attributes: ["id", "status"],
      where: { warehouseId },
      include: [{
        model: userModel,
        as: "user",
        attributes: ["id", "fullname"]
      }]
    }],
    attributes: {
      exclude: ["orderId"]
    }
  });
}

transactionModel.getGrpCount = async function (query) {
  console.log({ query });
  return await this.findAll({
    attributes: [
      'status',
      [db.fn('COUNT', db.col('transaction.id')), 'count'],
    ],
    group: ['status'],
    include: [{
      model: orderModel,
      as: 'order',
      where: query,
      attributes: [] // important 
    }],
  });
}

transactionModel.getCounts = async function (query) {
  const result = await this.getGrpCount(query);

  const counts = {
    paid: 0,
    processing: 0,
    failed: 0,
  };

  let total = 0;
  for (let v in result) {
    // console.log({ v }, result[v].dataValues)
    const { status, count } = result[v].dataValues;
    const val = result[v].dataValues;
    console.log(val.status, val.count);

    counts[status] = count;
    total += count
  }
  console.log({ counts });

  return { counts, total };
}


module.exports = transactionModel;
