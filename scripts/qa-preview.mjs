import { createAppServer } from "../server.mjs";
import path from "node:path";
const server = await createAppServer({
  dbPath: path.resolve(".data/qa-workspace.sqlite"),
  distDir: path.resolve("dist"),
});
server.listen(4186, "127.0.0.1", () =>
  console.log("Isolated QA workspace: http://127.0.0.1:4186"),
);
process.on("SIGINT", () =>
  server.close(() => {
    server.closeDatabase();
    process.exit(0);
  }),
);
