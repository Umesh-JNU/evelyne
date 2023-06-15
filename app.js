const express = require("express");
const cors = require("cors");
const errorMiddleware = require("./middlewares/error");
const dotenv = require("dotenv");
const app = express();

{/**
https://evelyne-api.adaptable.app/api/
*/}

const path = "./config/config.env";
// const path = "./config/local.env";

dotenv.config({ path });

app.use(express.json());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "DELETE", "UPDATE", "PUT", "PATCH"],
    credentials: true,
  })
);

app.get("/", (req, res, next) => res.json({ message: "Server is running" }));

const { userRoute, warehouseRoute, transactionRoute, invoiceRoute, orderRoute, adminRoute, controllerRoute, managerRoute, contentRoute } = require("./src");
const reportRoute = require("./src/report/report.route");
const { notificationRoute } = require("./src/notifications");
app.use("/api/user", userRoute);
app.use("/api/warehouse", warehouseRoute);
app.use("/api/transaction", transactionRoute);
app.use("/api/invoice", invoiceRoute);
app.use("/api/order", orderRoute);
app.use("/api/admin", adminRoute);
app.use("/api/controller", controllerRoute);
app.use("/api/manager", managerRoute);
app.use("/api/content", contentRoute);
app.use("/api/notification", notificationRoute);
app.use("/api/report", reportRoute);

app.all("*", async (req, res) => {
  res
    .status(404)
    .json({
      error: {
        message: "Not Found. Kindly Check the API path as well as request type",
      },
    });
});

app.use(errorMiddleware);

module.exports = app;
