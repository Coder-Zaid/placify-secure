document.addEventListener('DOMContentLoaded', () => {
  const noExamState = document.getElementById('no-exam');
  const activeExamState = document.getElementById('active-exam');
  const examTitleEl = document.getElementById('exam-title');
  const timeLeftEl = document.getElementById('time-left');
  const warningCountEl = document.getElementById('warning-count');

  function updatePopup() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTabId = tabs && tabs[0] ? tabs[0].id : null;
      
      chrome.storage.local.get('activeExam', (data) => {
        if (data && data.activeExam && (!data.activeExam.tabId || data.activeExam.tabId === currentTabId)) {
          noExamState.classList.remove('active');
          activeExamState.classList.add('active');

          examTitleEl.textContent = data.activeExam.title || 'Assessment in Progress';
          
          // Format time
          const totalSecs = data.activeExam.timeLeft || 0;
          const mins = Math.floor(totalSecs / 60);
          const secs = totalSecs % 60;
          timeLeftEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
          
          warningCountEl.textContent = `${data.activeExam.warningCount || 0}/${data.activeExam.maxWarnings || 1}`;
        } else {
          noExamState.classList.add('active');
          activeExamState.classList.remove('active');
        }
      });
    });
  }

  // Update immediately
  updatePopup();
  
  // Refresh data every second
  setInterval(updatePopup, 1000);
});
