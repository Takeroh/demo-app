import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// 静的ファイルを配信
app.use(express.static("public"));

// haikus.json を読み込む
const haikus = JSON.parse(fs.readFileSync("haikus.json", "utf8"));

// APIとして JSON を返す
app.get("/haikus", (req, res) => {
  res.json(haikus);
});

// ルートは index.html を返す
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// app.get("*", (req, res) => {
//   res.sendFile(path.join(__dirname, "public", "index.html"));
// });

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
