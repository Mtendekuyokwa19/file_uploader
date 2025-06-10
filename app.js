const path = require("node:path");

const express = require("express");
const app = express();
const router = require("./routes/routes");
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use("/", router);
app.use("signup", router);
app.use("/login", router);

app.listen(3000, function () {
  console.log("listening");
});
