const { DataTypes } = require("sequelize");
const { db } = require("../../config/database");

const validateEmail = (email) => {
  var re = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  return re.test(email);
};

const contentModel = db.define(
  "Content",
  {
    contact_no: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: "Contact number is required." },
        notNull: { msg: "Contact number is required." },
      },
    },
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
    about_us: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: "About Us is required." },
        notNull: { msg: "About Us is required." },
      },
    },
    privacy_policy: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: "Privacy Policy is required." },
        notNull: { msg: "Privacy Policy is required." },
      },
    },
    terms_and_cond: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: "Terms and Condition is required." },
        notNull: { msg: "Terms and Condition is required." },
      },
    },
  },
  { timestamps: true }
)

module.exports = contentModel;
