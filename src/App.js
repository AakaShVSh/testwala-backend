// const express = require("express");
// const cookies = require("cookie-parser");
// const app = express();
// const cors = require("cors");
// const QuestionMathController = require("./controllers/question.math.controller");
// const QuestionEngController = require("./controllers/question.Eng.controller");
// const QuestionVocabularyController = require("./controllers/question.vocabulary.controller");
// const QuestionmathTwoController = require("./controllers/question.mathTwo.controller");
// const QuestionGsController = require("./controllers/question.gs.controller");
// const QuestionReasoningController = require("./controllers/question.reasoning");

// const RegistrationController = require("./controllers/auth.controller");
// const UserTestDataController = require("./controllers/UserTest.Controller");
// app.use(express.json());
// app.use(cookies());
// app.use(cors());

// app.use("/auth",RegistrationController);
// app.use("/QuestionStorage/math", QuestionMathController);
// app.use("/QuestionStorage/Eng", QuestionEngController);
// app.use("/QuestionStorage/gs", QuestionGsController);
// app.use("/QuestionStorage/Reasoning", QuestionReasoningController);
// app.use("/QuestionStorage/vocabulary", QuestionVocabularyController);
// app.use("/QuestionStorage/mathtwo", QuestionmathTwoController);
// app.use("/UserTestData", UserTestDataController);

// module.exports = app;

// // veAY7D4e3WngFJif8uy8g897t6g8h76767rgr765677y5675r566rf6r5765d658477t67;

// const express = require("express");
// const cookies = require("cookie-parser");
// const cors = require("cors");
// const app = express();

// // ── Unified question controller (replaces all 6 subject controllers) ──
// const QuestionController = require("./controllers/question.controller");

// // ── Other controllers (unchanged) ──
// const RegistrationController = require("./controllers/auth.controller");
// const UserTestDataController = require("./controllers/UserTest.Controller");

// app.use(express.json());
// app.use(cookies());
// app.use(cors());

// // Auth
// app.use("/auth", RegistrationController);

// // Single route handles ALL subjects — filter via ?subject=math, ?subject=english, etc.
// app.use("/questions", QuestionController);

// // User test data
// app.use("/UserTestData", UserTestDataController);

// module.exports = app;

const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const app = express();

app.use(express.json());
const allowedOrigins = [
  "https://revisionkarlo.in",
  "https://www.revisionkarlo.in",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(cookieParser());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Auth ──────────────────────────────────────────────────────────────────
app.use("/auth", require("./controllers/auth.controller"));

// ── Questions (all subjects via ?subject=math, ?subject=english …) ────────
app.use("/questions", require("./controllers/question.controller"));

// ── User test data ────────────────────────────────────────────────────────
app.use("/UserTestData", require("./controllers/UserTest.Controller"));

// ── Coaching, Tests, Results ──────────────────────────────────────────────
app.use("/coaching", require("./controllers/coaching.controller"));
app.use("/tests", require("./controllers/test.controller"));
app.use("/results", require("./controllers/result.controller"));

module.exports = app;