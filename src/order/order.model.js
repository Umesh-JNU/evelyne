const { DataTypes, where, Op } = require("sequelize");
const { db } = require("../../config/database");

const isDate = (date) => {
  return ((date instanceof Date) && new Date(date) !== "Invalid Date") && !isNaN(new Date(date));
}

const orderItemModel = db.define("OrderItem", {
  itemId: {
    type: DataTypes.INTEGER
  },
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
      notNull: { msg: "Item Quantity is required" },
      notEmpty: { msg: "Item Quantity is required" },
      isNumeric: {
        args: true,
        msg: "Quantity must be a number."
      }
    }
  },
  weight: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      notNull: { msg: "Item Weight/package is required" },
      notEmpty: { msg: "Item Weight/package is required" },
      isNumeric: {
        args: true,
        msg: "Weight must be a number."
      }
    }
  },
  value: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      notNull: { msg: "Item Value/package is required" },
      notEmpty: { msg: "Item Value/package is required" },
      isNumeric: {
        args: true,
        msg: "Value must be a number."
      }
    }
  },
  local_val: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      notNull: { msg: "Item Local Value is required" },
      notEmpty: { msg: "Item Local Value is required" },
      isNumeric: {
        args: true,
        msg: "Local Value must be a number."
      }
    }
  }
}, { timestamps: true });

const orderModel = db.define("Order", {
  orderType: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isValidOrderType: function (type) {
        return ['arrival', 'tranship', 'complete', 'partial'].includes(type);
      }
    }
  },
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
    validate: {
      isValidDate: function (value) {
        if (!value || !isDate(value)) {
          throw new Error('Empty or invalid exit date.');
        }
      }
    }
  },
  // inbound_date: {
  //   type: DataTypes.DATE,
  //   validate: {
  //     isValidDate: function (value) {
  //       if (!value || !isDate(value)) {
  //         throw new Error('Empty or invalid exit date.');
  //       }
  //     }
  //   }
  // },
  trans_date: {
    type: DataTypes.DATE,
    validate: {
      isValidDate: function (value) {
        if (!value || !isDate(value)) {
          throw new Error('Empty or invalid exit date.');
        }
      }
    }
  },
  exit_date: {
    type: DataTypes.DATE,
    validate: {
      isValidDate: function (value) {
        if (!value || !isDate(value)) {
          throw new Error('Empty or invalid exit date.');
        }
      }
    }
  },
  last_storage_date: {
    type: DataTypes.DATE,
    validate: {
      isValidDate: function (value) {
        if (!value || !isDate(value)) {
          throw new Error('Empty or invalid exit date.');
        }
      }
    }
  },
  truck_no: {
    type: DataTypes.STRING
  },
  truck_no_to: {
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
    type: DataTypes.ENUM("arrived", "out-bound", "in-bound", "in-tranship", "out-tranship", "exit", "discarded"),
    defaultValue: "arrived",
  },
  warehouseVal: {
    type: DataTypes.INTEGER,
  },
  parentId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  subOrderId: {
    type: DataTypes.INTEGER
  }
}, { timestamps: true });
    
const includeValueAttr = [[
  db.literal(`(
      SELECT IFNULL(SUM(quantity * value), 0) 
      FROM OrderItems AS item
      WHERE	item.orderId = Order.id
  )`),
  'totalValue'
]];

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
        SELECT IFNULL(SUM(quantity), 0) 
        FROM OrderItems AS item
        WHERE	item.orderId = Order.id
    )`),
    'totalWeight'
  ]
];

orderModel.addHook('beforeCreate', async (order, options) => {
  if (order.parentId) {
    const nextAutoIncrementValue = await getNextAutoIncrementValue(order.parentId);
    console.log({ nextAutoIncrementValue })
    order.subOrderId = nextAutoIncrementValue;
  }
});

async function getNextAutoIncrementValue(parentId) {
  // Query the database to find the next auto-incremented value for parentId
  const result = await orderModel.findOne({
    where: { parentId },
    attributes: [
      [db.fn('max', db.col('subOrderId')), 'max_auto_increment'],
    ],
  });

  console.log({ result })
  const maxAutoIncrement = result.get('max_auto_increment') || 0;
  return maxAutoIncrement + 1;
}


orderModel.warehouseOrders = async function (warehouseId, status) {
  console.log({ warehouseId, status })
  let whereQuery = { warehouseId };
  switch (status) {
    case 'arrived':
    case 'in-tranship':
      whereQuery = { warehouseId, status, parentId: null }
      break;
    case 'out-bound':
      whereQuery = { warehouseId, status, [Op.not]: { parentId: null } }
      break;
    default:
      whereQuery = {
        warehouseId, status: ["in-bound", "out-tranship", "exit"], parentId: null // exclude in-tranship and arrived
      }
      break;
  }

  console.log({ whereQuery })
  return await this.findAll({
    where: whereQuery,
    attributes: {
      include: includeCountAttr,
      exclude: [...Object.keys(this.rawAttributes).filter(attr => !["id", "status", "parentId", "updatedAt"].includes(attr)), "userId", "warehouseId"]
    },
    order: [['createdAt', 'DESC']]
  })
}

orderModel.getGrpCount = async function (query) {
  console.log({ query })
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
    'out-tranship': 0,
    exit: 0,
  };

  let total = 0;
  for (let v in result) {
    // console.log({ v }, result[v].dataValues)
    const { status, count } = result[v].dataValues;
    const val = result[v].dataValues;
    console.log({ s: val.status, c: val.count });

    counts[status] = count;
    total += count;
  }
  console.log({ counts });

  return {
    counts: {
      ...counts,
      'tranship': counts["in-tranship"] + counts["out-tranship"],
      'out-bound': await this.count({ where: { status: 'out-bound', parentId: { [Op.ne]: null } } })
    }, total
  };
}

orderModel.hasMany(orderItemModel, { foreignKey: "orderId", as: "items" });
orderItemModel.belongsTo(orderModel, { foreignKey: "orderId", as: "order" });

module.exports = { orderModel, orderItemModel, includeCountAttr, includeValueAttr };
