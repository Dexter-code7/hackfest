require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

app.post("/analyze", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "No text" });

  try {
    // Step 1: Extract only relevant legal sections
    const extractPrompt = `
    You are a legal document processor. From the following text (which may be a full webpage including navigation, headers, footers, etc.), 
    extract ONLY the actual Terms & Conditions / legal agreement content. 
    Focus on sections related to:
    - User obligations and rights
    - Data collection, sharing, selling
    - Intellectual property ownership
    - Fees, payments, subscriptions
    - Termination, changes to terms
    - Arbitration, liability limitations
    - Privacy and data protection

    Remove all non-legal content like website menus, ads, copyrights notices, "last updated" dates unless relevant.
    Output ONLY the cleaned legal text, nothing else. No explanations.

    Text: ${text}
    `;

    let extractResult = await model.generateContent(extractPrompt);
    let cleanedText = extractResult.response.text().trim();

    // Optional: If cleanedText is still too long, truncate safely
    if (cleanedText.length > 100000) {
      cleanedText =
        cleanedText.substring(0, 100000) + "\n... [document truncated]";
    }

    // Step 2: Your existing trap detection on the cleaned text
    const analyzePrompt = `
    You are a legal expert detecting predatory clauses in Terms & Conditions.
    Analyze the following cleaned legal text and respond ONLY in valid JSON with this structure:
    {
      "safetyScore": 0-100,
      "trafficLight": "Green" | "Yellow" | "Red",
      "traps": [
        {
          "clause": "short quote from text",
          "risk": "high" | "medium" | "low",
          "explanation": "plain English warning"
        }
      ]
    }

    Focus on: data selling, IP theft, hidden fees, arbitration, unilateral changes.

    Text: ${cleanedText}
    `;

    const analyzeResult = await model.generateContent(analyzePrompt);
    const responseText = analyzeResult.response.text();

    let jsonText = responseText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    res.json(JSON.parse(jsonText));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gemini failed", details: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
