chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getAuthToken") {
    chrome.identity.getAuthToken({ interactive: true }, function (token) {
      if (chrome.runtime.lastError) {
        console.error("Error getting auth token:", chrome.runtime.lastError);
        sendResponse({ error: chrome.runtime.lastError });
      } else {
        console.log("Auth token received:", token);
        sendResponse({ token: token });
      }
    });
    return true; // 异步响应
  }
});
