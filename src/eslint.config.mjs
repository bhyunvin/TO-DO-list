import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import sonarjs from "eslint-plugin-sonarjs";

export default [
    {
        files: ["**/*.ts"],
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.jest,
            },
        },
    },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
    sonarjs.configs.recommended,
    eslintPluginPrettierRecommended,
    {
        rules: {
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    args: "all",
                    caughtErrors: "all",
                    ignoreRestSiblings: false,
                },
            ],
            "@typescript-eslint/no-unused-private-class-members": "error",
            "@typescript-eslint/no-unused-expressions": "error",
            "sonarjs/no-unused-collection": "error",
            "sonarjs/no-unused-vars": "error",
        },
    },
];
