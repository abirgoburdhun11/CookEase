// cooking.js - Voice-Controlled Cooking Assistant (NO PHP VERSION)
class VoiceControlledCooking {
  constructor() {
    // Timer properties
    this.remaining = 0;
    this.total = 0;
    this.timerId = null;
    this.isRunning = false;
    
    // Voice control properties
    this.allRecipes = [];
    this.currentRecipeIndex = -1;
    this.currentInstructionIndex = -1;
    this.wasListeningBeforeSpeak = false;
    this.lastCommand = "";
    this.lastCommandTime = 0;
    this.consecutiveUnknownCommands = 0;
    
    // Speech recognition and synthesis
    this.recognition = null;
    this.recognitionRunningFlag = false;
    this.synth = window.speechSynthesis;
    this.currentUtterance = null;
    
    // Text animation
    this.currentWords = [];
    this.currentWordIndex = 0;
    this.wordTimers = [];
    
    // DOM Elements
    this.elements = {
      timeDisplay: document.getElementById('timeDisplay'),
      progressBar: document.getElementById('progressBar'),
      startBtn: document.getElementById('startBtn'),
      pauseBtn: document.getElementById('pauseBtn'),
      resetBtn: document.getElementById('resetBtn'),
      minutesInput: document.getElementById('minutesInput'),
      secondsInput: document.getElementById('secondsInput'),
      setTimeBtn: document.getElementById('setTimeBtn'),
      recipeTitle: document.getElementById('recipeTitle'),
      currentStep: document.getElementById('currentStep'),
      totalSteps: document.getElementById('totalSteps'),
      instructionText: document.getElementById('instructionText'),
      instructionProgress: document.getElementById('instructionProgress'),
      recordingStatus: document.getElementById('recordingStatus'),
      guideOverlay: document.getElementById('guideOverlay'),
      guideToggle: document.getElementById('guideToggle'),
      closeGuide: document.getElementById('closeGuide'),
      neverShowAgain: document.getElementById('neverShowAgain'),
      startListeningGuide: document.getElementById('startListeningGuide'),
      // Timer popup elements
      timerPopup: document.getElementById('timerPopup'),
      timerToggleBtn: document.getElementById('timerToggleBtn'),
      closeTimerBtn: document.getElementById('closeTimerBtn'),
      timerBadge: document.getElementById('timerBadge'),
      timerStatus: document.getElementById('timerStatus')
    };
    
    // Timer presets
    this.presetButtons = document.querySelectorAll('.preset-btn');
    
    // Voice command buttons
    this.voiceCommandButtons = document.querySelectorAll('.voice-command-btn');
    
    // Initialize
    this.init();
  }
  
  async init() {
    // Set recipe title from URL
    const title = this.getQueryParam('title');
    if (this.elements.recipeTitle) {
      this.elements.recipeTitle.textContent = title 
        ? `Cooking: ${decodeURIComponent(title)}`
        : 'Voice-Controlled Cooking';
    }
    
    // Load recipes
    await this.loadRecipes();
    
    // If a recipe is specified in URL, load it
    if (title) {
      const recipeTitle = decodeURIComponent(title);
      const idx = this.findRecipeByTitle(recipeTitle);
      if (idx !== -1) {
        this.selectRecipeByIndex(idx);
      }
    }
    
    // Initialize timer
    this.setTime(15 * 60);
    
    // Initialize event listeners
    this.initEventListeners();
    
    // Initialize speech recognition
    this.initSpeechRecognition();
    
    // Update UI
    this.updateButtonStates();
    this.updateRecordingStatus(false);
    this.updateTimerBadge();
    
    // Check if guide should be shown
    this.checkGuidePreference();
    
    // Request notification permission
    this.requestNotificationPermission();
  }
  
  // ===================== TIMER FUNCTIONALITY =====================
  
  getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  }
  
  validateInputs() {
    const mins = this.elements.minutesInput;
    const secs = this.elements.secondsInput;
    
    if (mins && mins.value < 0) mins.value = 0;
    if (mins && mins.value > 120) mins.value = 120;
    if (secs && secs.value < 0) secs.value = 0;
    if (secs && secs.value > 59) secs.value = 59;
  }
  
  formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  
  formatShortTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }
  
  updateDisplay() {
    if (this.elements.timeDisplay) {
      const displayTime = this.formatTime(this.remaining);
      this.elements.timeDisplay.textContent = displayTime;
      
      // Update timer badge
      this.updateTimerBadge();
      
      // Color coding
      if (this.remaining <= 60 && this.remaining > 0) {
        this.elements.timeDisplay.style.color = 'var(--danger)';
        this.elements.timerStatus.textContent = 'Less than 1 minute!';
        this.elements.timerStatus.style.color = 'var(--danger)';
      } else if (this.remaining <= 300) {
        this.elements.timeDisplay.style.color = 'var(--accent)';
        this.elements.timerStatus.textContent = 'Almost done!';
        this.elements.timerStatus.style.color = 'var(--accent)';
      } else {
        this.elements.timeDisplay.style.color = 'var(--text)';
        this.elements.timerStatus.textContent = 'Timer running';
        this.elements.timerStatus.style.color = 'var(--text-muted)';
      }
    }
    
    // Update progress bar
    if (this.elements.progressBar && this.total > 0) {
      const progress = ((this.total - this.remaining) / this.total) * 100;
      this.elements.progressBar.style.width = `${progress}%`;
    }
    
    // Update document title
    if (this.isRunning) {
      document.title = `${this.formatTime(this.remaining)} - Cookease`;
    }
  }
  
  updateTimerBadge() {
    if (this.elements.timerBadge) {
      this.elements.timerBadge.textContent = this.formatShortTime(this.remaining);
      
      // Color coding for badge
      if (this.remaining <= 60 && this.remaining > 0) {
        this.elements.timerBadge.style.background = 'var(--danger)';
        this.elements.timerBadge.style.color = 'white';
      } else if (this.remaining <= 300) {
        this.elements.timerBadge.style.background = 'var(--accent)';
        this.elements.timerBadge.style.color = 'white';
      } else {
        this.elements.timerBadge.style.background = 'var(--glass-bg)';
        this.elements.timerBadge.style.color = 'var(--text)';
      }
      
      // Add pulse animation when running
      if (this.isRunning) {
        this.elements.timerBadge.classList.add('pulse');
      } else {
        this.elements.timerBadge.classList.remove('pulse');
      }
    }
  }
  
  start() {
    if (this.isRunning || this.remaining <= 0) return;
    
    this.isRunning = true;
    this.updateButtonStates();
    
    // Show timer popup when starting
    if (!this.isTimerPopupVisible()) {
      this.showTimerPopup();
    }
    
    this.timerId = setInterval(() => {
      this.remaining--;
      this.updateDisplay();
      
      // Check for time up
      if (this.remaining <= 0) {
        this.timeUp();
      }
      
      // 1 minute warning
      if (this.remaining === 60) {
        this.sendNotification('1 minute remaining!');
        this.vibrate([100, 50, 100]);
        this.speak('One minute remaining!');
      }
      
      // 10 second countdown
      if (this.remaining <= 10 && this.remaining > 0) {
        this.vibrate(100);
        if (this.remaining === 10) {
          this.speak('Ten seconds!');
        }
      }
      
    }, 1000);
  }
  
  pause() {
    this.isRunning = false;
    clearInterval(this.timerId);
    this.timerId = null;
    this.updateButtonStates();
    this.updateTimerBadge();
    document.title = 'Cookease — Cooking Timer';
    
    if (this.elements.timerStatus) {
      this.elements.timerStatus.textContent = 'Timer paused';
      this.elements.timerStatus.style.color = 'var(--text-muted)';
    }
  }
  
  reset() {
    this.pause();
    this.setTime(this.total);
    this.updateButtonStates();
    
    if (this.elements.timerStatus) {
      this.elements.timerStatus.textContent = 'Timer ready';
      this.elements.timerStatus.style.color = 'var(--text-muted)';
    }
  }
  
  setTime(initialSeconds = null) {
    if (initialSeconds !== null) {
      this.remaining = initialSeconds;
      this.total = initialSeconds;
    } else {
      const minutes = parseInt(this.elements.minutesInput?.value || '0');
      const seconds = parseInt(this.elements.secondsInput?.value || '0');
      this.remaining = (minutes * 60) + seconds;
      this.total = this.remaining;
    }
    
    this.updateDisplay();
    this.updateButtonStates();
  }
  
  timeUp() {
    this.pause();
    this.remaining = 0;
    this.updateDisplay();
    
    // Notifications and alerts
    this.sendNotification('Time is up! 🎉');
    this.vibrate([500, 200, 500, 200, 500]);
    
    // Play sound
    this.playSound();
    
    // Speak notification
    this.speak('Timer finished! Time is up!');
    
    // Update timer status
    if (this.elements.timerStatus) {
      this.elements.timerStatus.textContent = 'Time\'s up!';
      this.elements.timerStatus.style.color = 'var(--danger)';
    }
  }
  
  updateButtonStates() {
    const startBtn = this.elements.startBtn;
    const pauseBtn = this.elements.pauseBtn;
    
    if (startBtn) {
      startBtn.disabled = this.isRunning || this.remaining <= 0;
      startBtn.textContent = this.isRunning ? 'Running...' : 'Start';
    }
    
    if (pauseBtn) {
      pauseBtn.disabled = !this.isRunning;
    }
  }
  
  sendNotification(message) {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
      new Notification('Cookease Timer', {
        body: message
      });
    }
  }
  
  requestNotificationPermission() {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }
  
  vibrate(pattern) {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }
  
  playSound() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
      
    } catch (error) {
      console.log('Audio not supported:', error);
    }
  }
  
  // ===================== TIMER POPUP FUNCTIONS =====================
  
  showTimerPopup() {
    if (this.elements.timerPopup) {
      this.elements.timerPopup.style.display = 'flex';
    }
  }
  
  hideTimerPopup() {
    if (this.elements.timerPopup) {
      this.elements.timerPopup.style.display = 'none';
    }
  }
  
  toggleTimerPopup() {
    if (this.isTimerPopupVisible()) {
      this.hideTimerPopup();
    } else {
      this.showTimerPopup();
    }
  }
  
  isTimerPopupVisible() {
    return this.elements.timerPopup && this.elements.timerPopup.style.display === 'flex';
  }
  
  // ===================== VOICE CONTROL FUNCTIONALITY =====================
  
  async loadRecipes() {
    try {
      const response = await fetch('recipe.json');
      if (!response.ok) throw new Error('Failed to load recipes');
      const data = await response.json();
      
      // Normalize all recipes (handle both key formats)
      this.allRecipes = (data.food_recipes || []).map(recipe => {
        const normalized = { ...recipe };
        if (recipe.minimum_duration && !recipe.minimumDuration) {
          normalized.minimumDuration = recipe.minimum_duration;
        }
        return normalized;
      });
      
      console.log(`Loaded ${this.allRecipes.length} recipes`);
    } catch (error) {
      console.error('Error loading recipes:', error);
      // Try to load from cache
      const cached = localStorage.getItem('cachedRecipes');
      if (cached) {
        this.allRecipes = JSON.parse(cached);
      }
    }
  }
  
  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('Speech recognition not supported');
      this.elements.recordingStatus.innerHTML = '<i class="fas fa-microphone-slash"></i><span>Speech API not supported</span>';
      return;
    }
    
    this.recognition = new SpeechRecognition();
    this.recognition.lang = window.navigator.language || 'en-US';
    this.recognition.interimResults = true;
    this.recognition.continuous = true;
    this.recognition.maxAlternatives = 1;
    
    // Event listeners for speech recognition
    this.recognition.onstart = () => {
      this.recognitionRunningFlag = true;
      this.updateRecordingStatus(true);
      console.log('Speech recognition started');
    };
    
    this.recognition.onend = () => {
      this.recognitionRunningFlag = false;
      this.updateRecordingStatus(false);
      console.log('Speech recognition ended');
      
      // Auto-restart if it wasn't manually stopped
      if (!this.recognition.manualStop) {
        setTimeout(() => {
          if (this.recognition && !this.recognitionRunningFlag) {
            try {
              this.recognition.start();
            } catch (e) {
              console.log('Auto-restart failed:', e);
            }
          }
        }, 1000);
      }
    };
    
    this.recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript.trim();
      
      if (result.isFinal) {
        console.log('Voice command:', transcript);
        this.handleSpeechCommand(transcript);
      }
    };
    
    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        this.elements.recordingStatus.innerHTML = '<i class="fas fa-microphone-slash"></i><span>Microphone blocked</span>';
      }
    };
  }
  
  startListening() {
    if (!this.recognition) {
      this.initSpeechRecognition();
    }
    
    if (this.recognition && !this.recognitionRunningFlag) {
      this.recognition.manualStop = false;
      try {
        this.recognition.start();
      } catch (error) {
        console.error('Error starting recognition:', error);
        this.requestMicrophonePermission();
      }
    }
  }
  
  stopListening() {
    if (this.recognition && this.recognitionRunningFlag) {
      this.recognition.manualStop = true;
      this.recognition.stop();
    }
  }
  
  requestMicrophonePermission() {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        stream.getTracks().forEach(track => track.stop());
        this.startListening();
      })
      .catch(error => {
        console.error('Microphone permission denied:', error);
        this.elements.recordingStatus.innerHTML = '<i class="fas fa-microphone-slash"></i><span>Microphone permission denied</span>';
      });
  }
  
  updateRecordingStatus(isActive) {
    const statusEl = this.elements.recordingStatus;
    if (!statusEl) return;
    
    if (isActive) {
      statusEl.innerHTML = '<i class="fas fa-microphone"></i><span>Listening...</span>';
      statusEl.classList.add('active');
    } else {
      statusEl.innerHTML = '<i class="fas fa-microphone-slash"></i><span>Voice Control: Off</span>';
      statusEl.classList.remove('active');
    }
  }
  
  speak(text, onWordCallback = null) {
    if (!text || !this.synth) return;
    
    // Stop any ongoing speech
    this.synth.cancel();
    
    // Stop recognition temporarily
    if (this.recognition && this.recognitionRunningFlag) {
      this.wasListeningBeforeSpeak = true;
      this.recognition.stop();
    }
    
    // Clear any existing word timers
    this.clearWordTimers();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    // Prepare text for word-level highlighting
    if (onWordCallback && this.elements.instructionText) {
      this.prepareTextForHighlighting(text, onWordCallback);
    }
    
    utterance.onstart = () => {
      console.log('Speaking:', text);
    };
    
    utterance.onend = () => {
      console.log('Finished speaking');
      this.currentUtterance = null;
      
      // Reset text highlighting
      if (this.elements.instructionText) {
        this.resetTextHighlighting();
      }
      
      // Resume recognition if it was running
      if (this.wasListeningBeforeSpeak && this.recognition) {
        setTimeout(() => {
          try {
            this.recognition.start();
          } catch (e) {
            console.log('Failed to restart recognition:', e);
          }
        }, 500);
      }
      this.wasListeningBeforeSpeak = false;
    };
    
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      this.currentUtterance = null;
    };
    
    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }
  
  prepareTextForHighlighting(text, onWordCallback) {
    const words = text.split(/\s+/);
    this.currentWords = words;
    this.currentWordIndex = 0;
    
    // Create highlighted text display
    const highlightedText = words.map(word => 
      `<span class="word">${word}</span>`
    ).join(' ');
    
    this.elements.instructionText.innerHTML = highlightedText;
    
    // Calculate approximate time per word (assuming 150 words per minute)
    const wordsPerMinute = 150;
    const msPerWord = (60 * 1000) / wordsPerMinute;
    
    // Schedule word highlighting
    this.wordTimers = words.map((word, index) => {
      return setTimeout(() => {
        const wordElements = this.elements.instructionText.querySelectorAll('.word');
        if (wordElements[index]) {
          // Remove highlight from previous word
          if (index > 0) {
            wordElements[index - 1].classList.remove('current', 'next');
            wordElements[index - 1].classList.add('spoken');
          }
          
          // Highlight current word
          wordElements[index].classList.add('current');
          wordElements[index].classList.remove('spoken', 'next');
          
          // Mark next word
          if (index + 1 < wordElements.length) {
            wordElements[index + 1].classList.add('next');
          }
          
          this.currentWordIndex = index;
          onWordCallback && onWordCallback(word, index);
        }
      }, index * msPerWord);
    });
  }
  
  clearWordTimers() {
    this.wordTimers.forEach(timer => clearTimeout(timer));
    this.wordTimers = [];
  }
  
  resetTextHighlighting() {
    if (this.elements.instructionText) {
      const wordElements = this.elements.instructionText.querySelectorAll('.word');
      wordElements.forEach(el => {
        el.classList.remove('current', 'next', 'spoken');
      });
    }
  }
  
  findRecipeByTitle(queryTitle) {
    if (!queryTitle) return -1;
    const q = queryTitle.toLowerCase().trim();
    
    // Exact match
    let idx = this.allRecipes.findIndex(r => 
      (r.title || '').toLowerCase().trim() === q
    );
    if (idx !== -1) return idx;
    
    // Contains match
    idx = this.allRecipes.findIndex(r => 
      (r.title || '').toLowerCase().includes(q)
    );
    return idx;
  }
  
  selectRecipeByIndex(idx) {
    if (idx < 0 || idx >= this.allRecipes.length) {
      this.currentRecipeIndex = -1;
      this.currentInstructionIndex = -1;
      this.speak('Recipe not found.');
      return false;
    }
    
    this.currentRecipeIndex = idx;
    this.currentInstructionIndex = -1;
    const recipe = this.allRecipes[idx];
    
    // Update UI
    if (this.elements.recipeTitle) {
      this.elements.recipeTitle.textContent = `Cooking: ${recipe.title}`;
    }
    
    if (this.elements.totalSteps) {
      this.elements.totalSteps.textContent = recipe.instructions ? recipe.instructions.length : 0;
    }
    
    this.updateInstructionDisplay();
    
    this.speak(`Selected ${recipe.title}. Say "next step" to begin, or "ingredients" for the ingredient list.`);
    return true;
  }
  
  updateInstructionDisplay() {
    if (this.currentRecipeIndex === -1) {
      this.elements.instructionText.textContent = 'No recipe selected.';
      this.elements.currentStep.textContent = '0';
      return;
    }
    
    const recipe = this.allRecipes[this.currentRecipeIndex];
    const totalSteps = recipe.instructions ? recipe.instructions.length : 0;
    
    this.elements.currentStep.textContent = (this.currentInstructionIndex + 1).toString();
    this.elements.totalSteps.textContent = totalSteps.toString();
    
    if (this.currentInstructionIndex >= 0 && this.currentInstructionIndex < totalSteps) {
      const instruction = recipe.instructions[this.currentInstructionIndex];
      this.displayInstructionWithAnimation(instruction);
    } else {
      this.elements.instructionText.textContent = 'Ready to start. Say "next step" to begin.';
      this.resetTextHighlighting();
    }
  }
  
  displayInstructionWithAnimation(instruction) {
    this.elements.instructionText.textContent = instruction;
    this.speak(instruction, (word, index) => {
      // Update progress bar
      const progress = ((index + 1) / this.currentWords.length) * 100;
      this.elements.instructionProgress.style.width = `${progress}%`;
    });
    
    // Check for timer in instruction
    this.checkForTimerInInstruction(instruction);
  }
  
  checkForTimerInInstruction(instruction) {
    const timePatterns = [
      { pattern: /(\d+)\s*-\s*(\d+)\s*hours?/i, multiplier: 3600 },
      { pattern: /(\d+)\s*-\s*(\d+)\s*minutes?/i, multiplier: 60 },
      { pattern: /(\d+)\s*-\s*(\d+)\s*mins?/i, multiplier: 60 },
      { pattern: /(\d+)\s*hours?/i, multiplier: 3600 },
      { pattern: /(\d+)\s*minutes?/i, multiplier: 60 },
      { pattern: /(\d+)\s*mins?/i, multiplier: 60 },
      { pattern: /for\s+(\d+)\s*-\s*(\d+)\s*minutes?/i, multiplier: 60 },
      { pattern: /for\s+(\d+)\s*minutes?/i, multiplier: 60 }
    ];
    
    const cookingKeywords = ['simmer', 'bake', 'cook', 'roast', 'fry', 'boil', 'steam', 'rest', 'rise', 'marinate'];
    const hasCookingAction = cookingKeywords.some(keyword => 
      instruction.toLowerCase().includes(keyword)
    );
    
    for (const { pattern, multiplier } of timePatterns) {
      const match = instruction.match(pattern);
      if (match && hasCookingAction) {
        let seconds;
        if (match[2]) { // Range like "10-20 minutes"
          const min = parseInt(match[1]);
          const max = parseInt(match[2]);
          seconds = Math.round((min + max) / 2) * multiplier;
        } else { // Single value like "30 minutes"
          seconds = parseInt(match[1]) * multiplier;
        }
        
        if (seconds > 30) { // Only suggest timers for significant times
          setTimeout(() => {
            this.speak(`This step requires about ${Math.round(seconds/60)} minutes. Should I set a timer?`);
            
            // Listen for yes/no response
            this.listenForTimerConfirmation(seconds);
          }, 1000);
        }
        break;
      }
    }
  }
  
  listenForTimerConfirmation(seconds) {
    const originalOnResult = this.recognition.onresult;
    let confirmationReceived = false;
    
    const confirmationHandler = (event) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript.trim().toLowerCase();
      
      if (result.isFinal) {
        if (transcript.includes('yes') || transcript.includes('yeah') || transcript.includes('sure')) {
          confirmationReceived = true;
          this.setTime(seconds);
          this.start();
          this.speak(`Timer set for ${Math.round(seconds/60)} minutes and started.`);
        } else if (transcript.includes('no') || transcript.includes('not') || transcript.includes('skip')) {
          confirmationReceived = true;
          this.speak('Okay, no timer set.');
        }
        
        // Restore original handler
        if (confirmationReceived) {
          this.recognition.onresult = originalOnResult;
        }
      }
    };
    
    this.recognition.onresult = confirmationHandler;
    
    // Timeout after 10 seconds
    setTimeout(() => {
      if (!confirmationReceived) {
        this.recognition.onresult = originalOnResult;
        this.speak("I didn't hear a response. I won't set a timer for now.");
      }
    }, 10000);
  }
  
  nextInstruction() {
    if (this.currentRecipeIndex === -1) {
      this.speak('No recipe selected. Say "show" followed by a recipe name.');
      return;
    }
    
    const recipe = this.allRecipes[this.currentRecipeIndex];
    if (!recipe.instructions || this.currentInstructionIndex >= recipe.instructions.length - 1) {
      this.speak('You are at the last step.');
      return;
    }
    
    this.currentInstructionIndex++;
    this.updateInstructionDisplay();
  }
  
  previousInstruction() {
    if (this.currentRecipeIndex === -1) {
      this.speak('No recipe selected.');
      return;
    }
    
    if (this.currentInstructionIndex <= 0) {
      this.speak('You are at the first step.');
      return;
    }
    
    this.currentInstructionIndex--;
    this.updateInstructionDisplay();
  }
  
  repeatInstruction() {
    if (this.currentRecipeIndex === -1 || this.currentInstructionIndex < 0) {
      this.speak('No instruction to repeat.');
      return;
    }
    
    const recipe = this.allRecipes[this.currentRecipeIndex];
    const instruction = recipe.instructions[this.currentInstructionIndex];
    this.displayInstructionWithAnimation(instruction);
  }
  
  speakIngredients() {
    if (this.currentRecipeIndex === -1) {
      this.speak('No recipe selected. Say "show" followed by a recipe name.');
      return;
    }
    
    const recipe = this.allRecipes[this.currentRecipeIndex];
    const ingredients = Array.isArray(recipe.ingredients) 
      ? recipe.ingredients.join(', ') 
      : 'No ingredients listed.';
    
    this.speak(`Ingredients for ${recipe.title}: ${ingredients}`);
  }
  
  searchRecipesByIngredient(ingredient) {
    if (!ingredient) return [];
    const q = ingredient.toLowerCase().trim();
    return this.allRecipes.filter(recipe =>
      Array.isArray(recipe.ingredients) &&
      recipe.ingredients.some(ing => (ing || '').toLowerCase().includes(q))
    );
  }
  
  handleSpeechCommand(rawCommand) {
    const now = Date.now();
    let command = rawCommand.trim().toLowerCase();
    
    // Debounce duplicate commands
    if (command === this.lastCommand && (now - this.lastCommandTime < 2000)) {
      return;
    }
    
    this.lastCommand = command;
    this.lastCommandTime = now;
    
    // Remove trailing punctuation
    if (command.endsWith('.')) {
      command = command.slice(0, -1);
    }
    
    console.log('Processing command:', command);
    
    // Timer commands
    if (command.includes('start timer') || command.includes('begin timer')) {
      this.start();
      return;
    }
    
    if (command.includes('stop timer') || command.includes('pause timer')) {
      this.pause();
      return;
    }
    
    if (command.includes('reset timer')) {
      this.reset();
      return;
    }
    
    if (command.includes('show timer')) {
      this.toggleTimerPopup();
      return;
    }
    
    // Set timer with specific time
    const setTimerMatch = command.match(/set timer (?:for )?(\d+)(?:\s*minute?s?)?/i);
    if (setTimerMatch) {
      const minutes = parseInt(setTimerMatch[1]);
      this.setTime(minutes * 60);
      this.showTimerPopup();
      this.speak(`Timer set for ${minutes} minutes.`);
      return;
    }
    
    // Recipe navigation commands
    if (command === 'next step' || command === 'next') {
      this.nextInstruction();
      this.consecutiveUnknownCommands = 0;
      return;
    }
    
    if (command === 'previous step' || command === 'previous' || command === 'back') {
      this.previousInstruction();
      this.consecutiveUnknownCommands = 0;
      return;
    }
    
    if (command === 'repeat step' || command === 'repeat') {
      this.repeatInstruction();
      this.consecutiveUnknownCommands = 0;
      return;
    }
    
    if (command === 'ingredients' || command.includes('show ingredients')) {
      this.speakIngredients();
      this.consecutiveUnknownCommands = 0;
      return;
    }
    
    // Show recipe command
    const showMatch = command.match(/^(?:show|open|display|find|load)\s+(?:the\s+)?(?:recipe\s+)?(.+)/i);
    if (showMatch) {
      const titleQuery = showMatch[1].trim();
      const idx = this.findRecipeByTitle(titleQuery);
      if (idx === -1) {
        this.speak(`I couldn't find a recipe named ${titleQuery}.`);
      } else {
        this.selectRecipeByIndex(idx);
      }
      this.consecutiveUnknownCommands = 0;
      return;
    }
    
    // Search by ingredient
    const searchMatch = command.match(/(?:search|find|show).(?:with|containing|using)?\s([a-zA-Z0-9\s]+)$/i);
    if (searchMatch && !/^(show|open|display|find)\s+recipe/i.test(command)) {
      const ingredient = searchMatch[1].trim();
      const results = this.searchRecipesByIngredient(ingredient);
      if (results.length === 0) {
        this.speak(`No recipes found with ${ingredient}.`);
      } else {
        this.speak(`Found ${results.length} recipes with ${ingredient}. Selecting the first: ${results[0].title}`);
        const idx = this.allRecipes.findIndex(r => r.title === results[0].title);
        this.selectRecipeByIndex(idx);
      }
      this.consecutiveUnknownCommands = 0;
      return;
    }
    
    // Direct recipe title (without "show")
    const directIdx = this.findRecipeByTitle(command);
    if (directIdx !== -1) {
      this.selectRecipeByIndex(directIdx);
      this.consecutiveUnknownCommands = 0;
      return;
    }
    
    // Guide toggle
    if (command.includes('help') || command.includes('guide') || command.includes('commands')) {
      this.showGuide();
      this.consecutiveUnknownCommands = 0;
      return;
    }
    
    // Unknown command
    this.consecutiveUnknownCommands++;
    this.speak('Sorry, I did not understand that command. Try saying "next step", "previous step", or "ingredients".');
    
    // Show guide after 3 consecutive unknown commands
    if (this.consecutiveUnknownCommands >= 3) {
      this.consecutiveUnknownCommands = 0;
      this.showGuide();
      this.speak('Let me show you the available commands.');
    }
  }
  
  // ===================== GUIDE FUNCTIONALITY =====================
  
  checkGuidePreference() {
    const hideGuide = localStorage.getItem('cookease_hideGuide');
    if (!hideGuide || hideGuide !== 'true') {
      // Show guide on first visit
      const firstVisit = !localStorage.getItem('cookease_firstVisit');
      if (firstVisit) {
        setTimeout(() => {
          this.showGuide();
          localStorage.setItem('cookease_firstVisit', 'true');
        }, 1000);
      }
    }
  }
  
  showGuide() {
    if (this.elements.guideOverlay) {
      this.elements.guideOverlay.style.display = 'flex';
    }
  }
  
  hideGuide() {
    if (this.elements.guideOverlay) {
      this.elements.guideOverlay.style.display = 'none';
    }
  }
  
  // ===================== EVENT LISTENERS =====================
  
  initEventListeners() {
    // Timer controls
    this.elements.startBtn?.addEventListener('click', () => this.start());
    this.elements.pauseBtn?.addEventListener('click', () => this.pause());
    this.elements.resetBtn?.addEventListener('click', () => this.reset());
    this.elements.setTimeBtn?.addEventListener('click', () => this.setTime());
    
    // Preset buttons
    this.presetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const minutes = parseInt(btn.dataset.minutes);
        this.elements.minutesInput.value = minutes;
        this.elements.secondsInput.value = 0;
        this.setTime();
      });
    });
    
    // Input validation
    this.elements.minutesInput?.addEventListener('change', () => this.validateInputs());
    this.elements.secondsInput?.addEventListener('change', () => this.validateInputs());
    
    // Voice command buttons
    this.voiceCommandButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const command = btn.dataset.command;
        this.handleSpeechCommand(command);
      });
    });
    
    // Timer popup controls
    this.elements.timerToggleBtn?.addEventListener('click', () => this.toggleTimerPopup());
    this.elements.closeTimerBtn?.addEventListener('click', () => this.hideTimerPopup());
    
    // Click outside timer popup to close
    this.elements.timerPopup?.addEventListener('click', (e) => {
      if (e.target === this.elements.timerPopup) {
        this.hideTimerPopup();
      }
    });
    
    // Guide controls
    this.elements.guideToggle?.addEventListener('click', () => this.showGuide());
    this.elements.closeGuide?.addEventListener('click', () => this.hideGuide());
    this.elements.neverShowAgain?.addEventListener('click', () => {
      localStorage.setItem('cookease_hideGuide', 'true');
      this.hideGuide();
    });
    this.elements.startListeningGuide?.addEventListener('click', () => {
      this.startListening();
      this.hideGuide();
    });
    
    // Microphone permission on first click
    this.elements.recordingStatus?.addEventListener('click', () => {
      if (!this.recognitionRunningFlag) {
        this.startListening();
      } else {
        this.stopListening();
      }
    });
    
    // Click outside guide to close
    this.elements.guideOverlay?.addEventListener('click', (e) => {
      if (e.target === this.elements.guideOverlay) {
        this.hideGuide();
      }
    });
  }
}

// Initialize the app when DOM is ready
let cookingApp;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    cookingApp = new VoiceControlledCooking();
  });
} else {
  cookingApp = new VoiceControlledCooking();
}

// Make app accessible globally for debugging
window.cookingApp = cookingApp;