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

app.use("/auth",RegistrationController);
app.use("/QuestionStorage",QuestionController);
app.use("/UserTestData", UserTestDataController);

module.exports = app;

// veAY7D4e3WngFJif8uy8g897t6g8h76767rgr765677y5675r566rf6r5765d658477t67;