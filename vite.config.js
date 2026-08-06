import { defineConfig } from "vite";

// base must match the GitHub repo name exactly (case-sensitive) — this is
// a project site served at <user>.github.io/Daniel.design.exe/, not a
// custom domain, so every asset path needs this prefix.
export default defineConfig({
    base: "/Daniel.design.exe/"
});
