// Runs once when the Next.js server starts. Node-only work lives in instrumentation-node.ts
// so that the edge build never pulls in better-sqlite3.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
