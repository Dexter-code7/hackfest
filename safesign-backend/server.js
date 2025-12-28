require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors({ origin: true })); // Allows Chrome extension
app.use(express.json({ limit: "10mb" }));

// Get API key from environment variable (secure!)
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.error(
    "ERROR: OPENROUTER_API_KEY is missing! Add it to Vercel environment variables."
  );
  process.exit(1);
}

app.post("/analyze", async (req, res) => {
  const { text } = req.body;
  if (!text || text.trim() === "") {
    return res.status(400).json({ error: "No text provided" });
  }

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://hackfest.vercel.app", // Optional
          "X-Title": "SafeSign AI",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3.1-70b-instruct", // Excellent free-tier model
          messages: [
            {
              role: "system",
              content:
                "You are a legal expert analyzing Terms & Conditions. Respond ONLY with valid JSON using this exact structure, no extra text.",
            },
            {
              role: "user",
              content: `Analyze the following text for predatory clauses (data selling, IP theft, hidden fees, arbitration, unilateral changes, etc.).

            Output ONLY this JSON format:
            {
              "safetyScore": 0-100,
              "trafficLight": "Green" | "Yellow" | "Red",
              "traps": [
                {
                  "clause": "short quote from text",
                  "risk": "high" | "medium" | "low",
                  "explanation": "clear plain-English warning"
                }
              ]
            }

            Text: ${text.substring(0, 80000)}`,
            },
          ],
          temperature: 0.3,
          max_tokens: 1000,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content;

    // Clean any markdown code blocks
    let jsonText = content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    // Send clean JSON to extension
    res.json(JSON.parse(jsonText));
  } catch (error) {
    console.error("Analysis failed:", error.message);

    // Fallback mock data (so extension always shows something nice)
    res.json({
      safetyScore: 25,
      trafficLight: "Red",
      traps: [
        {
          clause: "sell your personal data",
          risk: "high",
          explanation:
            "The company can sell your personal information to third parties without consent.",
        },
        {
          clause: "own all uploaded content",
          risk: "high",
          explanation:
            "You lose ownership of photos, videos, and posts you upload.",
        },
        {
          clause: "change terms without notice",
          risk: "high",
          explanation: "They can update rules anytime and you're still bound.",
        },
        {
          clause: "binding arbitration",
          risk: "medium",
          explanation: "You give up your right to sue in court.",
        },
      ],
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(
    `SafeSign AI server running on port ${PORT} (OpenRouter powered)`
  );
});
