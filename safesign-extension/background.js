chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "ANALYZE_TERMS") {
    const text = message.text;

    fetch("https://hackfest-three.vercel.app/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("Server error: " + response.status);
        return response.json();
      })
      .then((analysis) => {
        // Safely send back only if tab still exists
        if (sender.tab && sender.tab.id) {
          chrome.tabs.sendMessage(sender.tab.id, {
            type: "SHOW_RESULTS",
            analysis: analysis,
          });
        }
      })
      .catch((err) => {
        console.error("Analysis failed:", err);
        if (sender.tab && sender.tab.id) {
          chrome.tabs.sendMessage(sender.tab.id, {
            type: "SHOW_RESULTS",
            analysis: {
              safetyScore: 0,
              trafficLight: "Red",
              traps: [
                {
                  clause: "",
                  risk: "high",
                  explanation:
                    "Connection error – check internet or try again.",
                },
              ],
            },
          });
        }
      });

    // Keep message channel open for async
    return true;
  }
});

// Optional: Log when background is ready
console.log("SafeSign AI Background Ready");
