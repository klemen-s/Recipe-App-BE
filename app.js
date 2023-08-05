const { v4: uuidv4 } = require("uuid");

const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const path = require("path");
const multer = require("multer");
const fs = require("fs");

const cors = require("cors");

const { graphqlHTTP } = require("express-graphql");
const schema = require("./util/schema");
const resolver = require("./util/resolver");
const isAuth = require("./middleware/isAuth");

const app = express();

app.options("*", cors());
app.use(cors());

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./images");
  },
  fileName: function (req, file, cb) {
    let name = file + uuidv4();
    cb(null, name);
  },
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(multer({ storage: storage }).single("image"));

app.use("/images", express.static(path.join(__dirname, "images")));

app.use(isAuth);

app.post("/post-image", (req, res, next) => {
  if (!req.isAuth) {
    const error = new Error("Not authenticated");
    error.statusCode = 401;
    throw error;
  }

  if (!req.file) {
    const error = new Error("No file attached!");
    error.statusCode = 400;
    throw error;
  }

  return res.status(201).send({
    message: "File recieved",
    filePath: req.file.path.replace("\\", "/"),
  });
});

app.use(
  "/graphql",
  graphqlHTTP({
    schema: schema,
    rootValue: resolver,
    graphiql: true,
    customFormatErrorFn(err) {
      if (!err.originalError) {
        return err;
      }
      const data = err.originalError.data; // naš seznam izjem
      const message = err.message || "An error occured";
      const code = err.originalError.code;

      return { message: message, status: code, data: data };
    },
  })
);

app.use((error, req, res, next) => {
  const status = error.statusCode;
  const data = error.data;
  const message = error.message;
  res.status(status).json({ message: message, data: data });
});

mongoose
  .connect(
    `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.xyukcbr.mongodb.net/${process.env.MONGO_DEFAULT_DATABASE}?retryWrites=true&w=majority`
  )
  .then((result) => {
    app.listen(process.env.PORT);
  })
  .catch((err) => console.log(err));
