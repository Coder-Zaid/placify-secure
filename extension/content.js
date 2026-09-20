// Content Script running inside Placify Exam page
let examPageActive = false;

// Expose immediate indicator in DOM & Window for standalone Proctor-Secure AND Placify main
try {
  document.documentElement.setAttribute('data-placify-extension-installed', 'true');
  document.documentElement.setAttribute('data-placify-secure', 'enabled');
  window.PLACIFY_SECURE_EXTENSION_INSTALLED = true;
  const script = document.createElement('script');
  script.textContent = `
    window.__PLACIFY_EXTENSION_INSTALLED__ = true;
    window.PLACIFY_SECURE_EXTENSION_INSTALLED = true;
    document.documentElement.setAttribute('data-placify-secure', 'enabled');
    window.dispatchEvent(new CustomEvent('placify-extension-ready'));
  `;
  (document.head || document.documentElement).appendChild(script);
  script.remove();
} catch (e) {}

// Also respond via CustomEvent as well as postMessage
window.addEventListener('placify-ping-request', () => {
  try {
    document.documentElement.setAttribute('data-placify-extension-installed', 'true');
    document.documentElement.setAttribute('data-placify-secure', 'enabled');
    window.PLACIFY_SECURE_EXTENSION_INSTALLED = true;
  } catch (e) {}
  window.dispatchEvent(new CustomEvent('placify-ping-response', { detail: { version: '1.0.0' } }));
});

// Auto-register exam tab immediately on page load if on assessment/exam route
function announceExamTab() {
  try {
    const isExam = window.location.pathname.includes('/exam/') || window.location.pathname.includes('/assessments');
    if (isExam) {
      const match = window.location.pathname.match(/\/exam\/([A-Za-z0-9_-]+)/);
      const accessCode = match ? match[1] : '';
      const pageTitle = document.title || 'Placify Proctored Assessment';
      
      chrome.runtime.sendMessage({
        source: 'placify-secure-content-script',
        type: 'REGISTER_EXAM_TAB',
        url: window.location.href,
        accessCode: accessCode,
        title: pageTitle
      }).catch(() => {});
    }
  } catch (err) {}
}

announceExamTab();
setTimeout(announceExamTab, 600);

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
