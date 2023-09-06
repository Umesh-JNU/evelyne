const { DataTypes, where, Op } = require("sequelize");
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
    type: DataTypes.DATE,
  },
  inbound_date: {
    type: DataTypes.DATE,
  },
  trans_date: {
    type: DataTypes.DATE
  },
  exit_date: {
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
  // name_counter: {
  //   type: DataTypes.STRING
  // },
  // counter_valid: {
  //   type: DataTypes.BOOLEAN,
  //   defaultValue: false,
  // },
  // name_manager: {
  //   type: DataTypes.STRING
  // },
  // manager_valid: {
  //   type: DataTypes.BOOLEAN,
  //   defaultValue: false,
  // },
  customs: {
    type: DataTypes.STRING
  },
  // Client name,
  client_valid: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  status: {
    type: DataTypes.ENUM("arrived", "out-bound", "in-bound", "in-tranship", "out-tranship", "exit"),
    defaultValue: "arrived",
  },
  parentId: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, { timestamps: true });

const includeCountAttr = [
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
];

orderModel.warehouseOrders = async function (warehouseId, status) {
  let whereQuery = { warehouseId };
  if (status) {
    whereQuery = { warehouseId, status };
  } 
  else {
    whereQuery = {
      warehouseId, status: ["in-bound", "out-bound", "out-tranship", "exit"] // exclude in-tranship and arrived
    }
  }

  return await orderModel.findAll({
    where: whereQuery,
    attributes: {
      include: includeCountAttr,
      exclude: [...Object.keys(orderModel.rawAttributes).filter(attr => !["id", "status", "updatedAt"].includes(attr)), "userId", "warehouseId"]
    },
    order: [['createdAt', 'DESC']]
  })
}

orderModel.getGrpCount = async function (query) {
  return await this.findAll({
    where: query,
    attributes: ['status', [db.fn('COUNT', db.col('id')), 'count']],
    group: ['status'],
  });
}

orderModel.getCounts = async function (query) {
  const result = await this.getGrpCount(query);

  const counts = {
    arrived: 0,
    'out-bound': 0,
    'in-bound': 0,
    'in-tranship': 0,
    'out-tranship': 0
  };

  let total = 0;
  for (let v in result) {
    // console.log({ v }, result[v].dataValues)
    const { status, count } = result[v].dataValues;
    const val = result[v].dataValues;
    console.log(val.status, val.count);

    counts[status] = count;
    total += count;
  }
  console.log({ counts });

  return { counts, total };
}

orderModel.hasMany(orderItemModel, { foreignKey: "orderId", as: "items" });
orderItemModel.belongsTo(orderModel, { foreignKey: "orderId", as: "order" });

module.exports = { orderModel, orderItemModel, includeCountAttr };
