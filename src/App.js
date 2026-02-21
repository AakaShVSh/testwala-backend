const express = require("express");
const cookies = require("cookie-parser");
const app = express();
const cors = require("cors");
const QuestionController = require("./controllers/question.controller");
const RegistrationController = require("./controllers/auth.controller");
const UserTestDataController = require("./controllers/UserTest.Controller");

app.use(express.json());
app.use(cookies());
app.use(cors());

app.use("/auth", RegistrationController);
app.use("/questions", QuestionController);
app.use("/UserTestData", UserTestDataController);

module.exports = app;