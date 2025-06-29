const router = require("express").Router();
const path = require("path");
const LocalStrategy = require("passport-local").Strategy;
const passport = require("passport");
// const { PrismaClient } = require("../generated/prisma/");
const { PrismaClient } = require("../generated/prisma/");
const bcrypt = require("bcryptjs");
const { title } = require("node:process");
const prisma = new PrismaClient();
const multer = require("multer");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const array = file.originalname.split(".");
    const extension = array[array.length - 1];
    console.log(null, uniqueSuffix + "." + extension);
    cb(null, uniqueSuffix + "." + extension);
  },
});
const uploads = multer({ storage: storage });
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

router.get("/delete/:foldername/:filename", async (req, res) => {
  await prisma.file.delete({
    where: {
      Folder: {
        title: req.params.foldername,
        userId: req.user.id,
      },
      title: req.params.filename,
    },
  });
  res.redirect(`/dashboard/${req.params.foldername}`);
});
router.get("/dashboard/:foldername/:filename", async (req, res) => {
  await Promise.all([
    prisma.user.findMany({
      where: {
        id: req.user.id,
      },
      select: {
        Folder: {
          select: { title: true },
        },
      },
    }),

    await prisma.file.findUnique({
      where: {
        Folder: {
          title: req.params.foldername,
          userId: req.user.id,
        },
        title: req.params.filename,
      },
    }),
  ]).then((result) => {
    console.log(req.params.fold);
    res.render("file", {
      slug: req.params.foldername,
      folder: result[0][0].Folder,
      file: result[1],
    });
  });
});

router.get("/deletefold/:foldername", async (req, res) => {
  await prisma.folder.deleteMany({
    where: {
      title: req.params.foldername,
    },
  });
  res.redirect(`/dashboard`);
});
router.post(
  "/update/:foldername/:filename",
  uploads.single("file"),

  async (req, res) => {
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
                  update: {
                    title: req.body.filename,
                    uploadtime: new Date(),
                    url: req.file.path,
                    size: req.file.size / 1024,
                    where: {
                      title: req.params.filename,
                    },
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
  }
);
router.post(
  "/newfile/:foldername",
  uploads.single("file"),

  async (req, res) => {
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
                    uploadtime: new Date(),
                    url: req.file.path,
                    size: req.file.size / 1024,
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
  }
);
router.get("/uploads/:image", (req, res) => {
  console.log(1);
  res.download(
    path.join(__dirname, "..", "/uploads/1751177109736-984762240.jpg")
  );
});
router.get("/dashboard/:foldername", async (req, res) => {
  if (req.user) {
    Promise.all([
      await prisma.user.findMany({
        where: {
          id: req.user.id,
        },
        select: {
          Folder: {
            select: { title: true },
          },
        },
      }),
      await prisma.file.findMany({
        where: {
          Folder: {
            userId: req.user.id,
            title: req.params.foldername,
          },
        },
      }),
    ]).then((results) => {
      res.render("folder", {
        user: req.user,
        slug: req.params.foldername,
        folder: results[0][0].Folder,
        files: results[1],
      });
      // console.log(results);
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
