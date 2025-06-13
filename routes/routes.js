const router = require("express").Router();
const LocalStrategy = require("passport-local").Strategy;
const passport = require("passport");
// const { PrismaClient } = require("../generated/prisma/");
const { PrismaClient } = require("../generated/prisma/");
const bcrypt = require("bcryptjs");
const { title } = require("node:process");
const prisma = new PrismaClient();
require("dotenv").config();

router.get("/", (req, res) => {
  res.render("index", { user: req.user });
});

router.get("/dashboard", async (req, res) => {
  if (req.user) {
    const folders = await prisma.user
      .findMany({
        where: {
          id: req.user.id,
        },
        select: {
          Folder: {
            select: { title: true },
          },
        },
      })
      .then((results) => {
        res.render("dashboard", { user: req.user, folder: results[0].Folder });
      });

    return;
  }
  res.redirect("/");
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

router.post("/newfolder", async (req, res) => {
  const folder = req.body;
  await prisma.user
    .update({
      where: {
        id: req.user.id,
      },
      data: {
        Folder: {
          create: {
            title: folder.foldername,
          },
        },
      },
    })
    .then(() => {});

  res.redirect("/dashboard");
});

router.post("/newfile/:foldername", async (req, res) => {
  const file = await prisma.user
    .update({
      where: {
        id: req.user.id,
      },

      data: {
        Folder: {
          update: {
            where: {
              title: req.params.foldername,
            },
            data: {
              Files: {
                create: {
                  title: req.body.filename,
                },
              },
            },
          },
        },
      },
    })
    .then((result) => {
      res.redirect("/dashboard/" + req.params.foldername);
    });
});
router.get("/dashboard/:foldername", async (req, res) => {
  if (req.user) {
    const folders = await prisma.user
      .findMany({
        where: {
          id: req.user.id,
        },
        select: {
          Folder: {
            select: { title: true },
          },
        },
      })
      .then(async (results) => {
        const files = await prisma.file
          .findMany({
            where: {
              Folder: {
                userId: req.user.id,
                title: req.params.foldername,
              },
            },
          })
          .then((files) => {
            res.render("folder", {
              user: req.user,
              slug: req.params.foldername,
              folder: results[0].Folder,
              files: files,
            });
          });
        console.log(files);
      });

    return;
  }
  res.redirect("/");
});
passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await prisma.user.findUnique({
        where: {
          name: username,
        },
      });
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
    successRedirect: "/dashboard",
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
