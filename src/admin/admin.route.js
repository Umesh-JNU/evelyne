const express = require('express');
const router = express.Router();
const { auth, authRole } = require("../../middlewares/auth");

const { getAllUsers, getUser, updateUser, deleteUser } = require('./admin.controller').userController;

const { createContent, updateContent, deleteContent } = require("../staticDetails/content.controller");

const { createWarehouse, updateWarehouse, deleteWarehouse } = require("../warehouse");

router.get("/users", auth, authRole(["admin"]), getAllUsers);
router.route("/user/:id")
  .get(auth, authRole(["admin"]), getUser)
  .put(auth, authRole(["admin"]), updateUser)
  .delete(auth, authRole(["admin"]), deleteUser);

router.post("/content", auth, authRole("admin"), createContent);
router.route("/content/:id")
  .put(auth, authRole("admin"), updateContent)
  .delete(auth, authRole("admin"), deleteContent);

router.post("/warehouse", auth, authRole("admin"), createWarehouse);
router.route("/warehouse/:id")
  .put(auth, authRole("admin"), updateWarehouse)
  .delete(auth, authRole("admin"), deleteWarehouse);
  
module.exports = router;