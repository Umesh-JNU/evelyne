const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { DataTypes } = require("sequelize");
const { db } = require("../../config/database");
const ErrorHandler = require("../../utils/errorHandler");

const validateEmail = (email) => {
  var re = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  return re.test(email);
};

const random_profile = () => {
  const img_urls = [
    "https://cdn2.iconfinder.com/data/icons/avatars-60/5985/2-Boy-512.png",
    "https://cdn2.iconfinder.com/data/icons/avatars-60/5985/4-Writer-1024.png",
    "https://cdn2.iconfinder.com/data/icons/avatars-60/5985/40-School_boy-512.png",
    "https://cdn2.iconfinder.com/data/icons/avatars-60/5985/12-Delivery_Man-128.png",
    "https://cdn1.iconfinder.com/data/icons/user-pictures/100/boy-512.png",
  ]

  const idx = Math.floor(Math.random() * img_urls.length);
  return img_urls[idx];
}
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
    },
    avatar: {
      type: DataTypes.STRING,
      defaultValue: random_profile()
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
  console.log("user", user, user.changed("password"));
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

userModel.getHandler = async function (userId, next) {
	const handler = await this.findByPk(userId, {
		include: [{
			model: roleModel,
			as: "userRole",
			attributes: ["role"]
		}],
	});

	if (!handler) return next(new ErrorHandler("User with specified role not found.", 404));

	return handler;
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

const otpModel = db.define(
  "OTP",
  {
    otp: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: { msg: "OTP cannot be null." },
        notEmpty: { msg: "OTP cannot be empty." },
      },
    }
  },
  { timestamps: true }
);

otpModel.prototype.isValid = async function (givenOTP) {
  const user = await userModel.findByPk(this.userId);
  if(!user) return false;

  const otpValidityDuration = 15 * 60 * 1000; // 15 minutes in milliseconds
  const currentTime = new Date().getTime();
  const otpCreationTime = new Date(this.createdAt).getTime();

  // Calculate the time difference between current time and OTP creation time
  const timeDifference = currentTime - otpCreationTime;

  // Check if the time difference is within the OTP validity duration
  return timeDifference <= otpValidityDuration;
};

roleModel.hasMany(userModel, { foreignKey: "roleId", as: "user" });
userModel.belongsTo(roleModel, { foreignKey: "roleId", as: "userRole" });

userModel.hasOne(otpModel, { foreignKey: "userId", as: "otp" });
otpModel.belongsTo(userModel, { foreignKey: "userId", as: "user" });

module.exports = { userModel, roleModel, otpModel };
