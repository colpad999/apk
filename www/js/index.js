/**
    Licensed to the Apache Software Foundation (ASF) under one
    or more contributor license agreements.  See the NOTICE file
    distributed with this work for additional information
    regarding copyright ownership.  The ASF licenses this file
    to you under the Apache License, Version 2.0 (the
    "License"); you may not use this file except in compliance
    with the License.  You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing,
    software distributed under the License is distributed on an
    "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, either express or implied.  See the License for the
    specific language governing permissions and limitations
    under the License.
*/

// Wait for the deviceready event before using any of Cordova's device APIs.
document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
    // Cordova is now initialized
    console.log('Running cordova-' + cordova.platformId + '@' + cordova.version);
    
    // Hide splash screen after delay
    setTimeout(() => {
        document.getElementById('splash').classList.add('hidden');
    }, 1500);
    
    // Initialize the Productive System
    initializeProductiveSystem();
    
    // Android back button handling
    document.addEventListener("backbutton", onBackButton, false);
    
    // Android status bar styling
    if (window.StatusBar) {
        StatusBar.overlaysWebView(false);
        StatusBar.backgroundColorByHexString("#0a0f1c");
        StatusBar.styleLightContent();
    }
}

// Android back button handler
function onBackButton(e) {
    e.preventDefault();
    
    const habitModal = document.getElementById('habitModal');
    const profileModal = document.getElementById('profileModal');
    
    if (habitModal.classList.contains('active')) {
        ProductiveSystem.hideAllModals();
    } else if (profileModal.classList.contains('active')) {
        ProductiveSystem.hideAllModals();
    } else {
        // Exit app on second back press
        if (confirm("Exit Productive.exe?")) {
            navigator.app.exitApp();
        }
    }
}

// ============================================
// PRODUCTIVE.EXE - ANDROID OPTIMIZED
// ============================================

class ProductiveSystem {
    constructor() {
        this.habits = [];
        this.streak = 0;
        this.lastActiveDate = null;
        this.notificationsEnabled = false;
        this.editingHabitId = null;
        this.currentUser = null;
        this.settings = {
            dailyGoal: 5,
            focusLength: 25,
            notifications: true
        };
        this.statistics = {
            totalFocusSessions: 0,
            totalFocusMinutes: 0,
            weeklyData: [],
            productivityLevel: 'beginner'
        };
        this.timerRunning = false;
        this.timerMinutes = 25;
        this.timerSeconds = 0;
        this.timerInterval = null;
    }

    init() {
        this.loadData();
        this.setupEventListeners();
        this.setupNavigation();
        this.checkNotificationPermission();
        this.updateDateTime();
        this.initVisualization();
        this.generateWeeklyChart();
        
        // Check if user is logged in
        if (this.currentUser) {
            setTimeout(() => this.showMainApp(), 500);
        } else {
            setTimeout(() => this.showLoginScreen(), 500);
        }
        
        // Update time every minute
        setInterval(() => this.updateDateTime(), 60000);
        // Update visualization every 5 seconds
        setInterval(() => this.updateVisualization(), 5000);
        // Auto-save every 30 seconds
        setInterval(() => this.saveData(), 30000);
        
        // Android keyboard handling
        this.setupAndroidKeyboard();
    }

    // Android keyboard adjustments
    setupAndroidKeyboard() {
        window.addEventListener('keyboardDidShow', () => {
            document.body.style.height = 'calc(100vh - 300px)';
        });
        
        window.addEventListener('keyboardDidHide', () => {
            document.body.style.height = '100vh';
        });
    }

    // ========== USER MANAGEMENT ==========
    login(username) {
        this.currentUser = {
            id: Date.now(),
            username: username || "User",
            joinedDate: new Date().toISOString(),
            avatarColor: this.getRandomColor()
        };
        
        this.saveData();
        this.showMainApp();
        this.updateUserDisplay();
        this.renderHabits();
        this.checkStreak();
        this.updateStatistics();
        
        this.showToast('Welcome!', `Hello ${username}!`);
        return this.currentUser;
    }

    logout() {
        this.currentUser = null;
        this.saveData();
        this.showLoginScreen();
        this.showToast('Logged out', 'See you next time!');
    }

    updateUser(username) {
        if (this.currentUser && username.trim()) {
            this.currentUser.username = username.trim();
            this.currentUser.avatarColor = this.getRandomColor();
            this.saveData();
            this.updateUserDisplay();
            this.showToast('Profile updated', `Username changed to ${username}`);
            return true;
        }
        return false;
    }

    updateSettings(settings) {
        Object.assign(this.settings, settings);
        this.saveData();
        this.updateSettingsDisplay();
        this.showToast('Settings saved', 'Preferences updated');
        return true;
    }

    getRandomColor() {
        const colors = [
            'linear-gradient(135deg, #ff2e8b, #7b61ff)',
            'linear-gradient(135deg, #00f3ff, #0066ff)',
            'linear-gradient(135deg, #00ff9d, #00cc88)',
            'linear-gradient(135deg, #ff9900, #ff6600)',
            'linear-gradient(135deg, #7b61ff, #9d4edd)'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // ========== DATA MANAGEMENT ==========
    loadData() {
        try {
            const saved = localStorage.getItem('productive_exe_ultimate');
            if (saved) {
                const data = JSON.parse(saved);
                this.habits = data.habits || [];
                this.streak = data.streak || 0;
                this.lastActiveDate = data.lastActiveDate;
                this.notificationsEnabled = data.notificationsEnabled || false;
                this.currentUser = data.currentUser || null;
                this.settings = data.settings || {
                    dailyGoal: 5,
                    focusLength: 25,
                    notifications: true
                };
                this.statistics = data.statistics || {
                    totalFocusSessions: 0,
                    totalFocusMinutes: 0,
                    weeklyData: this.generateDefaultWeeklyData(),
                    productivityLevel: 'beginner'
                };
            }
        } catch (e) {
            console.error('Failed to load data:', e);
        }
    }

    saveData() {
        const data = {
            habits: this.habits,
            streak: this.streak,
            lastActiveDate: this.lastActiveDate,
            notificationsEnabled: this.notificationsEnabled,
            currentUser: this.currentUser,
            settings: this.settings,
            statistics: this.statistics,
            lastSaved: new Date().toISOString()
        };
        
        try {
            localStorage.setItem('productive_exe_ultimate', JSON.stringify(data));
        } catch (e) {
            console.error('Failed to save data:', e);
        }
    }

    generateDefaultWeeklyData() {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        return days.map(day => ({
            day: day,
            value: Math.floor(Math.random() * 10) + 1
        }));
    }

    // ========== UI MANAGEMENT ==========
    showLoginScreen() {
        document.getElementById('splash').classList.add('hidden');
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('appContainer').classList.remove('loaded');
        document.getElementById('appHeader').classList.remove('active');
        document.getElementById('contentArea').classList.remove('active');
        document.getElementById('navBar').classList.remove('active');
        
        // Pre-fill with saved username if exists
        if (this.currentUser) {
            document.getElementById('loginUsername').value = this.currentUser.username;
        }
        
        // Focus on input
        setTimeout(() => {
            document.getElementById('loginUsername').focus();
        }, 300);
    }

    showMainApp() {
        document.getElementById('splash').classList.add('hidden');
        document.getElementById('loginScreen').classList.add('hidden');
        
        setTimeout(() => {
            document.getElementById('appContainer').classList.add('loaded');
            document.getElementById('appHeader').classList.add('active');
            document.getElementById('contentArea').classList.add('active');
            document.getElementById('navBar').classList.add('active');
        }, 300);
        
        this.updateUserDisplay();
        this.updateSettingsDisplay();
        this.renderHabits();
        this.updateFocusStats();
    }

    updateUserDisplay() {
        if (!this.currentUser) return;
        
        const userAvatar = document.getElementById('userAvatar');
        const userName = document.getElementById('userName');
        const profileAvatar = document.getElementById('profileAvatar');
        const profileUsername = document.getElementById('profileUsername');
        
        const firstLetter = this.currentUser.username.charAt(0).toUpperCase();
        userAvatar.textContent = firstLetter;
        userAvatar.style.background = this.currentUser.avatarColor;
        userName.textContent = this.currentUser.username;
        
        profileAvatar.textContent = firstLetter;
        profileAvatar.style.background = this.currentUser.avatarColor;
        profileUsername.textContent = this.currentUser.username;
        
        // Update productivity level
        const productivityLevel = document.getElementById('productivityLevel');
        if (productivityLevel) {
            const level = this.calculateProductivityLevel();
            productivityLevel.textContent = level;
            productivityLevel.style.color = this.getLevelColor(level);
        }
    }

    updateSettingsDisplay() {
        // Update daily goal slider
        const dailyGoalSlider = document.getElementById('dailyGoalSlider');
        const dailyGoalValue = document.getElementById('dailyGoalValue');
        if (dailyGoalSlider && dailyGoalValue) {
            dailyGoalSlider.value = this.settings.dailyGoal;
            dailyGoalValue.textContent = this.settings.dailyGoal;
        }
        
        // Update timer length buttons
        document.querySelectorAll('[data-minutes]').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.minutes) === this.settings.focusLength);
        });
        
        // Update notifications toggle
        const notificationsToggle = document.getElementById('notificationsToggle');
        if (notificationsToggle) {
            notificationsToggle.checked = this.settings.notifications;
        }
    }

    calculateProductivityLevel() {
        const totalHabits = this.habits.length;
        const avgStreak = this.habits.reduce((sum, h) => sum + h.streak, 0) / Math.max(1, totalHabits);
        
        if (avgStreak >= 30) return 'Elite';
        if (avgStreak >= 14) return 'Advanced';
        if (avgStreak >= 7) return 'Intermediate';
        if (avgStreak >= 3) return 'Beginner+';
        return 'Beginner';
    }

    getLevelColor(level) {
        const colors = {
            'Beginner': 'var(--text-secondary)',
            'Beginner+': 'var(--accent-green)',
            'Intermediate': 'var(--accent-cyan)',
            'Advanced': 'var(--accent-blue)',
            'Elite': 'var(--accent-purple)'
        };
        return colors[level] || 'var(--text-secondary)';
    }

    // ========== HABIT MANAGEMENT ==========
    addHabit(name, category = 'health', difficulty = 'medium', frequency = 'daily') {
        const newHabit = {
            id: Date.now(),
            name: name.trim(),
            completed: false,
            category: category || 'health',
            difficulty: difficulty || 'medium',
            frequency: frequency || 'daily',
            streak: 0,
            totalCompletions: 0,
            createdAt: new Date().toISOString(),
            lastCompleted: null,
            history: []
        };
        
        this.habits.push(newHabit);
        this.saveData();
        this.renderHabits();
        this.showToast('Habit added', `${name} added`);
        return newHabit;
    }

    toggleHabit(habitId) {
        const habit = this.habits.find(h => h.id === habitId);
        if (!habit) return false;

        const today = new Date().toISOString().split('T')[0];
        const lastCompleted = habit.lastCompleted ? habit.lastCompleted.split('T')[0] : null;
        
        if (habit.completed) {
            // Mark as incomplete
            habit.completed = false;
            habit.history.push({ date: today, completed: false });
            this.showToast('Habit incomplete', `${habit.name} incomplete`);
        } else {
            // Mark as complete
            habit.completed = true;
            habit.totalCompletions++;
            
            // Update streak if this is first completion today
            if (lastCompleted !== today) {
                habit.streak++;
                habit.lastCompleted = new Date().toISOString();
            }
            
            habit.history.push({ date: today, completed: true });
            this.showToast('Great job!', `${habit.name} completed!`);
            
            // Check if daily goal reached
            this.checkDailyGoal();
        }
        
        this.saveData();
        this.renderHabits();
        this.checkAllCompleted();
        this.updateStatistics();
        return true;
    }

    deleteHabit(habitId) {
        const index = this.habits.findIndex(h => h.id === habitId);
        if (index === -1) return false;
        
        const habitName = this.habits[index].name;
        this.habits.splice(index, 1);
        this.saveData();
        this.renderHabits();
        this.checkAllCompleted();
        this.showToast('Habit removed', `${habitName} removed`);
        return true;
    }

    updateHabit(habitId, updates) {
        const habit = this.habits.find(h => h.id === habitId);
        if (!habit) return false;
        
        Object.assign(habit, updates);
        this.saveData();
        this.renderHabits();
        this.showToast('Habit updated', `${habit.name} updated`);
        return true;
    }

    // ========== PROGRESS & STATISTICS ==========
    calculateProgress() {
        if (this.habits.length === 0) return 0;
        const completed = this.habits.filter(h => h.completed).length;
        const target = Math.max(this.settings.dailyGoal, this.habits.length);
        return Math.round((completed / target) * 100);
    }

    calculateMetrics() {
        const completed = this.habits.filter(h => h.completed).length;
        const total = this.habits.length;
        const progress = total > 0 ? (completed / total) * 100 : 0;
        
        // Calculate focus based on difficulty completion
        const hardHabits = this.habits.filter(h => h.difficulty === 'hard');
        const hardCompleted = hardHabits.filter(h => h.completed).length;
        const focus = hardHabits.length > 0 ? 
            Math.min(100, (hardCompleted / hardHabits.length) * 100) : progress;
        
        // Calculate discipline based on consistency
        const avgStreak = this.habits.reduce((sum, h) => sum + h.streak, 0) / Math.max(1, this.habits.length);
        const discipline = Math.min(100, avgStreak * 10);
        
        return {
            focus: Math.round(focus),
            discipline: Math.round(discipline),
            consistency: Math.round(progress)
        };
    }

    checkStreak() {
        const today = new Date().toISOString().split('T')[0];
        
        if (!this.lastActiveDate) {
            this.streak = 1;
        } else if (this.lastActiveDate !== today) {
            // Check if any habits were completed yesterday
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            
            const hadCompletionYesterday = this.habits.some(habit => {
                return habit.lastCompleted && habit.lastCompleted.startsWith(yesterdayStr);
            });
            
            if (hadCompletionYesterday) {
                this.streak++;
                this.showToast('Streak increased!', `${this.streak}-day streak!`);
            } else {
                this.streak = 1;
                this.showToast('New streak', 'Start new streak today!');
            }
        }
        
        this.lastActiveDate = today;
        this.saveData();
        this.updateStreakDisplay();
        return this.streak;
    }

    checkDailyGoal() {
        const completed = this.habits.filter(h => h.completed).length;
        if (completed >= this.settings.dailyGoal) {
            this.showToast('🎯 Goal Achieved!', 'Daily target completed');
        }
    }

    checkAllCompleted() {
        if (this.habits.length === 0) {
            return false;
        }
        
        const allCompleted = this.habits.every(h => h.completed);
        this.updateProgressDisplay();
        return allCompleted;
    }

    updateStatistics() {
        // Update focus stats
        document.getElementById('focusSessions').textContent = this.statistics.totalFocusSessions;
        document.getElementById('focusTime').textContent = this.statistics.totalFocusMinutes;
        
        // Update productivity level
        const level = this.calculateProductivityLevel();
        this.statistics.productivityLevel = level;
        
        this.saveData();
    }

    // ========== VISUALIZATION ==========
    initVisualization() {
        this.generateFloatingElements();
    }

    generateFloatingElements() {
        const container = document.getElementById('visualizationContainer');
        container.innerHTML = '';
        
        for (let i = 0; i < 15; i++) {
            const element = document.createElement('div');
            element.className = 'floating-element';
            
            const size = Math.random() * 20 + 5;
            const x = Math.random() * 100;
            const y = Math.random() * 100;
            const delay = Math.random() * 20;
            const duration = Math.random() * 10 + 20;
            
            element.style.width = `${size}px`;
            element.style.height = `${size}px`;
            element.style.left = `${x}%`;
            element.style.top = `${y}%`;
            element.style.animationDelay = `${delay}s`;
            element.style.animationDuration = `${duration}s`;
            element.style.background = i % 3 === 0 ? 'var(--accent-cyan)' : 
                                    i % 3 === 1 ? 'var(--accent-blue)' : 'var(--accent-purple)';
            
            container.appendChild(element);
        }
    }

    updateVisualization() {
        // Update orbiting dot position
        const dot = document.querySelector('.orbiting-dot');
        if (dot) {
            const progress = this.calculateProgress();
            const rotation = (progress / 100) * 360;
            dot.style.transform = `rotate(${rotation}deg) translateX(80px) rotate(-${rotation}deg)`;
        }
    }

    generateWeeklyChart() {
        const container = document.getElementById('weeklyChart');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Use existing weekly data or generate new
        const weeklyData = this.statistics.weeklyData.length > 0 ? 
            this.statistics.weeklyData : this.generateDefaultWeeklyData();
        
        const maxValue = Math.max(...weeklyData.map(d => d.value));
        const barWidth = 100 / weeklyData.length;
        
        weeklyData.forEach((dayData, index) => {
            const bar = document.createElement('div');
            bar.className = 'chart-bar';
            
            const height = (dayData.value / maxValue) * 150;
            const left = index * barWidth + barWidth / 4;
            
            bar.style.height = `${height}px`;
            bar.style.left = `${left}%`;
            bar.style.width = `${barWidth / 2}%`;
            
            // Add day label
            const label = document.createElement('div');
            label.textContent = dayData.day;
            label.style.position = 'absolute';
            label.style.bottom = '-25px';
            label.style.left = '50%';
            label.style.transform = 'translateX(-50%)';
            label.style.fontSize = '11px';
            label.style.color = 'var(--text-secondary)';
            label.style.fontFamily = 'var(--font-mono)';
            
            bar.appendChild(label);
            container.appendChild(bar);
        });
    }

    // ========== TIMER SYSTEM ==========
    startTimer() {
        if (this.timerRunning) return;
        
        this.timerRunning = true;
        this.timerInterval = setInterval(() => {
            if (this.timerSeconds === 0) {
                if (this.timerMinutes === 0) {
                    this.timerComplete();
                    return;
                }
                this.timerMinutes--;
                this.timerSeconds = 59;
            } else {
                this.timerSeconds--;
            }
            this.updateTimerDisplay();
        }, 1000);
        
        document.getElementById('startTimerBtn').textContent = 'PAUSE';
        this.showToast('Focus started', 'Stay focused!');
    }

    pauseTimer() {
        if (!this.timerRunning) return;
        
        this.timerRunning = false;
        clearInterval(this.timerInterval);
        document.getElementById('startTimerBtn').textContent = 'RESUME';
        this.showToast('Timer paused', 'Session paused');
    }

    resetTimer() {
        this.timerRunning = false;
        clearInterval(this.timerInterval);
        this.timerMinutes = this.settings.focusLength;
        this.timerSeconds = 0;
        this.updateTimerDisplay();
        document.getElementById('startTimerBtn').textContent = 'START';
        this.showToast('Timer reset', 'Ready for new session');
    }

    timerComplete() {
        this.timerRunning = false;
        clearInterval(this.timerInterval);
        
        // Update statistics
        this.statistics.totalFocusSessions++;
        this.statistics.totalFocusMinutes += this.settings.focusLength;
        this.updateFocusStats();
        
        this.showToast('Time\'s up!', 'Great session! Take a break.');
        
        // Play notification sound
        this.playNotificationSound();
        
        this.saveData();
    }

    updateTimerDisplay() {
        const display = document.getElementById('timerDisplay');
        if (display) {
            display.textContent = `${this.timerMinutes.toString().padStart(2, '0')}:${this.timerSeconds.toString().padStart(2, '0')}`;
        }
    }

    updateFocusStats() {
        document.getElementById('focusSessions').textContent = this.statistics.totalFocusSessions;
        document.getElementById('focusTime').textContent = this.statistics.totalFocusMinutes;
    }

    playNotificationSound() {
        // Android notification sound
        try {
            if (navigator.vibrate) {
                navigator.vibrate(200);
            }
            
            const beep = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAZGF0YQQ=');
            beep.play();
        } catch (e) {
            console.log('Sound not supported');
        }
    }

    // ========== NOTIFICATIONS ==========
    async checkNotificationPermission() {
        if ('Notification' in window && this.settings.notifications) {
            this.notificationsEnabled = Notification.permission === 'granted';
            
            if (!this.notificationsEnabled && Notification.permission === 'default') {
                const permission = await Notification.requestPermission();
                this.notificationsEnabled = permission === 'granted';
                this.settings.notifications = this.notificationsEnabled;
                this.saveData();
            }
        }
    }

    // ========== UI UPDATES ==========
    updateDateTime() {
        const now = new Date();
        const options = { 
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        document.getElementById('currentDate').textContent = 
            now.toLocaleDateString('en-US', options).toUpperCase();
    }

    updateProgressDisplay() {
        const progress = this.calculateProgress();
        const completed = this.habits.filter(h => h.completed).length;
        const total = this.habits.length;
        
        // Update progress ring
        const progressRing = document.querySelector('.progress-ring-fill');
        if (progressRing) {
            const circumference = 2 * Math.PI * 45;
            const offset = circumference - (progress / 100) * circumference;
            progressRing.style.strokeDashoffset = offset;
        }
        
        // Update numbers
        document.getElementById('progressNumber').textContent = `${progress}%`;
        document.getElementById('completedCount').textContent = completed;
        document.getElementById('totalCount').textContent = total;
        
        // Update metrics
        const metrics = this.calculateMetrics();
        document.getElementById('focusMetric').textContent = `${metrics.focus}%`;
        document.getElementById('disciplineMetric').textContent = `${metrics.discipline}%`;
        document.getElementById('consistencyMetric').textContent = `${metrics.consistency}%`;
        
        // Update visualization
        this.updateVisualization();
    }

    updateStreakDisplay() {
        document.getElementById('streakCount').textContent = this.streak;
        document.getElementById('streakDays').textContent = this.streak;
        
        // Update streak label based on streak length
        const streakLabel = document.getElementById('streakLabel');
        if (this.streak >= 30) {
            streakLabel.textContent = 'LEGENDARY';
            streakLabel.style.color = 'var(--accent-purple)';
        } else if (this.streak >= 7) {
            streakLabel.textContent = 'AMAZING';
            streakLabel.style.color = 'var(--accent-cyan)';
        } else if (this.streak >= 3) {
            streakLabel.textContent = 'SOLID';
            streakLabel.style.color = 'var(--accent-green)';
        } else {
            streakLabel.textContent = 'GET STARTED';
            streakLabel.style.color = 'var(--text-secondary)';
        }
    }

    renderHabits() {
        const container = document.getElementById('habitsList');
        container.innerHTML = '';
        
        if (this.habits.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: var(--space-xxl); color: var(--text-secondary);">
                    <div style="font-size: 3rem; margin-bottom: var(--space-lg); opacity: 0.3;">📋</div>
                    <h3 style="margin-bottom: var(--space-sm); color: var(--accent-cyan);">No Habits Yet</h3>
                    <p style="opacity: 0.7;">Add your first habit to start</p>
                </div>
            `;
            this.updateProgressDisplay();
            return;
        }
        
        // Sort: incomplete first, then by difficulty, then by streak
        const sortedHabits = [...this.habits].sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            
            const difficultyOrder = { 'hard': 3, 'medium': 2, 'easy': 1 };
            if (difficultyOrder[a.difficulty] !== difficultyOrder[b.difficulty]) {
                return difficultyOrder[b.difficulty] - difficultyOrder[a.difficulty];
            }
            
            return b.streak - a.streak;
        });
        
        sortedHabits.forEach(habit => {
            container.appendChild(this.createHabitElement(habit));
        });
        
        this.updateProgressDisplay();
        this.checkAllCompleted();
    }

    createHabitElement(habit) {
        const element = document.createElement('div');
        element.className = `habit-item ${habit.completed ? 'completed' : ''}`;
        element.dataset.habitId = habit.id;
        
        // Get category icon
        const categoryIcons = {
            health: '🏃',
            work: '💼',
            study: '📚',
            mindfulness: '🧘',
            relationships: '🤝',
            finance: '💰'
        };
        
        // Get difficulty color
        const difficultyColors = {
            easy: 'var(--accent-green)',
            medium: 'var(--accent-yellow)',
            hard: 'var(--accent-red)'
        };
        
        const progressPercent = habit.totalCompletions > 0 ? 
            Math.min(100, (habit.streak / (habit.totalCompletions || 1)) * 100) : 0;
        
        element.innerHTML = `
            <div class="habit-checkbox"></div>
            <div class="habit-content">
                <div class="habit-header">
                    <div style="display: flex; align-items: center; gap: var(--space-sm); min-width: 0;">
                        <div>${categoryIcons[habit.category] || '📋'}</div>
                        <div class="habit-name">${habit.name}</div>
                    </div>
                    <div style="font-size: 0.8125rem; color: ${difficultyColors[habit.difficulty]}; white-space: nowrap;">
                        ${habit.difficulty.toUpperCase()}
                    </div>
                </div>
                
                <div class="habit-tags">
                    <div class="habit-tag">${habit.frequency}</div>
                    <div class="habit-tag">${habit.category}</div>
                </div>
                
                <div class="habit-meta">
                    <div class="habit-streak">
                        <span class="streak-fire">🔥</span>
                        <span>${habit.streak} days</span>
                    </div>
                    <div>${habit.totalCompletions} completions</div>
                </div>
                
                <div class="habit-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progressPercent}%"></div>
                    </div>
                </div>
            </div>
            <div class="habit-actions">
                <button class="action-btn delete-btn" title="Delete habit">×</button>
            </div>
        `;
        
        // Add event listeners
        const checkbox = element.querySelector('.habit-checkbox');
        const deleteBtn = element.querySelector('.delete-btn');
        
        checkbox.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleHabit(habit.id);
        });
        
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`Delete "${habit.name}"?`)) {
                this.deleteHabit(habit.id);
            }
        });
        
        element.addEventListener('click', (e) => {
            if (!e.target.closest('.habit-actions')) {
                this.toggleHabit(habit.id);
            }
        });
        
        return element;
    }

    // ========== MODAL CONTROLS ==========
    showAddModal() {
        this.editingHabitId = null;
        document.getElementById('modalTitle').textContent = 'ADD NEW HABIT';
        document.getElementById('habitName').value = '';
        document.getElementById('habitCategory').value = 'health';
        
        // Reset difficulty buttons
        document.querySelectorAll('[data-difficulty]').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector('[data-difficulty="medium"]').classList.add('active');
        
        document.getElementById('habitFrequency').value = 'daily';
        document.getElementById('habitModal').classList.add('active');
        
        // Focus input after animation
        setTimeout(() => {
            document.getElementById('habitName').focus();
        }, 300);
    }

    showProfileModal() {
        document.getElementById('profileModal').classList.add('active');
    }

    hideAllModals() {
        document.getElementById('habitModal').classList.remove('active');
        document.getElementById('profileModal').classList.remove('active');
        this.editingHabitId = null;
    }

    saveHabitModal() {
        const name = document.getElementById('habitName').value.trim();
        const category = document.getElementById('habitCategory').value;
        const difficulty = document.querySelector('[data-difficulty].active')?.dataset.difficulty || 'medium';
        const frequency = document.getElementById('habitFrequency').value;
        
        if (!name) {
            this.showToast('Error', 'Enter habit name');
            return;
        }
        
        if (this.editingHabitId) {
            this.updateHabit(this.editingHabitId, {
                name: name,
                category: category,
                difficulty: difficulty,
                frequency: frequency
            });
        } else {
            this.addHabit(name, category, difficulty, frequency);
        }
        
        this.hideAllModals();
    }

    // ========== TOAST NOTIFICATIONS ==========
    showToast(title, message) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: calc(var(--safe-area-top) + 20px);
            right: 20px;
            left: 20px;
            background: linear-gradient(135deg, var(--bg-card), var(--bg-surface));
            border: 1px solid var(--border-glow);
            border-left: 4px solid var(--accent-cyan);
            border-radius: var(--radius-lg);
            padding: var(--space-lg);
            z-index: 3000;
            animation: toastSlideIn 0.3s ease, toastSlideOut 0.3s ease 2.7s;
            box-shadow: var(--shadow-heavy);
            backdrop-filter: blur(20px);
            max-width: 400px;
            margin: 0 auto;
        `;
        
        toast.innerHTML = `
            <div style="font-weight: 700; margin-bottom: var(--space-xs); color: var(--accent-cyan); font-size: 0.9375rem;">${title}</div>
            <div style="font-size: 0.875rem; opacity: 0.9;">${message}</div>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    // ========== DATA IMPORT/EXPORT ==========
    exportData() {
        const data = {
            habits: this.habits,
            streak: this.streak,
            lastActiveDate: this.lastActiveDate,
            currentUser: this.currentUser,
            settings: this.settings,
            statistics: this.statistics,
            exportDate: new Date().toISOString(),
            version: 'android'
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const fileName = `productive_backup_${new Date().toISOString().split('T')[0]}.json`;
        
        const link = document.createElement('a');
        link.setAttribute('href', dataUri);
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showToast('Data exported', 'Backup downloaded');
    }

    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    if (data.version === 'android' || data.version === 'ultimate' || data.habits) {
                        this.habits = data.habits || [];
                        this.streak = data.streak || 0;
                        this.lastActiveDate = data.lastActiveDate;
                        this.currentUser = data.currentUser || this.currentUser;
                        this.settings = data.settings || this.settings;
                        this.statistics = data.statistics || this.statistics;
                        this.saveData();
                        this.renderHabits();
                        this.updateUserDisplay();
                        this.updateSettingsDisplay();
                        this.showToast('Data imported', 'System restored');
                    } else {
                        this.showToast('Import failed', 'Invalid file');
                    }
                } catch (error) {
                    this.showToast('Import failed', 'Could not read file');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    // ========== EVENT LISTENERS ==========
    setupEventListeners() {
        // Login button
        document.getElementById('loginBtn').addEventListener('click', () => {
            const username = document.getElementById('loginUsername').value.trim() || "User";
            this.login(username);
        });
        
        // Enter key in login
        document.getElementById('loginUsername').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('loginBtn').click();
            }
        });
        
        // User profile click
        document.getElementById('userProfile').addEventListener('click', () => {
            this.showProfileModal();
        });
        
        // Logo click
        document.getElementById('logoSection').addEventListener('click', () => {
            this.showProfileModal();
        });
        
        // Add habit button
        document.getElementById('addHabitBtn').addEventListener('click', () => {
            this.showAddModal();
        });
        
        // Timer controls
        document.getElementById('startTimerBtn').addEventListener('click', () => {
            if (this.timerRunning) {
                this.pauseTimer();
            } else {
                this.startTimer();
            }
        });
        
        document.getElementById('pauseTimerBtn').addEventListener('click', () => {
            this.pauseTimer();
        });
        
        document.getElementById('resetTimerBtn').addEventListener('click', () => {
            this.resetTimer();
        });
        
        // Modal controls
        document.getElementById('closeModal').addEventListener('click', () => this.hideAllModals());
        document.getElementById('cancelBtn').addEventListener('click', () => this.hideAllModals());
        document.getElementById('saveHabitBtn').addEventListener('click', () => this.saveHabitModal());
        
        document.getElementById('closeProfileModal').addEventListener('click', () => this.hideAllModals());
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        document.getElementById('saveProfileBtn').addEventListener('click', () => this.saveProfile());
        
        // Difficulty buttons
        document.querySelectorAll('[data-difficulty]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('[data-difficulty]').forEach(b => {
                    b.classList.remove('active');
                });
                e.target.classList.add('active');
            });
        });
        
        // Timer length buttons
        document.querySelectorAll('[data-minutes]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const minutes = parseInt(e.target.dataset.minutes);
                this.updateSettings({ focusLength: minutes });
                this.timerMinutes = minutes;
                this.updateTimerDisplay();
                
                document.querySelectorAll('[data-minutes]').forEach(b => {
                    b.classList.remove('active');
                });
                e.target.classList.add('active');
            });
        });
        
        // Daily goal slider
        const dailyGoalSlider = document.getElementById('dailyGoalSlider');
        const dailyGoalValue = document.getElementById('dailyGoalValue');
        
        if (dailyGoalSlider) {
            dailyGoalSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                dailyGoalValue.textContent = value;
                this.updateSettings({ dailyGoal: value });
            });
        }
        
        // Export/Import buttons
        document.getElementById('exportDataBtn').addEventListener('click', () => this.exportData());
        document.getElementById('importDataBtn').addEventListener('click', () => this.importData());
        
        // Notifications toggle
        document.getElementById('notificationsToggle').addEventListener('change', async (e) => {
            if (e.target.checked) {
                const permission = await Notification.requestPermission();
                this.settings.notifications = permission === 'granted';
                e.target.checked = this.settings.notifications;
                
                if (this.settings.notifications) {
                    this.showToast('Notifications', 'Reminders enabled');
                }
            } else {
                this.settings.notifications = false;
            }
            this.saveData();
        });
        
        // Enter key in modal
        document.getElementById('habitName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.saveHabitModal();
            }
        });
        
        // Auto-save on visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.saveData();
            }
        });
        
        // Android touch improvements
        this.setupTouchEvents();
    }

    setupTouchEvents() {
        // Prevent long-press text selection
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });
        
        // Better touch feedback
        document.querySelectorAll('.btn, .nav-item, .habit-item, .user-profile').forEach(el => {
            el.addEventListener('touchstart', () => {
                el.classList.add('touch-active');
            });
            
            el.addEventListener('touchend', () => {
                setTimeout(() => {
                    el.classList.remove('touch-active');
                }, 150);
            });
        });
    }

    saveProfile() {
        this.hideAllModals();
        this.showToast('Settings', 'Preferences saved');
    }

    setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                
                // Update active state
                document.querySelectorAll('.nav-item').forEach(nav => {
                    nav.classList.remove('active');
                });
                item.classList.add('active');
                
                // Handle page navigation
                if (page === 'profile') {
                    this.showProfileModal();
                    // Keep dashboard active in nav
                    document.querySelector('.nav-item[data-page="dashboard"]').classList.add('active');
                    item.classList.remove('active');
                }
            });
        });
    }
}

// Initialize the Productive System after Cordova is ready
function initializeProductiveSystem() {
    // Initialize system
    const system = new ProductiveSystem();
    system.init();
    
    // Make it available globally
    window.ProductiveSystem = system;
    
    console.log('🚀 Productive.exe Android initialized');
}
