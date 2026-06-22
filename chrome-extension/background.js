chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "open_tab") {
    chrome.tabs.create({ url: request.url });
  }
});
