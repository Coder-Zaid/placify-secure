// Placify Secure — Background Service Worker
// Only activates when user is on a Placify exam page.
// Complies with Chrome Web Store Minimum Privilege policy.

let activeExamTabs = {};

// ---------------------------------------------------------------------------
// Allowed Origins — the content script only runs on these, but we double-check
// in the service worker to be safe.
// ---------------------------------------------------------------------------
const ALLOWED_ORIGINS = [
  'localhost:5173', 'localhost:5174', 'localhost:5175', 'localhost:3000',
  '127.0.0.1:5173', '127.0.0.1:5174',
  'placify.in', 'placify.app', 'placifysecure.com', 'woxsen.edu.in'
];

function isPlacifyOrigin(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    return ALLOWED_ORIGINS.some(origin => u.host === origin || u.host.endsWith('.' + origin));
  } catch { return false; }
}

// ---------------------------------------------------------------------------
// Badge Helpers
// ---------------------------------------------------------------------------
function updateBadge(tabId) {
  if (tabId && activeExamTabs[tabId]) {
    chrome.action.setBadgeText({ text: 'LOCK', tabId: tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#16a34a', tabId: tabId });
  } else if (tabId) {
    chrome.action.setBadgeText({ text: '', tabId: tabId });
  }
}

// ---------------------------------------------------------------------------
// Request the optional "tabs" permission at exam-lock time
// (Chrome shows a prompt only once; subsequent calls resolve immediately)
// ---------------------------------------------------------------------------
async function ensureTabsPermission() {
  try {
    const granted = await chrome.permissions.contains({ permissions: ['tabs'] });
    if (granted) return true;
    // Cannot prompt from a service worker — the content script or popup must
    // request it on our behalf via chrome.permissions.request(). We'll degrade
    // gracefully if the permission isn't available.
    return false;
  } catch { return false; }
}

// ---------------------------------------------------------------------------
// Tab Focus / Switch Monitoring
// Only fires violation events for exam tabs that are on Placify origins.
// ---------------------------------------------------------------------------
chrome.tabs.onActivated.addListener((activeInfo) => {
  updateBadge(activeInfo.tabId);

  // We only need the URL of the newly activated tab, which requires
  // the "tabs" permission. If we don't have it, we still detect
  // switches away from exam tabs by seeing that a different tab got focus.
  Object.keys(activeExamTabs).forEach(examTabId => {
    const numericExamId = parseInt(examTabId);
    if (numericExamId !== activeInfo.tabId && activeExamTabs[examTabId]) {
      chrome.tabs.sendMessage(numericExamId, {
        source: 'placify-secure-extension-bg',
        type: 'VIOLATION_EVENT',
        eventType: 'tab_switch'
      }).catch(() => {});
    }
  });
});

// ---------------------------------------------------------------------------
// Window Focus Monitoring
// ---------------------------------------------------------------------------
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    notifyAllExamTabs('window_blur');
  }
});

// ---------------------------------------------------------------------------
// Message Handler — Content Script ↔ Service Worker
// ---------------------------------------------------------------------------
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.source !== 'placify-secure-content-script') return;

  // Safety check: only accept messages from Placify origins
  if (sender.tab && sender.tab.url && !isPlacifyOrigin(sender.tab.url)) {
    sendResponse({ status: 'rejected', reason: 'origin_not_allowed' });
    return;
  }

  switch (message.type) {
    case 'REGISTER_EXAM_TAB':
      if (sender.tab && sender.tab.id) {
        activeExamTabs[sender.tab.id] = true;
        updateBadge(sender.tab.id);

        chrome.storage.local.set({
          activeExam: {
            title: message.title || 'Placify Proctored Assessment',
            accessCode: message.accessCode || '',
            url: message.url || '',
            warningCount: 0,
            maxWarnings: 3,
            tabId: sender.tab.id
          }
        });
      }
      sendResponse({ status: 'registered' });
      break;

    case 'UNREGISTER_EXAM_TAB':
      if (sender.tab && sender.tab.id) {
        delete activeExamTabs[sender.tab.id];
        updateBadge(sender.tab.id);
      }
      chrome.storage.local.remove('activeExam');
      sendResponse({ status: 'unregistered' });
      break;

    case 'UPDATE_HUD_DATA':
      chrome.storage.local.set({
        activeExam: {
          title: message.title,
          timeLeft: message.timeLeft,
          warningCount: message.warningCount,
          maxWarnings: message.maxWarnings,
          tabId: sender.tab ? sender.tab.id : undefined
        }
      });
      break;

    default:
      break;
  }
});

// ---------------------------------------------------------------------------
// Cleanup when exam tabs are closed
// ---------------------------------------------------------------------------
chrome.tabs.onRemoved.addListener((tabId) => {
  if (activeExamTabs[tabId]) {
    delete activeExamTabs[tabId];
    chrome.storage.local.remove('activeExam');
  }
});

// ---------------------------------------------------------------------------
// Broadcast helper — only sends to registered exam tabs
// ---------------------------------------------------------------------------
function notifyAllExamTabs(eventType) {
  Object.keys(activeExamTabs).forEach(tabId => {
    chrome.tabs.sendMessage(parseInt(tabId), {
      source: 'placify-secure-extension-bg',
      type: 'VIOLATION_EVENT',
      eventType: eventType
    }).catch(() => {});
  });
}
