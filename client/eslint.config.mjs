import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginReactRefresh from "eslint-plugin-react-refresh";
import pluginTestingLibrary from "eslint-plugin-testing-library";

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
    {
        plugins: {
            "react-hooks": pluginReactHooks,
            "react-refresh": pluginReactRefresh,
        },
        rules: {
            ...pluginReactHooks.configs.recommended.rules,
            "react-refresh/only-export-components": "warn",
            "react/prop-types": "off",
            "react/react-in-jsx-scope": "off",
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unused-vars": "warn"
        },
    },
    {
        files: ["**/*.test.{js,jsx,ts,tsx}", "**/*.spec.{js,jsx,ts,tsx}"],
        plugins: {
            "testing-library": pluginTestingLibrary,
        },
        rules: {
            ...pluginTestingLibrary.configs.react.rules,
            "@typescript-eslint/no-require-imports": "off",
        },
    },
];
