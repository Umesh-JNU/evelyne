const { DataTypes } = require("sequelize");
const { db } = require("../../config/database");

const validateEmail = (email) => {
  var re = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  return re.test(email);
};

const contactModel = db.define(
  "Contact",
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
  },
  { timestamps: true }
)

module.exports = contactModel;
