module.exports = {
  overrides: [
    {
      files: ["**/*.spec.ts", "**/*.spec.tsx", "tests/**/*.ts"],
      rules: {
        "react-hooks/rules-of-hooks": "off",
      },
    },
  ],
};
