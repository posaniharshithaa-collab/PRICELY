const BACKEND_URL = "https://pricely-backend-jgtm.onrender.com";

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ pricelyVersion: "1.1.0" });
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;

  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: "TOGGLE_PRICELY_PANEL"
    });
  } catch (_) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["src/content/content.js"]
      });

      await chrome.tabs.sendMessage(tab.id, {
        type: "TOGGLE_PRICELY_PANEL"
      });
    } catch (e) {
      console.warn("PRICELY could not access this page", e);
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "PRICELY_PING") {
    sendResponse({
      ok: true,
      version: "1.1.0"
    });
    return true;
  }

  if (message?.type === "PRICELY_ANALYZE_BACKEND") {
    fetch(`${BACKEND_URL}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(message.payload || {})
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data?.error || `Backend returned HTTP ${response.status}`
          );
        }

        return data;
      })
      .then((data) => {
        sendResponse({
          ok: true,
          data
        });
      })
      .catch((error) => {
        console.warn("PRICELY backend analysis failed:", error);

        sendResponse({
          ok: false,
          error: error?.message || "Backend analysis failed"
        });
      });

    return true;
  }

  return true;
});