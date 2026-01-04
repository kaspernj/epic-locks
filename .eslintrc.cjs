module.exports = {
  env: {
    es2022: true,
    node: true
  },
  extends: ["eslint:recommended", "plugin:jsdoc/recommended"],
  plugins: ["jsdoc"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module"
  },
  ignorePatterns: ["build/", "node_modules/", "spec/"],
  rules: {
    "jsdoc/require-jsdoc": [
      "error",
      {
        contexts: ["FunctionDeclaration", "ClassDeclaration", "MethodDefinition"]
      }
    ],
    "jsdoc/require-param-description": "off",
    "jsdoc/require-returns-description": "off"
  }
}
