import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

// Load environment variables from both .env and .env.local
dotenv.config();
dotenv.config({ path: ".env.local" });

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON parsing middleware
  app.use(express.json());

  // API route to check if Gemini API Key is loaded from env / .env.local
  app.get("/api/gemini-check", (req, res) => {
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      res.json({ 
        status: "configured", 
        prefix: key.substring(0, 6) + "...",
        length: key.length 
      });
    } else {
      res.json({ status: "not_configured" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
