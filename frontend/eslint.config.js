const { FlatCompat } = require("@eslint/eslintrc");
const { fixupConfigRules } = require("@eslint/compat");

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const extendedConfigs = compat.extends(
  "airbnb",
  "plugin:jest/recommended",
  "plugin:react-hooks/recommended",
  "plugin:prettier/recommended",
  "plugin:@next/next/recommended",
);

module.exports = [
  { ignores: ["node_modules/**", ".next/**", "out/**", "public/static/**"] },
  ...fixupConfigRules(extendedConfigs),
  {
    languageOptions: {
      ecmaVersion: "latest",
      globals: {
        React: "writable",
        describe: false,
        jest: false,
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        requestAnimationFrame: "readonly",
      },
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/require-default-props": "off",
      "no-console": "error",
      "react/jsx-one-expression-per-line": "off",
      "react/prop-types": ["error", { ignore: ["stores"] }],
      "no-param-reassign": ["error", { props: false }],
      "react/jsx-curly-spacing": [
        "error",
        { when: "never", children: true, allowMultiline: true },
      ],
      "jsx-a11y/anchor-is-valid": [
        "error",
        {
          components: ["Link"],
          specialLink: ["hrefLeft", "hrefRight"],
          aspects: ["invalidHref", "preferButton"],
        },
      ],
      "import/no-extraneous-dependencies": ["off"],
      "no-restricted-syntax": ["off"],
      "react/jsx-filename-extension": ["off"],
      "prettier/prettier": "error",
      "react/jsx-props-no-spreading": ["off"],
      "react/forbid-prop-types": ["off"],
      "react/no-unescaped-entities": ["off"],
      "react/no-array-index-key": ["off"],
      "jsx-a11y/no-static-element-interactions": ["off"],
      "jsx-a11y/click-events-have-key-events": ["off"],
      "no-plusplus": ["off"],
      "func-names": ["off"],
      "react/function-component-definition": ["off"],
      "import/no-unresolved": ["off"],
      "import/extensions": ["off"],
    },
    settings: {
      "import/resolver": {
        node: {
          paths: ["./", "components", "hooks"],
          extensions: [".js", ".jsx", ".ts", ".tsx"],
        },
      },
    },
  },
  {
    files: ["**/*.mjs"],
    languageOptions: { sourceType: "module" },
    rules: {
      "no-underscore-dangle": ["error", { allow: ["__dirname", "__filename"] }],
      "no-console": "off",
      "no-await-in-loop": "off",
      "no-continue": "off",
    },
  },
];
