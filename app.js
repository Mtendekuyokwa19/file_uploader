const path = require("node:path");
const { PrismaSessionStore } = require("@quixo3/prisma-session-store");
// const { PrismaClient } = require("./generated/prisma/");
const { PrismaClient } = require("@prisma/client");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const express = require("express");
const app = express();
const router = require("./routes/routes");
app.use(
  session({
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // ms
    },
    secret: "a santa at nasa",
    resave: true,
    saveUninitialized: true,
    store: new PrismaSessionStore(new PrismaClient(), {
      checkPeriod: 2 * 60 * 1000, //ms
      dbRecordIdIsSessionId: true,
      dbRecordIdFunction: undefined,
    }),
  })
);
app.use(passport.session());

app.use(express.urlencoded({ extended: true }));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use("/", router);
app.use("signup", router);
app.use("/login", router);
const random = Math.floor(Math.random() * 50);
app.listen(3000, function () {
  console.log(`listening ${3000 + random}`);
});
