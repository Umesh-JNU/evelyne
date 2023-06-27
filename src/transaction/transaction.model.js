const { DataTypes } = require("sequelize");
const { db } = require("../../config/database");
const { orderModel } = require("../order/order.model");
const { userModel } = require("../user/user.model");

const commentModel = db.define(
  "Comments",
  {
    comment: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: "Comment can't empty." },
        notNull: { msg: "Comment can't be null." }
      }
    }
  },
  { timestamps: true }
);

const transactionModel = db.define(
  "Transaction",
  {
    type: {
      type: DataTypes.ENUM("debit", "credit"),
      defaultValue: "credit",
    },
    desc: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "Description can't be empty",
        },
        notNull: {
          msg: "Description can't be null",
        },
      },
    },
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

transactionModel.addScope('defaultScope', {
  include: [{
    model: commentModel,
    as: 'comments',
    attributes: ["id", "comment"]
  }]
});

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
    },
    order: [['createdAt', 'DESC']]
  });
}

transactionModel.getGrpCount = async function (query) {
  console.log({ query });
  return await this.findAll({
    attributes: ['status', [db.fn('COUNT', db.col('Transaction.id')), 'count']],
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


transactionModel.hasMany(commentModel, { foreignKey: "transactionId", as: "comments" });
commentModel.belongsTo(transactionModel, { foreignKey: "transactionId", as: "transaction" });

module.exports = { transactionModel, commentModel };
