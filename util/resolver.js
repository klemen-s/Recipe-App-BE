const Recipe = require("../models/recipe");
const validator = require("validator");
const User = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

module.exports = {
  getRecipes: async ({ page }, req) => {
    try {
      const perPage = 6;

      const totalItems = await Recipe.countDocuments();

      const recipes = await Recipe.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage);

      if (!recipes) {
        return [];
      }

      return { recipes: recipes, totalItems: totalItems };
    } catch (error) {
      return error;
    }
  },
  createRecipe: async ({ recipeInputData }, req) => {
    try {
      if (!req.isAuth) {
        const error = new Error("Not authenticated");
        error.statusCode = 401;
        throw error;
      }

      const title = recipeInputData.title;
      const imageUrl = recipeInputData.imageUrl;
      const description = recipeInputData.description;
      const recipeDetails = recipeInputData.recipe;
      const numOfMin = recipeInputData.numOfMin;
      const ingredients = recipeInputData.ingredients;

      // dodamo polje creator : req.userId
      const recipe = new Recipe({
        title: title,
        imageUrl: imageUrl,
        description: description,
        recipe: recipeDetails,
        numOfMin: numOfMin,
        ingredients: ingredients,
        creator: req.userId,
      });

      const savedRecipe = await recipe.save();

      if (!savedRecipe) {
        const error = new Error("Creating recipe failed!");
        error.code = 409;
        throw error;
      }

      // shranimo savedRecipe._id k uporabnikovem seznamu receptov.
      const user = await User.findById(req.userId);
      user.recipes.push(savedRecipe._id);

      await user.save();

      return {
        ...savedRecipe._doc,
        _id: savedRecipe._id.toString(),
      };
    } catch (error) {
      return error;
    }
  },
  getRecipe: async ({ recipeId }, req) => {
    try {
      const recipe = await Recipe.findOne({ _id: recipeId })
        .populate("creator", "name")
        .exec();

      if (!recipe) {
        const error = new Error("Recipe does not exist!");
        error.code = 404;
        throw error;
      }

      return { ...recipe._doc };
    } catch (error) {
      return error;
    }
  },
  createUser: async ({ userInputData }, req) => {
    try {
      const name = userInputData.name;
      const email = userInputData.email;
      const password = userInputData.password;
      const confirmPassword = userInputData.confirmPassword;

      const errors = [];

      if (validator.isEmpty(name)) {
        errors.push({
          message: "Name is required!",
        });
      }

      if (!validator.isEmail(email)) {
        errors.push({ message: "Email is not valid!" });
      }

      if (!validator.isLength(password, { min: 3 })) {
        errors.push({
          message: "Password is too short (minimal 3 characters)!",
        });
      }

      if (!validator.isLength(confirmPassword, { min: 3 })) {
        errors.push({
          message: "Password is too short (minimal 3 characters)!",
        });
      }

      if (errors.length) {
        const error = new Error("Invalid Input");
        error.data = errors;
        error.statusCode = 403;
        throw error;
      }

      const userFound = await User.findOne({ email: email });

      if (userFound) {
        const error = new Error("Email is already in use!");
        error.statusCode = 409;
        throw error;
      }

      if (password !== confirmPassword) {
        const error = new Error("Passwords do not match!");
        error.statusCode = 401;
        throw error;
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = new User({
        email: email,
        password: hashedPassword,
        name: name,
        recipes: [],
      });

      const savedUser = await user.save();
      return { ...savedUser._doc, _id: savedUser._id.toString() };
    } catch (error) {
      return error;
    }
  },
  loginUser: async ({ email, password }, req) => {
    try {
      const userFound = await User.findOne({ email: email });

      if (!userFound) {
        const error = new Error("The user with this email does not exist!");
        error.statusCode = 404;
        throw error;
      }

      const match = await bcrypt.compare(password, userFound.password);

      if (!match) {
        const error = new Error("Invalid password.");
        error.code = 401;
        throw error;
      }

      const jwtToken = jwt.sign(
        {
          message: "Successfully logged in!",
          isAuth: true,
          userId: userFound._id,
        },
        "secretKey",
        { expiresIn: "1h" }
      );

      return { token: jwtToken, userId: userFound._id };
    } catch (error) {
      return error;
    }
  },
};
