// Service Worker tracking active exams
let activeExamTabs = {};

// Update extension badge on active tab
function updateBadge(tabId) {
  if (tabId && activeExamTabs[tabId]) {
    chrome.action.setBadgeText({ text: 'LOCK', tabId: tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#16a34a', tabId: tabId });
  } else if (tabId) {
    chrome.action.setBadgeText({ text: '', tabId: tabId });
  }
}

// Listen for tab focus/switch updates
chrome.tabs.onActivated.addListener((activeInfo) => {
  updateBadge(activeInfo.tabId);
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (chrome.runtime.lastError || !tab) return;
    
    // Check if we switched away from an active exam tab
    Object.keys(activeExamTabs).forEach(examTabId => {
      const numericExamId = parseInt(examTabId);
      if (numericExamId !== activeInfo.tabId && activeExamTabs[examTabId]) {
        // Log tab switch violation
        chrome.tabs.sendMessage(numericExamId, {
          source: 'placify-secure-extension-bg',
          type: 'VIOLATION_EVENT',
          eventType: 'tab_switch'
        }).catch(() => {});
      }
    });
  });
});

// Monitor window focus
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Browser lost focus completely
    notifyAllExamTabs('window_blur');
  }
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.source === 'placify-secure-content-script') {
    if (message.type === 'REGISTER_EXAM_TAB') {
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
    }
    if (message.type === 'UNREGISTER_EXAM_TAB') {
      if (sender.tab && sender.tab.id) {
        delete activeExamTabs[sender.tab.id];
        updateBadge(sender.tab.id);
      }
      chrome.storage.local.remove('activeExam');
      sendResponse({ status: 'unregistered' });
    }
    if (message.type === 'UPDATE_HUD_DATA') {
      chrome.storage.local.set({
        activeExam: {
          title: message.title,
          timeLeft: message.timeLeft,
          warningCount: message.warningCount,
          maxWarnings: message.maxWarnings,
          tabId: sender.tab.id
        }
      });
    }
  }
});

function notifyAllExamTabs(eventType) {
  Object.keys(activeExamTabs).forEach(tabId => {
    chrome.tabs.sendMessage(parseInt(tabId), {
      source: 'placify-secure-extension-bg',
      type: 'VIOLATION_EVENT',
      eventType: eventType
    });
  });
}
