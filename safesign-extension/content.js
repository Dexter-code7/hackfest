// content.js - With close button + better styling

console.log("SafeSign AI Active");

// Keywords for detection
const TERMS_KEYWORDS = [
  "terms",
  "conditions",
  "privacy",
  "policy",
  "agreement",
  "legal",
];

function detectTermsText() {
  let fullText = "";

  document.querySelectorAll("div, section, p, article, li").forEach((el) => {
    const text = el.innerText.toLowerCase();
    if (
      TERMS_KEYWORDS.some((k) => text.includes(k)) &&
      el.innerText.length > 300
    ) {
      fullText += el.innerText + "\n\n";
    }
  });

  document.querySelectorAll("a").forEach((a) => {
    if (
      TERMS_KEYWORDS.some(
        (k) =>
          a.href.toLowerCase().includes(k) ||
          a.innerText.toLowerCase().includes(k)
      )
    ) {
      fullText += `\nLinked Terms: ${a.href}\n`;
    }
  });

  return fullText.trim();
}

const termsText = detectTermsText();

if (termsText.length > 200) {
  // Loading indicator
  const indicator = document.createElement("div");
  indicator.id = "safesign-indicator";
  indicator.innerHTML = "🔍 SafeSign AI: Analyzing Terms...";
  indicator.style.cssText = `
    position: fixed; bottom: 20px; right: 20px; background: #000; color: white;
    padding: 12px 20px; border-radius: 12px; font-family: Arial; font-size: 14px;
    z-index: 10000; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;
  document.body.appendChild(indicator);

  chrome.runtime
    .sendMessage({
      type: "ANALYZE_TERMS",
      text: termsText,
    })
    .catch(() => {
      setTimeout(
        () =>
          chrome.runtime.sendMessage({
            type: "ANALYZE_TERMS",
            text: termsText,
          }),
        1000
      );
    });
}

// Receive results and show overlay with CLOSE BUTTON
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "SHOW_RESULTS") {
    const analysis = message.analysis;

    // Remove loading indicator
    const oldIndicator = document.getElementById("safesign-indicator");
    if (oldIndicator) oldIndicator.remove();

    // Remove any existing overlay
    const oldOverlay = document.getElementById("safesign-overlay");
    if (oldOverlay) oldOverlay.remove();

    // Create new overlay
    const overlay = document.createElement("div");
    overlay.id = "safesign-overlay";

    const color =
      analysis.trafficLight === "Red"
        ? "#ff4444"
        : analysis.trafficLight === "Yellow"
        ? "#ffaa00"
        : "#44aa44";

    overlay.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 380px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.25);
      padding: 20px;
      font-family: Arial, sans-serif;
      z-index: 10000;
      border: 4px solid ${color};
      max-height: 80vh;
      overflow-y: auto;
    `;

    overlay.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h3 style="margin:0; color:${color}; font-size:18px;">SafeSign AI Alert</h3>
        <button id="safesign-close" style="
          background:none; border:none; font-size:24px; cursor:pointer;
          color:#999; width:30px; height:30px; border-radius:50%;
          display:flex; align-items:center; justify-content:center;
        " title="Close">✕</button>
      </div>

      <div style="font-size:48px; text-align:center; margin:15px 0;">
        ${
          analysis.trafficLight === "Red"
            ? "🔴"
            : analysis.trafficLight === "Yellow"
            ? "🟡"
            : "🟢"
        }
      </div>

      <p style="margin:10px 0;"><strong>Safety Score:</strong> ${
        analysis.safetyScore
      }/100</p>

      <hr style="border:none; border-top:1px solid #eee; margin:15px 0;">

      <p style="font-weight:bold; margin:0 0 10px;">Risky Clauses Found:</p>
      <ul style="margin:0; padding-left:22px; max-height:220px; overflow-y:auto;">
        ${analysis.traps
          .map(
            (t) => `
          <li style="margin:8px 0; font-size:14px;">
            <strong>${t.risk.toUpperCase()}:</strong> ${t.explanation}
            ${
              t.clause
                ? `<br><small style="color:#666;">"${t.clause}"</small>`
                : ""
            }
          </li>
        `
          )
          .join("")}
      </ul>

      <div style="text-align:center; margin-top:20px; color:#888; font-size:13px;">
        Powered by AI • Not legal advice
      </div>
    `;

    document.body.appendChild(overlay);

    // Add close functionality
    document.getElementById("safesign-close").addEventListener("click", () => {
      overlay.remove();
    });

    // Optional: Click outside to close (but not on content)
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }
});
