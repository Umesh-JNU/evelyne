const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { DataTypes } = require("sequelize");
const { db } = require("../../config/database");

const validateEmail = (email) => {
  var re = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  return re.test(email);
};
const userModel = db.define(
  "User",
  {
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: {
        args: true,
        msg: "Email address already in use!",
      },
      validate: {
        notNull: { msg: "Email is required" },
        notEmpty: { msg: "Email is required" },
        isEmail: function (value) {
          if (value !== '' && !validateEmail(value)) {
            throw new Error('Invalid email address');
          }
        }
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: {
          args: [8],
          msg: "Password must be at least 8 characters long",
        },
        notNull: { msg: "Password is required" },
        notEmpty: { msg: "Password is required" },
      },
    },
    fullname: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: { msg: "Name is required" },
        notEmpty: { msg: "Name is required" },
      },
    },

    mobile_no: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: {
        args: true,
        msg: "Phone number is already in use!",
      },
      validate: {
        notNull: { msg: "Phone is required" },
        notEmpty: { msg: "Phone is required" },
      },
    },
    country: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: { msg: "Country is required" },
        notEmpty: { msg: "Country is required" },
      },
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: { msg: "City is required" },
        notEmpty: { msg: "City is required" },
      },
    }
  },
  {
    timestamps: true,
    paranoid: true,
    defaultScope: {
      attributes: { exclude: ["password", "deletedAt"] },
    },
    scopes: {
      withPassword: {
        attributes: { include: ["password"] },
      },
    },
  }
);

userModel.beforeSave(async (user, options) => {
  if (user.changed("password")) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
  }
});
userModel.prototype.getJWTToken = function () {
  return jwt.sign({ userId: this.id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_TOKEN_EXPIRE,
  });
};

userModel.prototype.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userModel.getUpdateFields = function (userData) {
  const attributes = Object.keys(this.rawAttributes);
  const defaultFields = [
    "id",
    "createdAt",
    "updatedAt",
    "deletedAt",
    "password",
    "role",
  ];
  const updateFields = attributes.filter(
    (attribute) => !defaultFields.includes(attribute)
  );

  return Object.fromEntries(
    Object.entries(userData).filter(([key, value]) =>
      updateFields.includes(key)
    )
  );
};

const roleModel = db.define(
  "Role",
  {
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: { msg: "Role is required" },
        notEmpty: { msg: "Role is required" },
      },
    }
  },
  { timestamps: true }
)

roleModel.hasMany(userModel, { foreignKey: "roleId", as: "user" });
userModel.belongsTo(roleModel, { foreignKey: "roleId", as: "userRole" });

(async() => {
  await roleModel.create({role: "user"});
  await roleModel.create({role: "manager"});
  await roleModel.create({role: "controller"});
  await roleModel.create({role: "admin"});
})();

module.exports = { userModel, roleModel };
