const { DataTypes } = require("sequelize");
const { db } = require("../../config/database");

const notificationModel = db.define(
  "Notification",
  {
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: "Notification title can't be empty." },
        notNull: { msg: "Notification title can't be null." },
      }
    },
    text: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: "Notification Text can't be empty." },
        notNull: { msg: "Notification Text can't be null." },
      }
    },
    date: {
      type: DataTypes.DATE,
      defaultValue: Date.now
    },
    seen: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    }
  }, { timestamps: false });

module.exports = notificationModel;
