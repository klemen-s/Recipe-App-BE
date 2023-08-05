const { buildSchema } = require("graphql");

module.exports = buildSchema(`
    type Recipe {
        title : String!
        imageUrl : String!
        description : String!
        numOfMin : Int!
        recipe : String!
        ingredients: [String]!
        _id : ID!
        creator : User!
    }

    input RecipeInput {
        title : String!
        imageUrl : String!
        description : String!
        numOfMin : Int!
        recipe : String!
       ingredients : [String!]!
    }

    input UserData {
        name : String!
        email : String!
        password : String!
        confirmPassword : String!
    }

    type User {
        name : String!
        email : String!
        password : String!
        recipes : [Recipe]!
        _id : ID!
    }

    type TokenData {
        token : String!
        userId : ID!
    }

    type RecipesData {
        recipes : [Recipe]!
        totalItems : Int!
    }

    type Query {
        getRecipes(page : Int!) : RecipesData!
        getRecipe(recipeId : String) : Recipe!
        loginUser(email : String, password : String) : TokenData!
    }

    type Mutation {
        createRecipe(recipeInputData : RecipeInput): Recipe!
        createUser(userInputData : UserData) : User!
    }
`);
