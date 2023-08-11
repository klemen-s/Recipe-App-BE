const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

const { S3Client } = require("@aws-sdk/client-s3");
const multerS3 = require("multer-s3");
const  AWS = require("aws-sdk")

const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const multer = require("multer");

const cors = require("cors");

const { graphqlHTTP } = require("express-graphql");
const schema = require("./util/schema");
const resolver = require("./util/resolver");
const isAuth = require("./middleware/isAuth");
const s3Proxy = require("s3-proxy");

const app = express();

const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  },
  region: "eu-central-1",
});

app.options("*", cors());
app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: "express-app-recipe",
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      cb(null, uuidv4());
    },
  }),
});

app.use(
  "/images/",
  s3Proxy({
    bucket: "express-app-recipe",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  })
);

app.use(isAuth);

app.post("/post-image", upload.single("image"), (req, res, next) => {
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
    filePath: req.file.key,
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
  console.log(error);
  const status = error.statusCode;
  const data = error.data;
  const message = error.message;
  res.status(status).json({ message: message, data: data });
});

mongoose
  .connect(process.env.DB_CONN)
  .then((result) => {
    app.listen(process.env.PORT);
  })
  .catch((err) => console.log(err));
