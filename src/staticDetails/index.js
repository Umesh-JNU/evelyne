const contentModel = require("./content.model");
const { createUpdateContent, getContent, deleteContent } = require("./content.controller");
const contentRoute = require("./content.route");

module.exports = { contentModel, getContent, createUpdateContent, deleteContent, contentRoute };
