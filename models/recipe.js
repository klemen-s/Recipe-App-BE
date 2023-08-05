const mongoose = require("mongoose");

const recipeSchema = new mongoose.Schema(
  {
    title: String,
    imageUrl: String,
    description: String,
    numOfMin: Number,
    recipe: String,
    ingredients: [String],
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("recipe", recipeSchema);
