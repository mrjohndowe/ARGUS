// Config management
async function getConfig() {
  return await window.electronAPI.getConfig();
}

async function saveConfig(config) {
  return await window.electronAPI.saveConfig(config);
}

async function isFirstRun() {
  return await window.electronAPI.isFirstRun();
}

async function completeSetup(config) {
  return await window.electronAPI.completeSetup(config);
}

// Safe PC utilities
async function launchApp(appPath) {
  return await window.electronAPI.launchApp(appPath);
}

async function getSystemInfo() {
  return await window.electronAPI.getSystemInfo();
}

async function readClipboard() {
  return await window.electronAPI.readClipboard();
}

async function writeClipboard(text) {
  return await window.electronAPI.writeClipboard(text);
}

// UI functions
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(screen => {
    screen.style.display = 'none';
  });
  document.getElementById(screenId).style.display = 'block';
}

function getAddressTerm(config) {
  if (!config) return 'Sir';
  
  switch (config.addressStyle) {
    case 'Sir':
      return 'Sir';
    case 'Madam':
      return 'Madam';
    case 'name':
      return config.userName;
    case 'adaptive':
      return config.userName;
    default:
      return 'Sir';
  }
}

function addMessage(type, text) {
  const messagesContainer = document.getElementById('messages');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message message-${type}`;
  
  const senderSpan = document.createElement('span');
  senderSpan.className = 'message-sender';
  senderSpan.textContent = type === 'argus' ? 'ARGUS:' : (type === 'user' ? 'You:' : '');
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  if (type === 'argus' || type === 'user') {
    contentDiv.appendChild(senderSpan);
  }
  contentDiv.appendChild(document.createTextNode(text));
  
  const timestampDiv = document.createElement('div');
  timestampDiv.className = 'message-timestamp';
  timestampDiv.textContent = new Date().toLocaleTimeString();
  
  messageDiv.appendChild(contentDiv);
  messageDiv.appendChild(timestampDiv);
  messagesContainer.appendChild(messageDiv);
  
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  
  // Auto-speak if enabled
  if (type === 'argus' && window.currentConfig?.settings?.autoSpeak) {
    speakResponse(text);
  }
}

function addToActivityLog(type, action) {
  const activityLog = window.activityLog || [];
  activityLog.push({
    type: type,
    action: action,
    timestamp: new Date().toISOString()
  });
  window.activityLog = activityLog;
  updateActivityLogDisplay();
}

function updateActivityLogDisplay() {
  const activityLogContainer = document.getElementById('activity-log-content');
  if (!activityLogContainer) return;
  
  const activityLog = window.activityLog || [];
  activityLogContainer.innerHTML = '';
  
  if (activityLog.length === 0) {
    activityLogContainer.innerHTML = '<p>No activity recorded yet.</p>';
    return;
  }
  
  activityLog.forEach(entry => {
    const entryDiv = document.createElement('div');
    entryDiv.className = 'activity-entry';

    const type = document.createElement('span');
    type.className = 'activity-type';
    type.textContent = `${entry.type}:`;

    const action = document.createElement('span');
    action.className = 'activity-action';
    action.textContent = entry.action;

    const time = document.createElement('span');
    time.className = 'activity-time';
    time.textContent = new Date(entry.timestamp).toLocaleTimeString();

    entryDiv.append(type, action, time);
    activityLogContainer.appendChild(entryDiv);
  });
}

function speakResponse(text) {
  if (window.currentConfig?.settings?.voiceEnabled && 'speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 0.9;
    speechSynthesis.speak(utterance);
  }
}

function supportsSpeechRecognition() {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}

function setVoiceOnboardingStatus(message, isListening = false) {
  const status = document.getElementById('voice-name-status');
  const panel = document.querySelector('.voice-onboarding');
  if (status) status.textContent = message;
  panel?.classList.toggle('listening', isListening);
}

function speakOnboardingPrompt(text, onComplete) {
  if (!('speechSynthesis' in window)) {
    onComplete?.();
    return;
  }

  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9;
  utterance.pitch = 0.9;
  utterance.onend = () => onComplete?.();
  utterance.onerror = () => onComplete?.();
  speechSynthesis.speak(utterance);
}

function beginVoiceOnboarding() {
  if (!supportsSpeechRecognition()) {
    setVoiceOnboardingStatus('Voice recognition is unavailable on this PC. Install or enable a supported speech-recognition service, then select Listen again.');
    return;
  }

  setVoiceOnboardingStatus('ARGUS is speaking. Your microphone will activate after the question.');
  speakOnboardingPrompt('Welcome. I am ARGUS, Artificial Responsive Guidance Utility System. Before we begin, what would you like me to call you?', listenForPreferredName);
}

function listenForPreferredName() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    window.onboardingRecognition = recognition;
    setVoiceOnboardingStatus('Listening for your preferred name…', true);
  };

  recognition.onresult = (event) => {
    const userName = event.results[0][0].transcript.trim().replace(/\s+/g, ' ').slice(0, 50);
    if (!userName) return;

    window.setupUserName = userName;
    document.getElementById('name-option-label').textContent = userName;
    setVoiceOnboardingStatus(`Thank you, ${userName}.`);
    speakOnboardingPrompt(`Thank you, ${userName}. How should I address you? Choose Sir, Madam, your name, or Adaptive.`, () => {
      document.getElementById('address-step').classList.remove('hidden');
      document.getElementById('name-step').classList.add('hidden');
    });
  };

  recognition.onerror = () => {
    setVoiceOnboardingStatus('I did not catch that. Select Listen again, then say your name after the prompt.');
  };

  recognition.onend = () => {
    window.onboardingRecognition = null;
    document.querySelector('.voice-onboarding')?.classList.remove('listening');
  };

  try {
    recognition.start();
  } catch {
    setVoiceOnboardingStatus('ARGUS is already listening. Please say your name.');
  }
}

async function processCommand(command) {
  const config = window.currentConfig;
  const addressTerm = getAddressTerm(config);
  addToActivityLog('processing', `Processing command: ${command}`);

  const lowerCommand = command.toLowerCase();
  
  if (lowerCommand.includes('hello') || lowerCommand.includes('hi')) {
    setTimeout(() => {
      addMessage('argus', `Hello, ${addressTerm}. How may I assist you today?`);
    }, 500);
  } else if (lowerCommand.includes('time')) {
    const time = new Date().toLocaleTimeString();
    setTimeout(() => {
      addMessage('argus', `The current time is ${time}, ${addressTerm}.`);
    }, 500);
  } else if (lowerCommand.includes('date')) {
    const date = new Date().toLocaleDateString();
    setTimeout(() => {
      addMessage('argus', `Today's date is ${date}, ${addressTerm}.`);
    }, 500);
  } else if (lowerCommand.includes('system') || lowerCommand.includes('status')) {
    try {
      const sysInfo = await getSystemInfo();
      setTimeout(() => {
        addMessage('argus', `System status: Platform ${sysInfo.platform}, ${sysInfo.cpus} CPU cores, ${sysInfo.totalMemory}GB total memory, ${sysInfo.freeMemory}GB free. All systems operational, ${addressTerm}.`);
      }, 500);
    } catch (error) {
      addMessage('argus', `I apologize, ${addressTerm}. I'm unable to retrieve system information at this moment.`);
    }
  } else if (lowerCommand.includes('help')) {
    setTimeout(() => {
      addMessage('argus', `Available commands, ${addressTerm}: time, date, system status, help, settings, activity log. I can also assist with file operations, launching applications, and clipboard management with your permission.`);
    }, 500);
  } else {
    setTimeout(() => {
      addMessage('argus', `I understand your request, ${addressTerm}. Full AI integration is being implemented. For now, I can help with basic commands like time, date, system status, and help.`);
    }, 500);
  }
}

// Initialize app
async function initApp() {
  window.activityLog = [];
  
  // Hide all screens initially
  document.querySelectorAll('.screen').forEach(screen => {
    screen.style.display = 'none';
  });
  
  const firstRun = await isFirstRun();
  
  if (firstRun) {
    showScreen('setup-screen');
    setTimeout(beginVoiceOnboarding, 300);
  } else {
    const config = await getConfig();
    window.currentConfig = config;
    showScreen('main-interface');
    syncSettingsControls(config);
    addMessage('system', 'Configuration complete. ARGUS is online and standing by.');
  }
  
  // Setup event listeners
  setupEventListeners();
}

function setupEventListeners() {
  // Setup screen
  const retryNameButton = document.getElementById('retry-name-button');
  if (retryNameButton) {
    retryNameButton.addEventListener('click', () => {
      window.onboardingRecognition?.stop();
      beginVoiceOnboarding();
    });
  }
  
  const backButton = document.getElementById('back-button');
  if (backButton) {
    backButton.addEventListener('click', () => {
      document.getElementById('address-step').classList.add('hidden');
      document.getElementById('name-step').classList.remove('hidden');
    });
  }
  
  const addressForm = document.getElementById('address-form');
  if (addressForm) {
    addressForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const addressStyle = document.querySelector('input[name="address-style"]:checked').value;
      
      const config = {
        userName: window.setupUserName,
        addressStyle: addressStyle,
        completedSetup: true,
        settings: {
          voiceEnabled: true,
          autoSpeak: true,
          responseLength: 'medium',
          formality: 'balanced'
        }
      };
      
      await completeSetup(config);
      window.currentConfig = config;
      showScreen('main-interface');
      addMessage('system', 'Configuration complete. ARGUS is online and standing by.');
    });
  }
  
  // Main interface
  const messageInput = document.getElementById('message-input');
  const sendButton = document.getElementById('send-button');
  
  if (messageInput) {
    messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }
  
  if (sendButton) {
    sendButton.addEventListener('click', sendMessage);
  }
  
  // Voice input
  const voiceButton = document.getElementById('voice-button');
  if (voiceButton) {
    voiceButton.addEventListener('click', toggleVoiceInput);
  }
  
  // Settings button
  const settingsButton = document.getElementById('settings-button');
  if (settingsButton) {
    settingsButton.addEventListener('click', () => {
      document.getElementById('settings-modal').classList.add('active');
      syncSettingsControls(window.currentConfig);
    });
  }
  
  // Activity log button
  const activityButton = document.getElementById('activity-button');
  if (activityButton) {
    activityButton.addEventListener('click', () => {
      document.getElementById('activity-modal').classList.add('active');
      updateActivityLogDisplay();
    });
  }
  
  // Close modals
  document.querySelectorAll('.modal-close').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
      });
    });
  });
  
  // Settings checkboxes
  const voiceEnabledCheckbox = document.getElementById('voice-enabled');
  if (voiceEnabledCheckbox) {
    voiceEnabledCheckbox.addEventListener('change', async (e) => {
      const config = { ...window.currentConfig };
      config.settings.voiceEnabled = e.target.checked;
      await saveConfig(config);
      window.currentConfig = config;
    });
  }
  
  const autoSpeakCheckbox = document.getElementById('auto-speak');
  if (autoSpeakCheckbox) {
    autoSpeakCheckbox.addEventListener('change', async (e) => {
      const config = { ...window.currentConfig };
      config.settings.autoSpeak = e.target.checked;
      await saveConfig(config);
      window.currentConfig = config;
    });
  }
  
  const responseLengthSelect = document.getElementById('response-length');
  if (responseLengthSelect) {
    responseLengthSelect.addEventListener('change', async (e) => {
      const config = { ...window.currentConfig };
      config.settings.responseLength = e.target.value;
      await saveConfig(config);
      window.currentConfig = config;
    });
  }
}

function syncSettingsControls(config) {
  const settings = config?.settings;
  if (!settings) return;

  document.getElementById('voice-enabled').checked = Boolean(settings.voiceEnabled);
  document.getElementById('auto-speak').checked = Boolean(settings.autoSpeak);
  document.getElementById('response-length').value = settings.responseLength || 'medium';
}

function sendMessage() {
  const input = document.getElementById('message-input');
  const text = input.value.trim();
  
  if (text) {
    addMessage('user', text);
    input.value = '';
    processCommand(text);
  }
}

function toggleVoiceInput() {
  const voiceButton = document.getElementById('voice-button');
  
  if (!window.isListening) {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        window.activeRecognition = recognition;
        window.isListening = true;
        voiceButton.classList.add('listening');
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        document.getElementById('message-input').value = transcript;
        window.isListening = false;
        voiceButton.classList.remove('listening');
        window.activeRecognition = null;
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        window.isListening = false;
        voiceButton.classList.remove('listening');
        window.activeRecognition = null;
      };

      recognition.onend = () => {
        window.isListening = false;
        voiceButton.classList.remove('listening');
      };

      recognition.start();
    } else {
      alert('Speech recognition is not supported in this browser.');
    }
  } else {
    window.activeRecognition?.stop();
    window.isListening = false;
    voiceButton.classList.remove('listening');
  }
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
