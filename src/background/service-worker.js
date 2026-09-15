chrome.runtime.onInstalled.addListener(() => { chrome.storage.local.set({ pricelyVersion: "1.1.0" }); });

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_PRICELY_PANEL" });
  } catch (_) {
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["src/content/content.js"] });
      await chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_PRICELY_PANEL" });
    } catch (e) { console.warn("PRICELY could not access this page", e); }
  }
});
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => { if (message?.type === "PRICELY_PING") sendResponse({ok:true,version:"1.1.0"}); return true; });
