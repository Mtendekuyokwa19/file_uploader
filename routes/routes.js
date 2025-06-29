const router = require("express").Router();
const cloudinary = require("cloudinary").v2;
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
cloudinary.config({
  secure: true,
});
async function uploadFile(filepath) {
  const options = {
    use_filename: true,
    unique_filename: false,
    overwrite: true,
  };

  try {
    const result = await cloudinary.uploader.upload(filepath, options);
    return result.public_id;
  } catch (error) {
    console.error(error);
  }
}
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

    await prisma.file.findFirst({
      where: {
        Folder: {
          title: req.params.foldername,
          userId: req.user.id,
        },
        title: req.params.filename,
      },
    }),
  ]).then((result) => {
    console.log(result[1]);
    res.render("file", {
      slug: req.params.foldername,
      folder: result[0][0].Folder,
      file: result[1],
    });
  });
});

router.post("/updatefold/:foldername", async (req, res) => {
  await prisma.folder
    .update({
      where: {
        userId: req.user.id,
        title: req.params.foldername,
      },
      data: {
        title: req.body.newname,
      },
    })
    .then(() => res.redirect("/dashboard"));
});
router.get("/updatefold/:foldername", async (req, res) => {
  await prisma.folder
    .findUnique({
      where: {
        title: req.params.foldername,
      },
    })
    .then((result) => {
      res.render(`update`, { name: result });
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

const createImageTag = (publicId) => {
  // Set the effect color and background color

  // Create an image tag with transformations applied to the src URL
  let imageTag = cloudinary.image(publicId);

  return imageTag;
};
const getAssetInfo = async (publicId) => {
  // Return colors in the response
  const options = {
    colors: true,
  };

  try {
    // Get details about the asset
    const result = await cloudinary.api.resource(publicId, options);
    return result.colors;
  } catch (error) {
    console.error(error);
  }
};
router.post(
  "/newfile/:foldername",
  uploads.single("file"),

  async (req, res) => {
    const publicId = await uploadFile(req.file.path);

    const colors = await getAssetInfo(publicId);

    const filetag = await createImageTag(publicId);

    const url = filetag
      .split(" ")[1]
      .slice(4, -1)
      .split("")
      .slice(1, -2)
      .join("");
    console.log("here", url);
    const file = await prisma.user
      .update({
        where: {
          id: req.user.id,
          Folder: {},
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
                    url: url,
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
