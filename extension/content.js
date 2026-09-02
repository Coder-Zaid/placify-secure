// Content Script running inside Placify Exam page
let examPageActive = false;

// Expose immediate indicator in DOM
try {
  document.documentElement.setAttribute('data-placify-extension-installed', 'true');
} catch (e) {}

// Also respond via CustomEvent as well as postMessage
window.addEventListener('placify-ping-request', () => {
  window.dispatchEvent(new CustomEvent('placify-ping-response', { detail: { version: '1.0.0' } }));
});

// 1. Listen for message communication from the web app page
window.addEventListener('message', (event) => {
  // Only handle messages coming from our own page
  if (event.source !== window) return;

  if (event.data && event.data.source === 'placify-secure-exam-page') {
    if (event.data.type === 'PING_REQUEST') {
      // Set DOM indicator
      try {
        document.documentElement.setAttribute('data-placify-extension-installed', 'true');
      } catch (e) {}

      // Respond immediately to let page know extension is installed
      window.postMessage({
        source: 'placify-secure-extension',
        type: 'PING_RESPONSE',
        version: '1.0.0'
      }, '*');

      if (!examPageActive) {
        examPageActive = true;
        chrome.runtime.sendMessage({
          source: 'placify-secure-content-script',
          type: 'REGISTER_EXAM_TAB'
        }).catch(() => {});
      }
    }

    if (event.data.type === 'UPDATE_HUD') {
      chrome.runtime.sendMessage({
        source: 'placify-secure-content-script',
        type: 'UPDATE_HUD_DATA',
        title: event.data.title,
        timeLeft: event.data.timeLeft,
        warningCount: event.data.warningCount,
        maxWarnings: event.data.maxWarnings
      });
    }
  }
});

// 2. Listen to violation broadcasts from background.js service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.source === 'placify-secure-extension-bg') {
    if (message.type === 'VIOLATION_EVENT') {
      // Relay the violation directly into the page's window context
      window.postMessage({
        source: 'placify-secure-extension',
        type: 'VIOLATION_EVENT',
        eventType: message.eventType
      }, '*');
    }
  }
});

// Clean up registration on window unload
window.addEventListener('beforeunload', () => {
  if (examPageActive) {
    chrome.runtime.sendMessage({
      source: 'placify-secure-content-script',
      type: 'UNREGISTER_EXAM_TAB'
    });
    chrome.storage.local.remove('activeExam');
  }
});
