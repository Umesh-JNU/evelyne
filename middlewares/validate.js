const ErrorHandler = require("../utils/errorHandler")

class Validate {
  constructor() {
    this.userAttr = {
      create: ["fullname", "email", "password", "mobile_no", "country", "city"],
      update: [""]
    }

    this.warehouseAttr = {
      assign: ["warehouses", "controllerId", "warehouse", "managerId", "controllers", "warehouseId"]
    }

    this.missingFields = (fields, req) => {
      const reqFields = new Set(Object.keys(req.body));
      const misFields = fields.filter(k => !reqFields.has(k));
      return misFields.length > 0 && `Required Fields ${misFields.join(', ')}`;
    }

    this.warehouseAssign = (req) => {
      const reqFields = new Set(Object.keys(req.body));
      if (reqFields.size === 0)
        return `Required Fields ${this.warehouseAttr.assign.join(', ')}`;

      if (reqFields.has("controllerId") && !reqFields.has("warehouses"))
        return 'Required Field warehouses';

      if (!reqFields.has("controllerId") && reqFields.has("warehouses"))
        return 'Required Field controllerId';

      if (reqFields.has("controllers") && !reqFields.has("warehouseId"))
        return 'Required Field warehouseId';

      if (!reqFields.has("controllers") && reqFields.has("warehouseId"))
        return 'Required Field controllers';

      if (reqFields.has("managerId") && !reqFields.has("warehouse"))
        return 'Required Field warehouse';

      if (!reqFields.has("managerId") && reqFields.has("warehouse"))
        return 'Required Field managerId';
    }
  }

  user = {
    post: async (req, res, next) => {
      console.log("Inside user validate");
      const misFields = this.missingFields(this.userAttr.create, req);
      if (misFields)
        return next(new ErrorHandler(misFields, 400));
    }
  }

  warehouse = {
    assign: async (req, res, next) => {
      const misFields = this.warehouseAssign(req);
      if (misFields) return next(new ErrorHandler(misFields, 400));
      next();
    }
  }
}

module.exports = new Validate();