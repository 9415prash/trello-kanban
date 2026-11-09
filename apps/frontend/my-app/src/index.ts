import { serve } from "bun";
import index from "./index.html";
import { handleApi } from "./server";
const server = serve({
  hostname: process.env.HOST || "127.0.0.1",
  port: Number(process.env.PORT || 3000),
  routes: { "/api/*": handleApi, "/*": index },
  development: process.env.NODE_ENV !== "production" &&
    !process.argv.includes("--production") && { hmr: true, console: true },
});
console.log(`Trello running at ${server.url}`);
