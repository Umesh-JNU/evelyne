const { userModel, roleModel } = require("./user.model");
const userController = require("./user.controller");
const userRoute = require("./user.route");

module.exports = { userModel, roleModel, userController, userRoute };
