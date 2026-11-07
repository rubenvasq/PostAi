import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://postai:postai@127.0.0.1:5432/postai",
      JWT_SECRET: "test-only-secret-with-at-least-32-characters",
      BCRYPT_ROUNDS: "4",
    },
  },
});
