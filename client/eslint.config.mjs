import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginReactRefresh from "eslint-plugin-react-refresh";
import pluginTestingLibrary from "eslint-plugin-testing-library";
import sonarjs from "eslint-plugin-sonarjs";

export default [
    {
        ignores: ["**/node_modules/**", "**/dist/**", "**/coverage/**", "**/.DS_Store"],
    },
    {
        files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.jest,
                vi: "readonly",
            },
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
        settings: {
            react: {
                version: "detect",
            },
        },
    },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
    pluginReact.configs.flat.recommended,
    pluginReact.configs.flat["jsx-runtime"],
    sonarjs.configs.recommended,
    {
        plugins: {
            "react-hooks": pluginReactHooks,
        },
        rules: {
            ...pluginReactHooks.configs.recommended.rules,
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
    pluginReactRefresh.configs.vite,
    {
        files: ["**/*.test.{js,jsx,ts,tsx}", "**/*.spec.{js,jsx,ts,tsx}"],
        plugins: {
            "testing-library": pluginTestingLibrary,
        },
        rules: {
            ...pluginTestingLibrary.configs.react.rules,
        },
    },
];
