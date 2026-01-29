import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  
  // SPA fallback - serve index.html for all non-API routes
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    // Skip API routes and assets
    if (url.startsWith('/api') || url.startsWith('/objects') || url.includes('.')) {
      return next();
    }

    try {
      console.log(`[SPA Fallback] Serving index.html for: ${url}`);
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      console.error(`[SPA Fallback Error] ${url}:`, e);
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // In production, the bundled code is in dist/, and the static files are in dist/public
  // Try multiple path resolution strategies to handle different deployment scenarios
  let distPath: string;
  
  // Strategy 1: Relative to __dirname (works when bundled code is in dist/)
  const pathFromDirname = path.resolve(__dirname, "public");
  
  // Strategy 2: Relative to process.cwd() (works in most deployment scenarios)
  const pathFromCwd = path.resolve(process.cwd(), "dist", "public");
  
  // Strategy 3: Relative to __dirname's parent (handles nested dist structures)
  const pathFromParent = path.resolve(__dirname, "..", "public");
  
  // Check which path exists
  if (fs.existsSync(pathFromDirname)) {
    distPath = pathFromDirname;
  } else if (fs.existsSync(pathFromCwd)) {
    distPath = pathFromCwd;
  } else if (fs.existsSync(pathFromParent)) {
    distPath = pathFromParent;
  } else {
    // Log all attempted paths for debugging
    console.error(`[serveStatic] Could not find build directory. Attempted paths:`);
    console.error(`  - ${pathFromDirname}`);
    console.error(`  - ${pathFromCwd}`);
    console.error(`  - ${pathFromParent}`);
    console.error(`  - __dirname: ${__dirname}`);
    console.error(`  - process.cwd(): ${process.cwd()}`);
    throw new Error(
      `Could not find the build directory. Attempted: ${pathFromDirname}, ${pathFromCwd}, ${pathFromParent}. Make sure to build the client first.`,
    );
  }

  console.log(`[serveStatic] Serving static files from: ${distPath}`);
  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  // This catch-all must be last to handle SPA routes
  app.get("*", (req, res, next) => {
    // Skip API routes and object storage routes
    if (req.path.startsWith('/api') || req.path.startsWith('/objects')) {
      return next();
    }
    
    // Skip requests that look like they're for static assets (have file extensions)
    if (req.path.includes('.') && !req.path.endsWith('/')) {
      return next();
    }
    
    // Serve index.html for all other routes (SPA fallback)
    const indexPath = path.resolve(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      next();
    }
  });
}
