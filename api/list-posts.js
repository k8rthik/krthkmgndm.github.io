import fs from "fs";
import path from "path";

export default function handler(req, res) {
  const postsDir = path.join(process.cwd(), "posts");
  try {
    const files = fs.readdirSync(postsDir);
    res.status(200).json({ files });
  } catch (error) {
    console.error("Error reading posts directory:", error.message);
    res.status(500).json({ error: "Cannot read posts directory." });
  }
}
