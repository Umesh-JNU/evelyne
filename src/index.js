const { userRoute, userModel, userController, roleModel } = require("./user");
const { warehouseRoute, warehouseModel, warehouseController } = require("./warehouse");
const { transactionRoute, transactionModel, transactionController } = require("./transaction");
const { invoiceRoute, invoiceModel, invoiceController } = require("./invoice");
const { orderRoute, orderModel, orderController } = require("./order");
const { adminRoute, controllerRoute, managerRoute } = require("./admin");
const { contentRoute, contentModel } = require("./staticDetails");
const { notificationModel } = require("./notifications");
const { orderItemModel } = require("./order/order.model");

userModel.hasMany(notificationModel, { foreignKey: "userId", as: "notifications" });
notificationModel.belongsTo(userModel, { foreignKey: "userId", as: "user" });

orderModel.hasMany(notificationModel, { foreignKey: "orderId", as: "notifications" });
notificationModel.belongsTo(orderModel, { foreignKey: "orderId", as: "order" });

userModel.hasMany(orderModel, { foreignKey: "userId", as: "orders" });
orderModel.belongsTo(userModel, { foreignKey: "userId", as: "user" });

warehouseModel.hasMany(orderModel, { foreignKey: "warehouseId", as: "orders" });
orderModel.belongsTo(warehouseModel, { foreignKey: "warehouseId", as: "warehouse" });

warehouseModel.hasMany(transactionModel, { foreignKey: "warehouseId", as: "transactions" });
transactionModel.belongsTo(warehouseModel, { foreignKey: "warehouseId", as: "warehouse" });

orderModel.hasOne(transactionModel, { foreignKey: "orderId", as: "transaction" });
transactionModel.belongsTo(orderModel, {
  foreignKey: {
    name: "orderId", unique: true
  }, as: "order"
});

// Define one-to-one relationship 
// - one manager has only one warehouse
userModel.hasOne(warehouseModel, { foreignKey: 'managerId', as: 'warehouse' });
warehouseModel.belongsTo(userModel, {
  foreignKey: {
    name: 'managerId', unique: true
  }, as: 'manager'
});

// Define many-to-many relationship
// - one controller may have many warehouses and 
//   one warehouse may have many controllers
userModel.belongsToMany(warehouseModel, { through: "UserWarehouse", as: "warehouses" });
warehouseModel.belongsToMany(userModel, { through: "UserWarehouse", as: "controller" });

// Define one-to-many relationship
// - one controller may have more than warehouse
// userModel.hasMany(warehouseModel, { foreignKey: 'controllerId', as: 'warehouses' });
// warehouseModel.belongsTo(userModel, { foreignKey: 'controllerId', as: 'controller' });

// (async () => {
//   await contentModel.create({
//     "contact_no": "1234567890",
//     "email": "evelyne@gmail.com",
//     "about_us": "About Us",
//     "privacy_policy": "Privacy Policy",
//     "terms_and_cond": "Terms and Condition",
//   });

//   await roleModel.bulkCreate([
//     {
//       "role": "admin"
//     },
//     {
//       "role": "manager"
//     },
//     {
//       "role": "controller"
//     },
//     {
//       "role": "user"
//     }
//   ]);

//   const users = [
//     {
//       "email": "admin@gmail.com",
//       "password": "password",
//       "fullname": "Evelyne",
//       "mobile_no": "000",
//       "country": "country",
//       "city": "city",
//       "avatar": "https://cdn1.iconfinder.com/data/icons/user-pictures/100/boy-512.png",
//       "roleId": 1
//     },
//     {
//       "email": "manager@gmail.com",
//       "password": "password",
//       "fullname": "Manager",
//       "mobile_no": "1112",
//       "country": "country",
//       "city": "city",
//       "avatar": "https://cdn1.iconfinder.com/data/icons/user-pictures/100/boy-512.png",
//       "roleId": 2
//     },
//     {
//       "email": "user@gmail.com",
//       "password": "password",
//       "fullname": "user",
//       "mobile_no": "333",
//       "country": "country",
//       "city": "city",
//       "avatar": "https://cdn1.iconfinder.com/data/icons/user-pictures/100/boy-512.png",
//       "roleId": 4
//     },
//     {
//       "email": "controller@gmail.com",
//       "password": "password",
//       "fullname": "controller",
//       "mobile_no": "222",
//       "country": "country",
//       "city": "city",
//       "avatar": "https://cdn2.iconfinder.com/data/icons/avatars-60/5985/2-Boy-512.png",
//       "roleId": 3
//     },
//     {
//       "email": "user1@gmail.com",
//       "password": "password",
//       "fullname": "user1",
//       "mobile_no": "3333",
//       "country": "country",
//       "city": "city",
//       "avatar": "https://cdn2.iconfinder.com/data/icons/avatars-60/5985/2-Boy-512.png",
//       "roleId": 4
//     }
//   ];
//   for (var u in users) {
//     await userModel.create(users[u])
//   };

//   await warehouseModel.bulkCreate([
//     {
//       "name": "Warehouse 1",
//       "capacity": "1000",
//       "filled": "0",
//       "image": "https://cdn0.iconfinder.com/data/icons/containers/512/palet03.png",
//       "value": "100",
//       "managerId": "2"
//     },
//     {
//       "name": "Warehouse 2",
//       "capacity": "1000",
//       "filled": "0",
//       "image": "https://cdn0.iconfinder.com/data/icons/containers/512/palet03.png",
//       "value": "100"
//     },
//     {
//       "name": "Warehouse 3",
//       "capacity": "1000",
//       "filled": "0",
//       "image": "https://cdn0.iconfinder.com/data/icons/containers/512/palet03.png",
//       "value": "100"
//     }
//   ]);

//   await orderModel.bulkCreate([
//     {
//       "tin_no": "tin_no",
//       "address": "quantum it",
//       "transit_company": "transit_company",
//       "consignee": "consignee",
//       "custom_agent": "custom_agent",
//       "DDCOM_no": "123",
//       "quantity_decl": "quantity_decl",
//       "physical_quant": "physical_quant",
//       "truck_no": "o0123",
//       "container_no": "12345",
//       "transporter": "transporter",
//       "ref_no": "098",
//       "desc_product": "desc_product",
//       "unit": "Kg",
//       "comment": "comment",
//       // "name_counter": "name_counter",
//       // "counter_valid": false,
//       // "manager_valid": false,
//       "customs": "customs",
//       // "client_valid": false,
//       "userId": 3,
//       "warehouseId": 1
//     },
//     {
//       "tin_no": "tin_no",
//       "address": "pune",
//       "transit_company": "transit_company",
//       "consignee": "consignee",
//       "custom_agent": "custom_agent",
//       "DDCOM_no": "123",
//       "quantity_decl": "quantity_decl",
//       "physical_quant": "physical_quant",
//       "truck_no": "o0123",
//       "container_no": "12345",
//       "transporter": "transporter",
//       "ref_no": "098",
//       "desc_product": "desc_product",
//       "unit": "23",
//       "comment": "comment",
//       // "name_counter": "name_counter",
//       // "counter_valid": false,
//       // "manager_valid": false,
//       "customs": "customs",
//       // "client_valid": false,
//       "userId": 3,
//       "warehouseId": 1
//     },
//     {
//       "tin_no": "tin_no",
//       "address": "address",
//       "transit_company": "transit_company",
//       "consignee": "consignee",
//       "custom_agent": "custom_agent",
//       "DDCOM_no": "123",
//       "quantity_decl": "quantity_decl",
//       "physical_quant": "physical_quant",
//       "truck_no": "o0123",
//       "container_no": "12345",
//       "transporter": "transporter",
//       "ref_no": "098",
//       "desc_product": "desc_product",
//       "unit": "Kg",
//       "comment": "comment",
//       // "name_counter": "name_counter",
//       // "counter_valid": false,
//       // "manager_valid": false,
//       "customs": "customs",
//       // "client_valid": false,
//       "userId": 5,
//       "warehouseId": 1
//     },
//     {
//       "tin_no": "",
//       "address": "mumbai",
//       "transit_company": "",
//       "consignee": "",
//       "custom_agent": "",
//       "DDCOM_no": "",
//       "quantity_decl": "",
//       "physical_quant": "",
//       "truck_no": "",
//       "container_no": "",
//       "transporter": "",
//       "ref_no": "",
//       "desc_product": "",
//       "unit": "",
//       "comment": "",
//       // "name_counter": "",
//       // "counter_valid": false,
//       // "manager_valid": false,
//       "customs": "",
//       // "client_valid": false,
//       "userId": 3,
//       "warehouseId": 1
//     }
//   ]);

//   await orderItemModel.bulkCreate([
//     {
//       "name": "rice",
//       "quantity": "5400",
//       "orderId": 1
//     },
//     {
//       "name": "bags",
//       "quantity": "100",
//       "orderId": 1
//     },
//     {
//       "name": "rice",
//       "quantity": "5400",
//       "orderId": 2
//     },
//     {
//       "name": "bags",
//       "quantity": "20",
//       "orderId": 2
//     },
//     {
//       "name": "tiffin box",
//       "quantity": "50",
//       "orderId": 2
//     },
//     {
//       "name": "water bottle ",
//       "quantity": "50",
//       "orderId": 3
//     },
//     {
//       "name": "wheat",
//       "quantity": "50",
//       "orderId": 3
//     },
//     {
//       "name": "rice",
//       "quantity": "100",
//       "orderId": 3
//     },
//     {
//       "name": "red chilles",
//       "quantity": "800",
//       "orderId": 4
//     },
//     {
//       "name": "salt",
//       "quantity": "10000",
//       "orderId": 4
//     },
//     {
//       "name": "lemon",
//       "quantity": "1000",
//       "orderId": 4
//     },
//     {
//       "name": "coconut",
//       "quantity": "200",
//       "orderId": 4
//     }
//   ]);

//   await transactionModel.bulkCreate([
//     {
//       "type": "credit",
//       "desc": "Transaction for order 1",
//       "mode": "cash",
//       "status": "paid",
//       "amount": 1234,
//       "orderId": 1
//     },
//     {
//       "type": "credit",
//       "desc": "Transaction for order 2",
//       "mode": "cash",
//       "status": "paid",
//       "amount": 700,
//       "orderId": 2
//     },
//     {
//       "type": "debit",
//       "desc": "Transaction from warehouse",
//       "mode": "cash",
//       "status": "paid",
//       "amount": 400,
//       "warehouseId": 1
//     }
//   ]);
// })();

module.exports = {
  userRoute, userModel,
  warehouseRoute, warehouseModel,
  transactionRoute, transactionModel,
  invoiceRoute, invoiceModel,
  orderRoute, orderModel,
  adminRoute, controllerRoute, managerRoute,
  contentRoute, contentModel,
};
