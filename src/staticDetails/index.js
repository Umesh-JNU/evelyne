const contentModel = require("./content.model");
const { createContent, updateContent, deleteContent } = require("./content.controller");
const contentRoute = require("./content.route");

module.exports = { contentModel, createContent, updateContent, deleteContent, contentRoute };
