const router = require("express").Router();
const LocalStrategy = require("passport-local").Strategy;
const passport = require("passport");
// const { PrismaClient } = require("../generated/prisma/");
const { PrismaClient } = require("../generated/prisma/");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();
require("dotenv").config();

router.get("/", (req, res) => {
  res.render("index");
});

router.get("/login", (req, res) => {
  res.render("login");
});
router.get("/signup", (req, res) => {
  res.render("signup");
});

router.post("/signup", (req, res) => {
  const user = req.body;
  const salt = bcrypt.genSaltSync(10);
  bcrypt.hash(user.password, salt).then(async (password) => {
    await prisma.user
      .create({
        data: {
          name: user.fullname,
          email: user.email,
          password: password,
        },
      })
      .then(() => {
        res.redirect("/login");
      });
  });
});

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await prisma.user.findUnique({
        where: {
          name: username,
        },
      });
      console.log(user);
      if (!user) {
        return done(null, false, { message: "wrong fullname" });
      }
      const password_check = await bcrypt.compare(password, user.password);
      if (password_check) {
        return done(null, user);
      } else {
        return done(null, false, { message: "wrong password" });
      }
    } catch (err) {
      console.log(err);
    }
  })
);

passport.serializeUser((user, done) => {
  console.log(null, user.id);
  done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: id,
      },
    });

    done(null, user);
  } catch (err) {
    done(false);
  }
});
router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/",
  })
);
router.get("/logout", (req, res) => {
  req.logout((err) => {
    res.redirect("/");
  });
});
module.exports = router;
// main();
//
