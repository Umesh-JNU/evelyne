const { DataTypes } = require("sequelize");
const { db } = require("../../config/database");

const notificationModel = db.define(
  "Notification",
  {
    // notification: {
    //   type: DataTypes.ENUM("arrived", "in-bound", "out-bound"),
    //   allowNull: false,
    //   validate: {
    //     notEmpty: { msg: "Notification can't be empty." },
    //     notNull: { msg: "Notification can't be null." },
    //   }
    // },
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
