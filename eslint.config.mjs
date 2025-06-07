// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import localPlugin from "./build/linter/index.mjs";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        // Critical for type-aware rules:
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    plugins: {
      local: localPlugin,
    },
    rules: {
      semi: ["error", "always"],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "none",
          caughtErrors: "none",
        },
      ],
      "local/inconsistent-comparison": "error", // Add your custom rule here
      "@typescript-eslint/restrict-template-expressions": "off",
    },
  },
  {
    files: ["**/*.mjs"],
    extends: [tseslint.configs.disableTypeChecked],
  }
);
