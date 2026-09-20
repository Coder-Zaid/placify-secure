document.addEventListener('DOMContentLoaded', () => {
  const noExamState = document.getElementById('no-exam');
  const activeExamState = document.getElementById('active-exam');
  const examTitleEl = document.getElementById('exam-title');
  const examAccessCodeEl = document.getElementById('exam-access-code');
  const timeLeftEl = document.getElementById('time-left');
  const warningCountEl = document.getElementById('warning-count');
  const statusPill = document.getElementById('status-pill');
  const statusPillText = document.getElementById('status-pill-text');
  const openExamBtn = document.getElementById('open-exam-btn');

  if (openExamBtn) {
    openExamBtn.addEventListener('click', () => {
      // Find an existing Placify tab or open one
      chrome.tabs.query({}, (tabs) => {
        const examTab = tabs.find(t => t.url && (t.url.includes('/exam/') || t.url.includes('/assessments') || t.url.includes('localhost:5173')));
        if (examTab && examTab.id) {
          chrome.tabs.update(examTab.id, { active: true });
        } else {
          chrome.tabs.create({ url: 'http://localhost:5173/assessments' });
        }
      });
    });
  }

  function updatePopup() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs && tabs[0] ? tabs[0] : null;
      const currentUrl = currentTab && currentTab.url ? currentTab.url : '';
      
      const isExamUrl = currentUrl.includes('/exam/') || currentUrl.includes('/assessments') || currentUrl.includes('localhost:5173') || currentUrl.includes('localhost:5174');

      // Extract exam code if present in URL
      let urlExamCode = '';
      const match = currentUrl.match(/\/exam\/([A-Za-z0-9_-]+)/);
      if (match && match[1]) {
        urlExamCode = match[1];
      }

      chrome.storage.local.get('activeExam', (data) => {
        const storedExam = data ? data.activeExam : null;
        
        // Active/Locked state if stored exam exists OR current tab is an exam page
        if (storedExam || isExamUrl) {
          noExamState.classList.remove('active');
          activeExamState.classList.add('active');

          // Update Status Pill to LOCKED
          if (statusPill && statusPillText) {
            statusPill.className = 'status-pill active';
            statusPillText.textContent = 'LOCKED';
          }

          // Title & Code
          const title = (storedExam && storedExam.title) 
            ? storedExam.title 
            : (currentTab && currentTab.title && !currentTab.title.includes('localhost'))
              ? currentTab.title
              : 'Placify Proctored Assessment';
          examTitleEl.textContent = title;

          const accessCode = (storedExam && storedExam.accessCode)
            ? storedExam.accessCode
            : urlExamCode || 'Active Session';
          examAccessCodeEl.textContent = `CODE: ${accessCode} • LOCKED`;

          // Format time
          if (storedExam && typeof storedExam.timeLeft === 'number') {
            const mins = Math.floor(storedExam.timeLeft / 60);
            const secs = storedExam.timeLeft % 60;
            timeLeftEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
          } else {
            timeLeftEl.textContent = 'ARMED';
          }

          // Warnings
          const strikes = storedExam ? (storedExam.warningCount || 0) : 0;
          const maxStrikes = storedExam ? (storedExam.maxWarnings || 3) : 3;
          warningCountEl.textContent = `${strikes}/${maxStrikes}`;

        } else {
          // Idle / Standby state
          noExamState.classList.add('active');
          activeExamState.classList.remove('active');

          if (statusPill && statusPillText) {
            statusPill.className = 'status-pill idle';
            statusPillText.textContent = 'STANDBY';
          }
        }
      });
    });
  }

  // Update immediately and poll
  updatePopup();
  setInterval(updatePopup, 1000);
});
