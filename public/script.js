let logs = [];
let dailyGoal = 0;
let filteredLogs = [];
let timerInterval = null;
let currentTime = 25 * 60; // 25 minutes in seconds
let isRunning = false;
let isBreakTime = false;
let completedSessions = 0;
let totalFocusTime = 0;
let currentTheme = 'dark';
let remindersEnabled = false;
let achievements = {
  firstEntry: false,
  streak3: false,
  streak7: false,
  streak30: false,
  hours10: false,
  hours50: false,
  hours100: false,
  perfectWeek: false,
  earlyBird: false,
  nightOwl: false
};

// ------------------- Initialize Charts -------------------

// Progress Chart (Hours per Date)
let chart = null;
let subjectChart = null;
let updateTimeout = null;

// Debounced update function to prevent excessive updates
function debouncedUpdate() {
  if (updateTimeout) {
    clearTimeout(updateTimeout);
  }
  updateTimeout = setTimeout(() => {
    updateAll();
  }, 300); // 300ms delay
}

// Initialize charts after DOM loads
function initializeCharts() {
  try {
    // Progress Chart (Hours per Date)
    const ctx = document.getElementById('progressChart');
    if (ctx) {
      chart = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
          labels: [],
          datasets: [{
            label: 'Hours Studied',
            data: [],
            backgroundColor: '#6366f1',
            borderColor: '#4f46e5',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            intersect: false,
            mode: 'index'
          },
          animation: {
            duration: 400, // Reduced animation time
            easing: 'easeOutQuart'
          },
          scales: { 
            y: { 
              beginAtZero: true,
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              },
              ticks: {
                color: '#6b7280',
                maxTicksLimit: 6 // Limit ticks for performance
              }
            },
            x: {
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              },
              ticks: {
                color: '#6b7280',
                maxTicksLimit: 8 // Limit ticks for performance
              }
            }
          },
          plugins: {
            legend: {
              labels: {
                color: '#6b7280'
              }
            }
          }
        }
      });
    }

    // Subject Chart (Hours per Subject)
    const subjectCtx = document.getElementById('subjectChart');
    if (subjectCtx) {
      subjectChart = new Chart(subjectCtx.getContext('2d'), {
        type: 'pie',
        data: {
          labels: [],
          datasets: [{
            label: 'Hours per Subject',
            data: [],
            backgroundColor: []
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            intersect: false
          },
          animation: {
            duration: 400, // Reduced animation time
            easing: 'easeOutQuart'
          },
          plugins: { 
            legend: { 
              position: 'bottom',
              labels: {
                color: '#6b7280',
                usePointStyle: true,
                padding: 15,
                font: {
                  size: 11
                }
              }
            }
          }
        }
      });
    }
  } catch (error) {
    console.error('Error initializing charts:', error);
  }
}

// ------------------- Functions -------------------

// Update all displays
function updateAll() {
  updateChart();
  updateSubjectChart();
  updateLogDisplay();
  updateSummary();
  updateSubjectFilter();
  updateNavbarStats();
  checkAchievements();
}

// Capitalize subject for display
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Add new entry
function addEntry() {
  try {
    const date = document.getElementById('date').value;
    const subject = document.getElementById('subject').value.trim();
    const hours = parseFloat(document.getElementById('hours').value);
    const grade = parseFloat(document.getElementById('grade').value) || null;
    const notes = document.getElementById('notes').value.trim();

    // Validation
    if (!date) {
      alert("Please select a date.");
      return;
    }
    
    if (!subject) {
      alert("Please enter a subject.");
      return;
    }
    
    if (!document.getElementById('hours').value || isNaN(hours)) {
      alert("Please enter valid hours.");
      return;
    }

    if (hours < 0 || hours > 24) {
      alert("Hours must be between 0 and 24.");
      return;
    }

    const displaySubject = capitalize(subject.toLowerCase());
    const newLog = { 
      id: Date.now() + Math.random(), // Ensure unique ID
      date, 
      subject: subject.toLowerCase(), 
      displaySubject, 
      hours, 
      grade, 
      notes,
      timestamp: new Date().toISOString()
    };
    
    logs.push(newLog);
    localStorage.setItem("studyLogs", JSON.stringify(logs));

    // Use debounced update for better performance
    debouncedUpdate();
    updateStreak();
    updateDailyGoal();

    // Clear form
    document.getElementById('subject').value = '';
    document.getElementById('hours').value = '';
    document.getElementById('grade').value = '';
    document.getElementById('notes').value = '';
    
    // Show success message
    showNotification('Entry added successfully! 🎉', 'success');
    
    console.log('Entry added:', newLog);
    console.log('Total logs:', logs.length);
  } catch (error) {
    console.error('Error adding entry:', error);
    showNotification('Error adding entry. Please try again.', 'error');
  }
}

// Update Progress Chart (Hours per Date)
function updateChart() {
  if (!chart) return;
  
  try {
    const dateMap = {};
    logs.forEach(log => {
      dateMap[log.date] = (dateMap[log.date] || 0) + log.hours;
    });

    const sortedDates = Object.keys(dateMap).sort();
    // Limit to last 30 days for performance
    const recentDates = sortedDates.slice(-30);

    chart.data.labels = recentDates;
    chart.data.datasets[0].data = recentDates.map(date => dateMap[date]);
    chart.update('none'); // No animation for better performance
  } catch (error) {
    console.error('Error updating progress chart:', error);
  }
}

// Update Subject Chart (Hours per Subject)
function updateSubjectChart() {
  if (!subjectChart) return;
  
  try {
    const subjectMap = {};
    logs.forEach(log => {
      subjectMap[log.displaySubject] = (subjectMap[log.displaySubject] || 0) + log.hours;
    });

    const subjects = Object.keys(subjectMap);
    const hours = Object.values(subjectMap);

    // Generate vibrant colors for subjects
    const colors = [
      '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
      '#eab308', '#22c55e', '#10b981', '#06b6d4', '#3b82f6'
    ];
    const backgroundColors = subjects.map((_, index) => colors[index % colors.length]);

    subjectChart.data.labels = subjects;
    subjectChart.data.datasets[0].data = hours;
    subjectChart.data.datasets[0].backgroundColor = backgroundColors;
    subjectChart.update('none'); // No animation for better performance
  } catch (error) {
    console.error('Error updating subject chart:', error);
  }
}

// Display logs with filtering
function updateLogDisplay() {
  const logDiv = document.getElementById('logList');
  const displayLogs = filteredLogs.length > 0 ? filteredLogs : logs;
  
  logDiv.innerHTML = '';
  
  if (displayLogs.length === 0) {
    logDiv.innerHTML = '<p style="text-align: center; color: #888; padding: 2rem;">No logs found. Start studying! 📚</p>';
    return;
  }
  
  displayLogs.slice().reverse().forEach((log, index) => {
    const realIndex = logs.findIndex(l => l.id === log.id);
    const gradeDisplay = log.grade ? `<br><strong>Grade:</strong> ${log.grade}%` : '';
    
    // Format timestamp in 24-hour format if available
    let timestampDisplay = '';
    if (log.timestamp) {
      const logTime = new Date(log.timestamp);
      const timeStr = logTime.toLocaleTimeString('en-US', { hour12: false });
      timestampDisplay = ` at ${timeStr}`;
    }
    
    logDiv.innerHTML += `
      <div class="log-entry">
        <strong>📅 Date:</strong> ${log.date}${timestampDisplay}<br>
        <strong>📖 Subject:</strong> ${log.displaySubject}<br>
        <strong>⏰ Hours:</strong> ${log.hours}h${gradeDisplay}<br>
        <strong>📝 Notes:</strong> ${log.notes || 'No notes'}<br>
        <button onclick="deleteLog(${realIndex})" title="Delete this entry">❌ Delete</button>
        <br><br>
      </div>
    `;
  });
}

// Delete a single log
function deleteLog(index) {
  if (confirm("Delete this entry?")) {
    logs.splice(index, 1);
    localStorage.setItem("studyLogs", JSON.stringify(logs));
    updateAll();
  }
}

// Clear all logs
function clearAllLogs() {
  if (confirm("Are you sure you want to delete all logs?")) {
    logs = [];
    localStorage.removeItem("studyLogs");
    updateAll();
  }
}

// Update summary with grades
function updateSummary() {
  try {
    console.log('Updating summary with', logs.length, 'logs');
    
    if (logs.length === 0) {
      document.getElementById('totalHours').textContent = '00';
      document.getElementById('avgHours').textContent = '0.00';
      document.getElementById('mostSubject').textContent = '-';
      document.getElementById('leastSubject').textContent = '-';
      document.getElementById('avgGrade').textContent = '-';
      document.getElementById('totalEntries').textContent = '0';
      return;
    }

    let total = 0;
    let totalGrades = 0;
    let gradeCount = 0;
    const count = logs.length;
    const subjectMap = {};

    logs.forEach(log => {
      total += log.hours;
      subjectMap[log.displaySubject] = (subjectMap[log.displaySubject] || 0) + log.hours;
      
      if (log.grade !== null && !isNaN(log.grade)) {
        totalGrades += log.grade;
        gradeCount++;
      }
    });

    const avg = (total / count).toFixed(2);
    const avgGrade = gradeCount > 0 ? (totalGrades / gradeCount).toFixed(1) + '%' : '-';
    
    const subjects = Object.entries(subjectMap);
    const mostStudied = subjects.length > 0 ? subjects.reduce((a, b) => a[1] > b[1] ? a : b)[0] : '-';
    const leastStudied = subjects.length > 0 ? subjects.reduce((a, b) => a[1] < b[1] ? a : b)[0] : '-';

    // Update DOM elements
    const totalHoursEl = document.getElementById('totalHours');
    const avgHoursEl = document.getElementById('avgHours');
    const mostSubjectEl = document.getElementById('mostSubject');
    const leastSubjectEl = document.getElementById('leastSubject');
    const avgGradeEl = document.getElementById('avgGrade');
    const totalEntriesEl = document.getElementById('totalEntries');
    
    if (totalHoursEl) totalHoursEl.textContent = total.toString().padStart(2, '0');
    if (avgHoursEl) avgHoursEl.textContent = avg;
    if (mostSubjectEl) mostSubjectEl.textContent = mostStudied;
    if (leastSubjectEl) leastSubjectEl.textContent = leastStudied;
    if (avgGradeEl) avgGradeEl.textContent = avgGrade;
    if (totalEntriesEl) totalEntriesEl.textContent = count;
    
    console.log('Summary updated:', { total, avg, mostStudied, leastStudied, avgGrade, count });
  } catch (error) {
    console.error('Error updating summary:', error);
  }
}

// Update navbar stats
function updateNavbarStats() {
  const streak = calculateCurrentStreak();
  const today = new Date().toISOString().split('T')[0];
  const todayHours = logs
    .filter(log => log.date === today)
    .reduce((sum, log) => sum + log.hours, 0);
  const earnedBadges = Object.values(achievements).filter(Boolean).length;
  
  document.getElementById('navStreak').textContent = streak;
  document.getElementById('navHours').textContent = todayHours.toFixed(1) + 'h';
  document.getElementById('navBadges').textContent = earnedBadges;
}

// Quick add functionality
function quickAdd() {
  const today = new Date().toISOString().split('T')[0];
  const subject = prompt('Enter subject:');
  const hours = parseFloat(prompt('Enter hours studied:'));
  
  if (subject && !isNaN(hours) && hours > 0) {
    const newLog = {
      id: Date.now(),
      date: today,
      subject: subject.toLowerCase(),
      displaySubject: capitalize(subject),
      hours: hours,
      grade: null,
      notes: '',
      timestamp: new Date().toISOString()
    };
    
    logs.push(newLog);
    localStorage.setItem("studyLogs", JSON.stringify(logs));
    updateAll();
    updateStreak();
    updateDailyGoal();
    updateNavbarStats();
    checkAchievements();
    showNotification(`Quick entry added: ${newLog.displaySubject} (${hours}h) ✅`, 'success');
  }
}

// Quick timer functionality
function quickTimer() {
  if (!isRunning) {
    startTimer();
    document.getElementById('timerQuickBtn').innerHTML = `
      <span class="btn-icon">⏸️</span>
      <span class="btn-text">Pause</span>
    `;
  } else {
    pauseTimer();
    document.getElementById('timerQuickBtn').innerHTML = `
      <span class="btn-icon">▶️</span>
      <span class="btn-text">Focus</span>
    `;
  }
}

// Enhanced Profile/Settings functionality
function showProfile() {
  const modal = document.getElementById('profileModal');
  const profileContent = document.getElementById('profileContent');
  
  const totalHours = logs.reduce((sum, log) => sum + log.hours, 0);
  const totalSessions = logs.length;
  const avgGrade = logs.filter(log => log.grade).reduce((sum, log, _, arr) => sum + log.grade / arr.length, 0);
  const streak = calculateCurrentStreak();
  const earnedBadges = Object.values(achievements).filter(Boolean).length;
  const totalBadges = Object.keys(achievementDefinitions).length;
  
  const today = new Date().toISOString().split('T')[0];
  const todayHours = logs.filter(log => log.date === today).reduce((sum, log) => sum + log.hours, 0);
  
  profileContent.innerHTML = `
    <div class="profile-stats">
      <div class="profile-stat">
        <div class="profile-stat-icon">📚</div>
        <div class="profile-stat-value">${totalHours.toFixed(1)}</div>
        <div class="profile-stat-label">Total Hours</div>
      </div>
      
      <div class="profile-stat">
        <div class="profile-stat-icon">📝</div>
        <div class="profile-stat-value">${totalSessions}</div>
        <div class="profile-stat-label">Study Sessions</div>
      </div>
      
      <div class="profile-stat">
        <div class="profile-stat-icon">🔥</div>
        <div class="profile-stat-value">${streak}</div>
        <div class="profile-stat-label">Day Streak</div>
      </div>
      
      <div class="profile-stat">
        <div class="profile-stat-icon">🏆</div>
        <div class="profile-stat-value">${earnedBadges}/${totalBadges}</div>
        <div class="profile-stat-label">Badges Earned</div>
      </div>
      
      <div class="profile-stat">
        <div class="profile-stat-icon">⏰</div>
        <div class="profile-stat-value">${todayHours.toFixed(1)}h</div>
        <div class="profile-stat-label">Today's Study</div>
      </div>
      
      <div class="profile-stat">
        <div class="profile-stat-icon">📈</div>
        <div class="profile-stat-value">${avgGrade ? avgGrade.toFixed(1) + '%' : 'N/A'}</div>
        <div class="profile-stat-label">Average Grade</div>
      </div>
    </div>
    
    <div style="text-align: center; margin-top: 2rem;">
      <h3 style="color: #fff; margin-bottom: 1rem;">🎆 Keep up the excellent work!</h3>
      <p style="color: rgba(255, 255, 255, 0.8); font-size: 0.9rem;">You're making great progress on your learning journey. Stay consistent and keep achieving your goals!</p>
    </div>
  `;
  
  modal.style.display = 'block';
}

function closeProfileModal() {
  document.getElementById('profileModal').style.display = 'none';
}

// Show all badges modal
function showAllBadges() {
  const modal = document.getElementById('badgesModal');
  const allBadgesList = document.getElementById('allBadgesList');
  
  allBadgesList.innerHTML = '';
  
  Object.entries(achievementDefinitions).forEach(([key, def]) => {
    const isEarned = achievements[key];
    const badge = document.createElement('div');
    badge.className = `detailed-badge ${isEarned ? 'earned' : ''}`;
    badge.innerHTML = `
      <div class="detailed-badge-icon">${def.icon}</div>
      <div class="detailed-badge-info">
        <div class="detailed-badge-name">${def.name} ${isEarned ? '✓' : ''}</div>
        <div class="detailed-badge-description">${def.description}</div>
        <div class="detailed-badge-requirement">${isEarned ? 'Completed!' : 'Requirement: ' + def.requirement}</div>
      </div>
    `;
    allBadgesList.appendChild(badge);
  });
  
  modal.style.display = 'block';
}

function closeBadgesModal() {
  document.getElementById('badgesModal').style.display = 'none';
}

// Close modals when clicking outside
window.onclick = function(event) {
  const profileModal = document.getElementById('profileModal');
  const badgesModal = document.getElementById('badgesModal');
  
  if (event.target === profileModal) {
    profileModal.style.display = 'none';
  }
  if (event.target === badgesModal) {
    badgesModal.style.display = 'none';
  }
}

// ------------------- New Features -------------------

// Goals Management
function setDailyGoal() {
  const goalInput = document.getElementById('dailyGoal');
  const goal = parseFloat(goalInput.value);
  
  if (isNaN(goal) || goal <= 0) {
    alert('Please enter a valid goal (greater than 0)');
    return;
  }
  
  dailyGoal = goal;
  localStorage.setItem('studyGoal', dailyGoal.toString());
  updateDailyGoal();
  showNotification(`Daily goal set to ${goal} hours! 🎯`, 'success');
}

// Reset Daily Goal
function resetDailyGoal() {
  if (confirm('Are you sure you want to reset your daily goal?')) {
    dailyGoal = 0;
    localStorage.removeItem('studyGoal');
    document.getElementById('dailyGoal').value = '';
    updateDailyGoal();
    showNotification('Daily goal reset! 🔄', 'info');
  }
}

function updateDailyGoal() {
  if (dailyGoal <= 0) {
    document.getElementById('goalText').textContent = 'No goal set';
    document.getElementById('goalProgressBar').style.width = '0%';
    return;
  }
  
  const today = new Date().toISOString().split('T')[0];
  const todayHours = logs
    .filter(log => log.date === today)
    .reduce((sum, log) => sum + log.hours, 0);
  
  const progress = Math.min((todayHours / dailyGoal) * 100, 100);
  const progressBar = document.getElementById('goalProgressBar');
  const goalText = document.getElementById('goalText');
  
  progressBar.style.width = progress + '%';
  
  if (progress >= 100) {
    goalText.innerHTML = `🎉 Goal achieved! ${todayHours.toFixed(1)}h / ${dailyGoal}h`;
    progressBar.style.background = 'linear-gradient(90deg, #28a745, #20c997)';
  } else {
    goalText.innerHTML = `${todayHours.toFixed(1)}h / ${dailyGoal}h (${progress.toFixed(1)}%)`;
    progressBar.style.background = 'linear-gradient(90deg, #00d9ff, #0099cc)';
  }
}

// Study Streak Calculation
function updateStreak() {
  if (logs.length === 0) {
    document.querySelector('.streak-number').textContent = '0';
    document.getElementById('streakMessage').textContent = 'Start studying to build your streak!';
    return;
  }
  
  const dates = [...new Set(logs.map(log => log.date))].sort().reverse();
  const today = new Date().toISOString().split('T')[0];
  let streak = 0;
  
  // Check if studied today
  if (dates[0] === today) {
    streak = 1;
    
    // Count consecutive days
    for (let i = 1; i < dates.length; i++) {
      const currentDate = new Date(dates[i-1]);
      const prevDate = new Date(dates[i]);
      const dayDiff = Math.floor((currentDate - prevDate) / (1000 * 60 * 60 * 24));
      
      if (dayDiff === 1) {
        streak++;
      } else {
        break;
      }
    }
  }
  
  document.querySelector('.streak-number').textContent = streak;
  
  if (streak === 0) {
    document.getElementById('streakMessage').textContent = 'Study today to start your streak! 🚀';
  } else if (streak === 1) {
    document.getElementById('streakMessage').textContent = 'Great start! Keep it up! 💪';
  } else if (streak < 7) {
    document.getElementById('streakMessage').textContent = `Amazing! ${streak} days strong! 🔥`;
  } else {
    document.getElementById('streakMessage').textContent = `Incredible streak! You're on fire! 🎆`;
  }
}

// Search and Filter Functions
let filterTimeout = null;

// Throttled filter function to prevent excessive filtering
function throttledFilter() {
  if (filterTimeout) {
    clearTimeout(filterTimeout);
  }
  filterTimeout = setTimeout(() => {
    applyFilters();
  }, 250); // 250ms delay
}

function updateSubjectFilter() {
  const filter = document.getElementById('subjectFilter');
  const subjects = [...new Set(logs.map(log => log.displaySubject))].sort();
  
  // Clear existing options except "All Subjects"
  filter.innerHTML = '<option value="">All Subjects</option>';
  
  subjects.forEach(subject => {
    const option = document.createElement('option');
    option.value = subject;
    option.textContent = subject;
    filter.appendChild(option);
  });
}

function applyFilters() {
  try {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const subjectFilter = document.getElementById('subjectFilter').value;
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    
    filteredLogs = logs.filter(log => {
      const matchesSearch = !searchTerm || 
        log.displaySubject.toLowerCase().includes(searchTerm) ||
        log.notes.toLowerCase().includes(searchTerm);
      
      const matchesSubject = !subjectFilter || log.displaySubject === subjectFilter;
      
      const matchesDateFrom = !dateFrom || log.date >= dateFrom;
      const matchesDateTo = !dateTo || log.date <= dateTo;
      
      return matchesSearch && matchesSubject && matchesDateFrom && matchesDateTo;
    });
    
    updateLogDisplay();
  } catch (error) {
    console.error('Error applying filters:', error);
  }
}

// Export Data Function
function exportData() {
  if (logs.length === 0) {
    alert('No data to export!');
    return;
  }
  
  const csvHeader = 'Date,Subject,Hours,Grade,Notes\n';
  const csvData = logs.map(log => {
    const grade = log.grade !== null ? log.grade : '';
    const notes = log.notes.replace(/"/g, '""'); // Escape quotes
    return `${log.date},${log.displaySubject},${log.hours},${grade},"${notes}"`;
  }).join('\n');
  
  const csvContent = csvHeader + csvData;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `study-logs-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Data exported successfully! 📥', 'success');
  } else {
    alert('Export not supported in this browser');
  }
}

// Notification System
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    color: white;
    font-weight: bold;
    z-index: 1000;
    animation: slideIn 0.3s ease;
    max-width: 300px;
  `;
  
  switch(type) {
    case 'success':
      notification.style.background = 'linear-gradient(45deg, #28a745, #20c997)';
      break;
    case 'error':
      notification.style.background = 'linear-gradient(45deg, #dc3545, #c82333)';
      break;
    default:
      notification.style.background = 'linear-gradient(45deg, #00d9ff, #0099cc)';
  }
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => {
      if (notification.parentNode) {
        document.body.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

// ------------------- Advanced Features -------------------

// Pomodoro Timer Functions
function startTimer() {
  if (!isRunning) {
    isRunning = true;
    document.getElementById('startTimer').disabled = true;
    document.getElementById('pauseTimer').disabled = false;
    
    timerInterval = setInterval(() => {
      currentTime--;
      updateTimerDisplay();
      
      if (currentTime <= 0) {
        completeSession();
      }
    }, 1000);
    
    showNotification('Timer started! Focus time! 🎯', 'success');
  }
}

function pauseTimer() {
  if (isRunning) {
    isRunning = false;
    clearInterval(timerInterval);
    document.getElementById('startTimer').disabled = false;
    document.getElementById('pauseTimer').disabled = true;
    
    showNotification('Timer paused ⏸️', 'info');
  }
}

function resetTimer() {
  isRunning = false;
  clearInterval(timerInterval);
  
  if (isBreakTime) {
    currentTime = parseInt(document.getElementById('focusTime').value) * 60;
    isBreakTime = false;
    document.getElementById('timerLabel').textContent = 'Focus Time';
  } else {
    currentTime = parseInt(document.getElementById('focusTime').value) * 60;
  }
  
  updateTimerDisplay();
  document.getElementById('startTimer').disabled = false;
  document.getElementById('pauseTimer').disabled = true;
  
  showNotification('Timer reset 🔄', 'info');
}

function completeSession() {
  clearInterval(timerInterval);
  isRunning = false;
  
  if (!isBreakTime) {
    // Focus session completed
    completedSessions++;
    totalFocusTime += parseInt(document.getElementById('focusTime').value);
    
    // Check for long break (every 4 sessions)
    if (completedSessions % 4 === 0) {
      currentTime = parseInt(document.getElementById('longBreakTime').value) * 60;
      document.getElementById('timerLabel').textContent = 'Long Break';
      showNotification('🎉 Focus session complete! Time for a long break!', 'success');
    } else {
      currentTime = parseInt(document.getElementById('breakTime').value) * 60;
      document.getElementById('timerLabel').textContent = 'Short Break';
      showNotification('✅ Focus session complete! Take a short break!', 'success');
    }
    
    isBreakTime = true;
    checkAchievements();
  } else {
    // Break completed
    currentTime = parseInt(document.getElementById('focusTime').value) * 60;
    document.getElementById('timerLabel').textContent = 'Focus Time';
    isBreakTime = false;
    showNotification('Break over! Ready to focus? 🚀', 'success');
  }
  
  updateTimerDisplay();
  updateTimerStats();
  document.getElementById('startTimer').disabled = false;
  document.getElementById('pauseTimer').disabled = true;
}

// Timer display with 24-hour support
function updateTimerDisplay() {
  const minutes = Math.floor(currentTime / 60);
  const seconds = currentTime % 60;
  const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  document.getElementById('timerTime').textContent = timeString;
  
  // Update page title with timer and current time in 24-hour format
  if (isRunning) {
    const now = new Date();
    const currentTimeStr = now.toLocaleTimeString('en-US', { hour12: false });
    document.title = `${timeString} - Study Tracker (${currentTimeStr})`;
  } else {
    document.title = '📚 Study Progress Tracker';
  }
}

function updateTimerStats() {
  document.getElementById('completedSessions').textContent = completedSessions;
  
  const hours = Math.floor(totalFocusTime / 60);
  const minutes = totalFocusTime % 60;
  document.getElementById('totalFocusTime').textContent = `${hours}h ${minutes}m`;
  
  // Save timer stats
  localStorage.setItem('timerStats', JSON.stringify({
    completedSessions,
    totalFocusTime
  }));
}

// Enhanced Achievement System with 24-hour time support
const achievementDefinitions = {
  firstEntry: { icon: '🎯', name: 'First Step', description: 'Complete your first study session', requirement: 'Log 1 study entry' },
  streak3: { icon: '🔥', name: '3-Day Streak', description: 'Study for 3 consecutive days', requirement: 'Study 3 days in a row' },
  streak7: { icon: '⚡', name: 'Week Warrior', description: 'Study for 7 consecutive days', requirement: 'Study 7 days in a row' },
  streak30: { icon: '💎', name: 'Month Master', description: 'Study for 30 consecutive days', requirement: 'Study 30 days in a row' },
  hours10: { icon: '📚', name: 'Study Starter', description: 'Complete 10 total hours of study', requirement: 'Study for 10 hours total' },
  hours50: { icon: '🎓', name: 'Knowledge Seeker', description: 'Complete 50 total hours of study', requirement: 'Study for 50 hours total' },
  hours100: { icon: '🏆', name: 'Study Master', description: 'Complete 100 total hours of study', requirement: 'Study for 100 hours total' },
  perfectWeek: { icon: '⭐', name: 'Perfect Week', description: 'Study every day for a complete week', requirement: 'Study 7 consecutive days' },
  earlyBird: { icon: '🌅', name: 'Early Bird', description: 'Study before 8:00 AM', requirement: 'Log a study session between 05:00-07:59' },
  nightOwl: { icon: '🦉', name: 'Night Owl', description: 'Study after 10:00 PM or before 5:00 AM', requirement: 'Log a study session between 22:00-04:59' }
};

function checkAchievements() {
  const newAchievements = [];
  
  // First entry
  if (!achievements.firstEntry && logs.length >= 1) {
    achievements.firstEntry = true;
    newAchievements.push('firstEntry');
  }
  
  // Streak achievements
  const streak = calculateCurrentStreak();
  if (!achievements.streak3 && streak >= 3) {
    achievements.streak3 = true;
    newAchievements.push('streak3');
  }
  if (!achievements.streak7 && streak >= 7) {
    achievements.streak7 = true;
    newAchievements.push('streak7');
  }
  if (!achievements.streak30 && streak >= 30) {
    achievements.streak30 = true;
    newAchievements.push('streak30');
  }
  
  // Hours achievements
  const totalHours = logs.reduce((sum, log) => sum + log.hours, 0);
  if (!achievements.hours10 && totalHours >= 10) {
    achievements.hours10 = true;
    newAchievements.push('hours10');
  }
  if (!achievements.hours50 && totalHours >= 50) {
    achievements.hours50 = true;
    newAchievements.push('hours50');
  }
  if (!achievements.hours100 && totalHours >= 100) {
    achievements.hours100 = true;
    newAchievements.push('hours100');
  }
  
  // Time-based achievements with 24-hour format
  logs.forEach(log => {
    // Check if log has timestamp for time-based achievements
    if (log.timestamp) {
      const logTime = new Date(log.timestamp).getHours(); // 24-hour format (0-23)
      if (!achievements.earlyBird && logTime >= 5 && logTime < 8) { // 5:00-7:59 AM
        achievements.earlyBird = true;
        newAchievements.push('earlyBird');
      }
      if (!achievements.nightOwl && logTime >= 22 || logTime < 5) { // 10:00 PM - 4:59 AM
        achievements.nightOwl = true;
        newAchievements.push('nightOwl');
      }
    }
  });
  
  // Perfect week achievement
  if (!achievements.perfectWeek && checkPerfectWeek()) {
    achievements.perfectWeek = true;
    newAchievements.push('perfectWeek');
  }
  
  // Show new achievements
  newAchievements.forEach(achievement => {
    const def = achievementDefinitions[achievement];
    showNotification(`🏆 Achievement Unlocked: ${def.name}! ${def.description}`, 'success');
  });
  
  updateBadgeDisplay();
  localStorage.setItem('achievements', JSON.stringify(achievements));
}

function calculateCurrentStreak() {
  if (logs.length === 0) return 0;
  
  const dates = [...new Set(logs.map(log => log.date))].sort().reverse();
  const today = new Date().toISOString().split('T')[0];
  let streak = 0;
  
  if (dates[0] === today) {
    streak = 1;
    for (let i = 1; i < dates.length; i++) {
      const currentDate = new Date(dates[i-1]);
      const prevDate = new Date(dates[i]);
      const dayDiff = Math.floor((currentDate - prevDate) / (1000 * 60 * 60 * 24));
      
      if (dayDiff === 1) {
        streak++;
      } else {
        break;
      }
    }
  }
  
  return streak;
}

function checkPerfectWeek() {
  const today = new Date();
  const weekDays = [];
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    weekDays.push(date.toISOString().split('T')[0]);
  }
  
  return weekDays.every(day => logs.some(log => log.date === day));
}

function updateBadgeDisplay() {
  const badgesList = document.getElementById('badgesList');
  const earnedCount = Object.values(achievements).filter(Boolean).length;
  const totalBadges = Object.keys(achievementDefinitions).length;
  
  badgesList.innerHTML = '';
  
  // Show first 6 badges in compact view
  const visibleBadges = Object.entries(achievementDefinitions).slice(0, 6);
  
  visibleBadges.forEach(([key, def]) => {
    const badge = document.createElement('div');
    const isEarned = achievements[key];
    badge.className = `badge ${isEarned ? 'earned' : 'locked'}`;
    badge.innerHTML = `
      <div class="badge-icon">${def.icon}</div>
      <div class="badge-name">${def.name}</div>
      <div class="badge-requirement">${isEarned ? 'Earned!' : def.requirement}</div>
    `;
    badge.title = def.description;
    badgesList.appendChild(badge);
  });
  
  // Update progress
  document.getElementById('badgeProgress').textContent = `${earnedCount}/${totalBadges}`;
  const progressBar = document.getElementById('badgeProgressBar');
  const progressPercent = (earnedCount / totalBadges) * 100;
  progressBar.style.width = progressPercent + '%';
}

// Theme Toggle
function toggleTheme() {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.body.className = currentTheme === 'dark' ? 'dark-theme' : 'light-theme';
  document.getElementById('themeToggle').textContent = currentTheme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('theme', currentTheme);
  showNotification(`Switched to ${currentTheme} theme`, 'info');
}

// Reminder System
function toggleReminders() {
  remindersEnabled = !remindersEnabled;
  document.getElementById('reminderToggle').textContent = remindersEnabled ? '🔔' : '🔕';
  localStorage.setItem('remindersEnabled', remindersEnabled.toString());
  
  if (remindersEnabled) {
    requestNotificationPermission();
    scheduleReminders();
    showNotification('Study reminders enabled! 📅', 'success');
  } else {
    showNotification('Study reminders disabled', 'info');
  }
}

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

// Reminder System with 24-hour time support
function scheduleReminders() {
  if (!remindersEnabled || !('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }
  
  // Schedule reminder every 2 hours during study hours
  setInterval(() => {
    const now = new Date();
    const hour = now.getHours(); // 24-hour format (0-23)
    
    // Only remind during reasonable study hours (6:00 AM - 11:00 PM)
    if (hour >= 6 && hour <= 23) {
      new Notification('Study Reminder 📚', {
        body: `Time for a study session! Current time: ${now.toLocaleTimeString('en-US', { hour12: false })}`,
        icon: '/favicon.ico'
      });
    }
  }, 2 * 60 * 60 * 1000); // 2 hours
}

// Analytics Modal
function toggleAnalytics() {
  const modal = document.getElementById('analyticsModal');
  if (!modal) {
    createAnalyticsModal();
  } else {
    modal.style.display = modal.style.display === 'block' ? 'none' : 'block';
  }
}

function createAnalyticsModal() {
  const modal = document.createElement('div');
  modal.id = 'analyticsModal';
  modal.className = 'analytics-modal';
  modal.innerHTML = `
    <div class="analytics-content">
      <button class="close-analytics" onclick="toggleAnalytics()">&times;</button>
      <h2 class="glow">📊 Advanced Analytics</h2>
      <div id="analyticsData">
        ${generateAnalyticsHTML()}
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  modal.style.display = 'block';
}

function generateAnalyticsHTML() {
  if (logs.length === 0) {
    return '<p>No data available for analysis.</p>';
  }
  
  const totalHours = logs.reduce((sum, log) => sum + log.hours, 0);
  const avgGrade = logs.filter(log => log.grade).reduce((sum, log, _, arr) => sum + log.grade / arr.length, 0);
  const subjectStats = {};
  
  // Analyze study times in 24-hour format
  const timeStats = {
    morning: 0,    // 5:00-11:59
    afternoon: 0,  // 12:00-17:59  
    evening: 0,    // 18:00-21:59
    night: 0       // 22:00-4:59
  };
  
  logs.forEach(log => {
    if (!subjectStats[log.displaySubject]) {
      subjectStats[log.displaySubject] = { hours: 0, sessions: 0, grades: [] };
    }
    subjectStats[log.displaySubject].hours += log.hours;
    subjectStats[log.displaySubject].sessions++;
    if (log.grade) subjectStats[log.displaySubject].grades.push(log.grade);
    
    // Analyze study time patterns
    if (log.timestamp) {
      const hour = new Date(log.timestamp).getHours();
      if (hour >= 5 && hour < 12) timeStats.morning += log.hours;
      else if (hour >= 12 && hour < 18) timeStats.afternoon += log.hours;
      else if (hour >= 18 && hour < 22) timeStats.evening += log.hours;
      else timeStats.night += log.hours;
    }
  });
  
  let html = `
    <div class="analytics-summary">
      <h3>📈 Overall Performance</h3>
      <p><strong>Total Study Time:</strong> ${totalHours.toFixed(1)} hours</p>
      <p><strong>Average Grade:</strong> ${avgGrade ? avgGrade.toFixed(1) + '%' : 'N/A'}</p>
      <p><strong>Study Sessions:</strong> ${logs.length}</p>
      <p><strong>Current Streak:</strong> ${calculateCurrentStreak()} days</p>
    </div>
    
    <div class="time-analysis">
      <h3>🕓 Study Time Patterns (24-Hour)</h3>
      <p><strong>Morning (05:00-11:59):</strong> ${timeStats.morning.toFixed(1)}h</p>
      <p><strong>Afternoon (12:00-17:59):</strong> ${timeStats.afternoon.toFixed(1)}h</p>
      <p><strong>Evening (18:00-21:59):</strong> ${timeStats.evening.toFixed(1)}h</p>
      <p><strong>Night (22:00-04:59):</strong> ${timeStats.night.toFixed(1)}h</p>
    </div>
    
    <div class="subject-breakdown">
      <h3>📚 Subject Breakdown</h3>
  `;
  
  Object.entries(subjectStats).forEach(([subject, stats]) => {
    const avgSubjectGrade = stats.grades.length > 0 
      ? stats.grades.reduce((a, b) => a + b, 0) / stats.grades.length 
      : null;
    
    html += `
      <div class="subject-stat">
        <h4>${subject}</h4>
        <p>Hours: ${stats.hours.toFixed(1)} | Sessions: ${stats.sessions}</p>
        <p>Avg Grade: ${avgSubjectGrade ? avgSubjectGrade.toFixed(1) + '%' : 'N/A'}</p>
      </div>
    `;
  });
  
  html += '</div>';
  return html;
}

// ------------------- Initialize -------------------
document.addEventListener('DOMContentLoaded', () => {
  // Initialize charts first
  initializeCharts();
  
  // Set default date
  document.getElementById('date').value = new Date().toISOString().split('T')[0];

  // Event listeners for original functionality
  document.getElementById('addEntry').addEventListener('click', addEntry);
  document.getElementById('clearLogs').addEventListener('click', clearAllLogs);
  
  // Event listeners for new features
  document.getElementById('setGoal').addEventListener('click', setDailyGoal);
  document.getElementById('resetGoal').addEventListener('click', resetDailyGoal);
  document.getElementById('exportData').addEventListener('click', exportData);
  
  // Timer event listeners
  document.getElementById('startTimer').addEventListener('click', startTimer);
  document.getElementById('pauseTimer').addEventListener('click', pauseTimer);
  document.getElementById('resetTimer').addEventListener('click', resetTimer);
  
  // Top bar event listeners
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.getElementById('reminderToggle').addEventListener('click', toggleReminders);
  document.getElementById('analyticsToggle').addEventListener('click', toggleAnalytics);
  
  // New navbar event listeners
  document.getElementById('quickAddBtn').addEventListener('click', quickAdd);
  document.getElementById('timerQuickBtn').addEventListener('click', quickTimer);
  document.getElementById('profileBtn').addEventListener('click', showProfile);
  
  // Badge modal event listener
  document.getElementById('showAllBadges').addEventListener('click', showAllBadges);
  
  // Search and filter event listeners with throttling
  document.getElementById('searchInput').addEventListener('input', throttledFilter);
  document.getElementById('subjectFilter').addEventListener('change', applyFilters);
  document.getElementById('dateFrom').addEventListener('change', applyFilters);
  document.getElementById('dateTo').addEventListener('change', applyFilters);
  
  // Timer settings listeners
  ['focusTime', 'breakTime', 'longBreakTime'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => {
      if (!isRunning) {
        resetTimer();
      }
    });
  });
  
  // Enter key support for forms
  document.getElementById('dailyGoal').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') setDailyGoal();
  });
  
  ['date', 'subject', 'hours', 'grade', 'notes'].forEach(id => {
    document.getElementById(id).addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && id !== 'notes') addEntry();
    });
  });

  // Load saved data
  logs = JSON.parse(localStorage.getItem("studyLogs")) || [];
  dailyGoal = parseFloat(localStorage.getItem("studyGoal")) || 0;
  achievements = JSON.parse(localStorage.getItem("achievements")) || achievements;
  currentTheme = localStorage.getItem('theme') || 'dark';
  remindersEnabled = localStorage.getItem('remindersEnabled') === 'true';
  
  // Load timer stats
  const timerStats = JSON.parse(localStorage.getItem('timerStats')) || { completedSessions: 0, totalFocusTime: 0 };
  completedSessions = timerStats.completedSessions;
  totalFocusTime = timerStats.totalFocusTime;
  
  // Migrate old logs to new format
  logs = logs.map(log => ({
    id: log.id || Date.now() + Math.random(),
    date: log.date,
    subject: log.subject,
    displaySubject: log.displaySubject,
    hours: log.hours,
    grade: log.grade || null,
    notes: log.notes || '',
    timestamp: log.timestamp || new Date().toISOString()
  }));
  
  // Set initial values
  if (dailyGoal > 0) {
    document.getElementById('dailyGoal').value = dailyGoal;
  }
  
  // Apply saved theme
  document.body.className = currentTheme === 'dark' ? 'dark-theme' : 'light-theme';
  document.getElementById('themeToggle').textContent = currentTheme === 'dark' ? '🌙' : '☀️';
  
  // Apply reminder settings
  document.getElementById('reminderToggle').textContent = remindersEnabled ? '🔔' : '🔕';
  if (remindersEnabled) {
    scheduleReminders();
  }
  
  // Initialize timer display
  updateTimerDisplay();
  updateTimerStats();
  document.getElementById('pauseTimer').disabled = true;
  
  // Initialize everything
  updateAll();
  updateStreak();
  updateDailyGoal();
  updateBadgeDisplay();
  updateNavbarStats();
  checkAchievements();
  
  // Welcome message for new users
  if (logs.length === 0) {
    setTimeout(() => {
      showNotification('Welcome to your Enhanced Study Tracker! 🎓\nNow with Pomodoro Timer, Achievements, and Analytics!', 'info');
    }, 1000);
  } else {
    setTimeout(() => {
      showNotification('Welcome back! Ready to continue your learning journey? 🚀', 'success');
    }, 1000);
  }
  
  // Setup keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      switch(e.key) {
        case 'Enter':
          e.preventDefault();
          addEntry();
          break;
        case ' ':
          e.preventDefault();
          if (isRunning) {
            pauseTimer();
          } else {
            startTimer();
          }
          break;
        case 't':
          e.preventDefault();
          toggleTheme();
          break;
        case 'e':
          e.preventDefault();
          exportData();
          break;
      }
    }
  });
});
