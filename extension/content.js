// Placify Secure — Content Script
// This script ONLY runs on Placify domains and local dev servers
// as declared in manifest.json content_scripts.matches.
// It never injects into banks, email, social media, or any external site.

let examPageActive = false;

// ---------------------------------------------------------------------------
// 1. DOM & Window Signals — Expose presence markers for the exam page to detect
// ---------------------------------------------------------------------------
function applyDomMarkers() {
  try {
    if (document.documentElement) {
      document.documentElement.setAttribute('data-placify-extension-installed', 'true');
      document.documentElement.setAttribute('data-placify-secure', 'enabled');
    }
    if (document.body) {
      document.body.setAttribute('data-placify-extension-installed', 'true');
      document.body.setAttribute('data-placify-secure', 'enabled');
    }
  } catch (e) {}
}

applyDomMarkers();
document.addEventListener('DOMContentLoaded', applyDomMarkers);
window.addEventListener('load', applyDomMarkers);

// Note: Global window flags are injected natively via injected.js (world: "MAIN")
// to prevent any Content Security Policy (CSP) inline-script violation.

// ---------------------------------------------------------------------------
// 2. Ping / Heartbeat — Respond to the exam page's liveness checks
// ---------------------------------------------------------------------------
function replyToPing() {
  applyDomMarkers();
  window.dispatchEvent(
    new CustomEvent('placify-ping-response', { detail: { version: '1.1.0' } })
  );
  window.postMessage({
    source: 'placify-secure-extension',
    type: 'PING_RESPONSE',
    version: '1.1.0'
  }, '*');
}

window.addEventListener('placify-ping-request', replyToPing);

// Periodic heartbeat: continuously broadcast presence to the page and maintain DOM attribute
setInterval(() => {
  applyDomMarkers();
  window.postMessage({
    source: 'placify-secure-extension',
    type: 'HEARTBEAT',
    version: '1.1.0'
  }, '*');
}, 2000);

// ---------------------------------------------------------------------------
// 3. Auto-Register Exam Tab — Inform background service worker
// ---------------------------------------------------------------------------
function announceExamTab() {
  try {
    const isExam =
      window.location.pathname.includes('/exam/') ||
      window.location.pathname.includes('/assessments');
    if (!isExam) return;

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
  } catch (err) {
    // Extension context may be invalidated on quick navigations
  }
}

announceExamTab();
setTimeout(announceExamTab, 600);

// ---------------------------------------------------------------------------
// 4. Page ↔ Extension Message Bridge
// ---------------------------------------------------------------------------
window.addEventListener('message', (event) => {
  // Only handle messages originating from our own page
  if (event.source !== window) return;
  if (!event.data) return;

  if (event.data.type === 'PING_REQUEST') {
    applyDomMarkers();
    window.postMessage({
      source: 'placify-secure-extension',
      type: 'PING_RESPONSE',
      version: '1.1.0'
    }, '*');
    window.dispatchEvent(
      new CustomEvent('placify-ping-response', { detail: { version: '1.1.0' } })
    );

    // Register with background on first ping
    if (!examPageActive) {
      examPageActive = true;
      chrome.runtime.sendMessage({
        source: 'placify-secure-content-script',
        type: 'REGISTER_EXAM_TAB'
      }).catch(() => {});
    }
    return;
  }

  if (event.data.source !== 'placify-secure-exam-page') return;

  switch (event.data.type) {

    case 'UPDATE_HUD':
      chrome.runtime.sendMessage({
        source: 'placify-secure-content-script',
        type: 'UPDATE_HUD_DATA',
        title: event.data.title,
        timeLeft: event.data.timeLeft,
        warningCount: event.data.warningCount,
        maxWarnings: event.data.maxWarnings
      }).catch(() => {});
      break;

    default:
      break;
  }
});

// ---------------------------------------------------------------------------
// 5. Receive Violation Events from Background Service Worker
// ---------------------------------------------------------------------------
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.source !== 'placify-secure-extension-bg') return;

  if (message.type === 'VIOLATION_EVENT') {
    // Relay the violation into the page's window context
    window.postMessage({
      source: 'placify-secure-extension',
      type: 'VIOLATION_EVENT',
      eventType: message.eventType
    }, '*');
  }
});

// ---------------------------------------------------------------------------
// 6. Cleanup on Tab Close / Navigation Away
// ---------------------------------------------------------------------------
window.addEventListener('beforeunload', () => {
  if (examPageActive) {
    chrome.runtime.sendMessage({
      source: 'placify-secure-content-script',
      type: 'UNREGISTER_EXAM_TAB'
    }).catch(() => {});
    chrome.storage.local.remove('activeExam');
  }
});
