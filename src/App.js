const express = require("express")
const app = express();
const cors = require("cors");
const QuestionController = require("./controllers/question.controller")
app.use(express.json());
app.use(cors());
app.use("/",QuestionController);

module.exports = app;

// veAY7D4e3WngFJif8uy8g897t6g8h76767rgr765677y5675r566rf6r5765d658477t67;