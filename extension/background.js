// Service Worker tracking active exams
let activeExamTabs = {};

// Listen for tab focus/switch updates
chrome.tabs.onActivated.addListener((activeInfo) => {
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
        });
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
      activeExamTabs[sender.tab.id] = true;
      sendResponse({ status: 'registered' });
    }
    if (message.type === 'UNREGISTER_EXAM_TAB') {
      delete activeExamTabs[sender.tab.id];
      sendResponse({ status: 'unregistered' });
    }
    if (message.type === 'UPDATE_HUD_DATA') {
      // Save details to extension storage for popup to display
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
