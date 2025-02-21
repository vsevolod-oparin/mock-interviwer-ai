import express from "express";
import fs from "node:fs/promises";
import multer from "multer";
import "dotenv/config";

import pdf from "pdf-parse-debugging-disabled";

const app = express();

const isProduction  = process.env.NODE_ENV === 'production';
const port          = process.env.PORT || 3000;
const base          = process.env.BASE || '/';
const apiKey        = process.env.OPENAI_API_KEY;

// Configure Vite middleware for React client if not in prod
let vite
if (!isProduction) {
  const { createServer } = await import('vite')
  vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    base,
  })
  app.use(vite.middlewares)
} else {
  const compression = (await import('compression')).default
  const sirv = (await import('sirv')).default
  app.use(compression())
  app.use(base, sirv('./client/dist/client', { extensions: [] }))
}

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Endpoint to handle PDF upload
app.post('/upload', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    await pdf(req.file.path)
    .then(data => res.send(data.text))
    .catch(error => {
      console.error('Error parsing PDF:', error);
      res.status(500).send('Error parsing PDF.');
    });
  } catch (error) {
    console.error('Error parsing PDF:', error);
    res.status(500).send('Error parsing PDF.');
  }
});


const system_prompt = await fs.readFile('./prompts/system.txt', "utf8");
// API route for token generation
app.get("/token", async (req, res) => {
  try {
    const response = await fetch(
      "https://api.openai.com/v1/realtime/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2024-12-17",
          voice: "alloy",
          instructions: system_prompt,
          input_audio_transcription: {
            model: "whisper-1",
            // response_format: "text"
          },
        }),
      },
    );

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Token generation error:", error);
    res.status(500).json({ error: "Failed to generate token" });
  }
});

// Render the React client
app.use("*", async (req, res, next) => {
  const url = req.originalUrl;

  try {
    let template;
    let render;
    if (!isProduction) {
      template = await vite.transformIndexHtml(
        url,
        await fs.readFile("./client/index.html", "utf-8"),
      );
      render = (await vite.ssrLoadModule("./client/entry-server.jsx")).render;
    } else {
      template = await fs.readFile('./client/dist/client/index.html', 'utf-8');
      render = (await import('./client/dist/server/entry-server.js')).render;
    }
    const appHtml = await render(url);

    const html = template
      .replace(`<!--ssr-outlet-->`, appHtml?.html);
      //.replace(`<!-- head -->`, appHtml?.head);
    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  } catch (e) {
    vite?.ssrFixStacktrace(e);
    console.log(e.stack)
    res.status(500).end(e.stack)
    next(e);
  }
});

app.listen(port, () => {
  console.log(`Express server running on *:${port}`);
});
