import { defineConfig } from "vite";

type ProcessLike = {
  env?: Record<
    string,
    string | undefined
  >;
};

const processLike = (
  globalThis as typeof globalThis & {
    process?: ProcessLike;
  }
).process;

const gitCommit =
  processLike?.env
    ?.VITE_GIT_COMMIT ??
  processLike?.env
    ?.GITHUB_SHA?.slice(0, 7) ??
  "local-dev";

export default defineConfig(
  ({ mode }) => ({
    base:
      mode === "pages"
        ? "/game/"
        : "/",

    define: {
      "import.meta.env.VITE_GIT_COMMIT":
        JSON.stringify(gitCommit),
    },
  }),
);