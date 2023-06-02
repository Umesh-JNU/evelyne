const { DataTypes } = require("sequelize");
const { db } = require("../../config/database");

const orderItemModel = db.define("OrderItem", {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notNull: { msg: "Item name is required" },
      notEmpty: { msg: "Item name is required" },
    },
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      isNumeric: {
        args: true,
        msg: "Quantity must be a number."
      }
    }
  }
}, { timestamps: true });

const orderModel = db.define("Order", {
  tin_no: {
    type: DataTypes.STRING
  },
  address: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notNull: { msg: "Address is required" },
      notEmpty: { msg: "Address is required" },
    },
  },
  transit_company: {
    type: DataTypes.STRING
  },
  consignee: {
    type: DataTypes.STRING
  },
  custom_agent: {
    type: DataTypes.STRING
  },
  DDCOM_no: {
    type: DataTypes.STRING
  },
  //  No of item,
  //  Weigh,
  quantity_decl: {
    type: DataTypes.STRING
  },
  physical_quant: {
    type: DataTypes.STRING
  },
  arrival_date: {
    type: DataTypes.DATE
  },
  last_storage_date: {
    type: DataTypes.DATE
  },
  truck_no: {
    type: DataTypes.STRING
  },
  container_no: {
    type: DataTypes.STRING
  },
  transporter: {
    type: DataTypes.STRING
  },
  ref_no: {
    type: DataTypes.STRING
  },
  desc_product: {
    type: DataTypes.STRING
  },
  unit: {
    type: DataTypes.STRING
  },
  //  Warehouse
  comment: {
    type: DataTypes.STRING
  },
  name_counter: {
    type: DataTypes.STRING
  },
  counter_valid: {
    type: DataTypes.BOOLEAN
  },
  name_manager: {
    type: DataTypes.STRING
  },
  manager_valid: {
    type: DataTypes.STRING
  },
  customs: {
    type: DataTypes.STRING
  },
  // Client name,
  client_valid: {
    type: DataTypes.STRING
  },
  status: {
    type: DataTypes.ENUM("arrived", "in-bound", "out-bound"),
    defaultValue: "in-bound",
  },
},
  { timestamps: true }
);

orderModel.getCounts = async function (query) {
  return await this.findAll({
    where: query,
    attributes: ['status', [db.fn('COUNT', db.col('id')), 'count']],
    group: ['status'],
  });
}

const subQueryAttr = {
  include: [
    [
      // Note the wrapping parentheses in the call below!
      db.literal(`(
          SELECT COUNT(*)
          FROM OrderItems AS item
          WHERE	item.orderId = Order.id
      )`),
      'itemCount'
    ],
    [
      db.literal(`(
          SELECT SUM(quantity)
          FROM OrderItems AS item
          WHERE	item.orderId = Order.id
      )`),
      'totalWeight'
    ]
  ]
};

orderModel.hasMany(orderItemModel, { foreignKey: "orderId", as: "items" });
orderItemModel.belongsTo(orderModel, { foreignKey: "orderId", as: "order" });

module.exports = { orderModel, orderItemModel, subQueryAttr };
