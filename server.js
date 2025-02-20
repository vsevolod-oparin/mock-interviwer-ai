import express from "express";
import fs from "fs";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import "dotenv/config";

import pdf from "pdf-parse-debugging-disabled";

const app = express();
const port = process.env.PORT || 3000;
const apiKey = process.env.OPENAI_API_KEY;

// Configure Vite middleware for React client
const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: "custom",
});
app.use(vite.middlewares);


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


const system_prompt = fs.readFileSync('./prompts/system.txt', "utf8");
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
    const template = await vite.transformIndexHtml(
      url,
      fs.readFileSync("./client/index.html", "utf-8"),
    );
    const { render } = await vite.ssrLoadModule("./client/entry-server.jsx");
    const appHtml = await render(url);
    const html = template.replace(`<!--ssr-outlet-->`, appHtml?.html);
    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  } catch (e) {
    vite.ssrFixStacktrace(e);
    next(e);
  }
});

app.listen(port, () => {
  console.log(`Express server running on *:${port}`);
});
