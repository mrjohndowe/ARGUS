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

function setAudioSetupStatus(message) {
  const status = document.getElementById('audio-setup-status');
  if (status) status.textContent = message;
}

function stopAudioSetupStream() {
  window.audioSetupStream?.getTracks().forEach((track) => track.stop());
  window.audioSetupStream = null;
  window.audioSetupContext?.close();
  window.audioSetupContext = null;
  if (window.audioMeterFrame) cancelAnimationFrame(window.audioMeterFrame);
  window.audioMeterFrame = null;
  const level = document.getElementById('microphone-level');
  if (level) level.style.width = '0%';
}

function drawMicrophoneLevel(analyser) {
  const samples = new Uint8Array(analyser.fftSize);
  const update = () => {
    analyser.getByteTimeDomainData(samples);
    const average = samples.reduce((total, sample) => total + Math.abs(sample - 128), 0) / samples.length;
    const level = document.getElementById('microphone-level');
    if (level) level.style.width = `${Math.min(100, Math.round(average * 5))}%`;
    window.audioMeterFrame = requestAnimationFrame(update);
  };
  update();
}

async function populateAudioDevices() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const speakers = devices.filter((device) => device.kind === 'audiooutput');
  const microphones = devices.filter((device) => device.kind === 'audioinput');
  const speakerSelect = document.getElementById('speaker-device');
  const microphoneSelect = document.getElementById('microphone-device');
  const previousSpeaker = window.setupAudio?.outputDeviceId || speakerSelect.value;
  const previousMicrophone = window.setupAudio?.inputDeviceId || microphoneSelect.value;

  const fillSelect = (select, choices, emptyLabel) => {
    select.replaceChildren();
    if (!choices.length) {
      select.add(new Option(emptyLabel, ''));
      select.disabled = true;
      return;
    }
    choices.forEach((device, index) => select.add(new Option(device.label || `${emptyLabel} ${index + 1}`, device.deviceId)));
    select.disabled = false;
  };

  fillSelect(speakerSelect, speakers, 'Speaker');
  fillSelect(microphoneSelect, microphones, 'Microphone');
  if ([...speakerSelect.options].some((option) => option.value === previousSpeaker)) speakerSelect.value = previousSpeaker;
  if ([...microphoneSelect.options].some((option) => option.value === previousMicrophone)) microphoneSelect.value = previousMicrophone;
  document.getElementById('test-speaker-button').disabled = !speakerSelect.value;
  return { speakerSelect, microphoneSelect };
}

async function startMicrophoneTest() {
  stopAudioSetupStream();
  const microphoneId = document.getElementById('microphone-device').value;
  const constraints = { audio: microphoneId ? { deviceId: { exact: microphoneId } } : true };
  window.audioSetupStream = await navigator.mediaDevices.getUserMedia(constraints);
  const context = new AudioContext();
  const analyser = context.createAnalyser();
  analyser.fftSize = 256;
  context.createMediaStreamSource(window.audioSetupStream).connect(analyser);
  window.audioSetupContext = context;
  drawMicrophoneLevel(analyser);
  window.setupAudio = {
    inputDeviceId: window.audioSetupStream.getAudioTracks()[0].getSettings().deviceId || microphoneId,
    outputDeviceId: document.getElementById('speaker-device').value
  };
  setAudioSetupStatus('Microphone connected. Speak normally and confirm that the level meter responds.');
  document.getElementById('continue-audio-button').disabled = false;
}

async function enableAudioSetup() {
  try {
    setAudioSetupStatus('Requesting microphone access…');
    await navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => stream.getTracks().forEach((track) => track.stop()));
    const { microphoneSelect } = await populateAudioDevices();
    await startMicrophoneTest();
    microphoneSelect.addEventListener('change', startMicrophoneTest);
    document.getElementById('enable-audio-button').hidden = true;
  } catch (error) {
    setAudioSetupStatus(`Microphone setup failed: ${error.name || 'unknown error'}. Check that Windows allows ARGUS to use your microphone, then try again.`);
  }
}

async function testSelectedSpeaker() {
  const speakerId = document.getElementById('speaker-device').value;
  try {
    const context = new AudioContext();
    const destination = context.createMediaStreamDestination();
    const output = new Audio();
    output.srcObject = destination.stream;
    if (speakerId && typeof output.setSinkId === 'function') await output.setSinkId(speakerId);
    const oscillator = context.createOscillator();
    oscillator.frequency.value = 660;
    oscillator.connect(destination);
    await output.play();
    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
      output.pause();
      context.close();
    }, 700);
    setAudioSetupStatus('Playing an ARGUS audio test through the selected speaker.');
  } catch (error) {
    setAudioSetupStatus(`Speaker test failed: ${error.name || 'unknown error'}. Select another output and try again.`);
  }
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

  recognition.onerror = (event) => {
    const reason = event.error || 'unknown recognition error';
    setVoiceOnboardingStatus(`I did not catch that (${reason}). Select Listen again, then say your name after the prompt.`);
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
    setTimeout(() => speakOnboardingPrompt('Welcome. I am ARGUS, Artificial Responsive Guidance Utility System. First, let’s configure your audio devices.'), 300);
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
  const enableAudioButton = document.getElementById('enable-audio-button');
  if (enableAudioButton) enableAudioButton.addEventListener('click', enableAudioSetup);

  const testSpeakerButton = document.getElementById('test-speaker-button');
  if (testSpeakerButton) testSpeakerButton.addEventListener('click', testSelectedSpeaker);

  const continueAudioButton = document.getElementById('continue-audio-button');
  if (continueAudioButton) {
    continueAudioButton.addEventListener('click', () => {
      window.setupAudio.outputDeviceId = document.getElementById('speaker-device').value;
      stopAudioSetupStream();
      document.getElementById('audio-step').classList.add('hidden');
      document.getElementById('name-step').classList.remove('hidden');
      beginVoiceOnboarding();
    });
  }
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
        audio: window.setupAudio,
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
