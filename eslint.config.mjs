// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    "rules": {
      "semi": ["error", "always"],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          "args": "none"
        }
      ]
    }
  }
);
