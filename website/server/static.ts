import express, { type Express } from "express";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "../dist/public");

  app.use(express.static(distPath));

  // Catch-all to serve index.html for client-side routing
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}