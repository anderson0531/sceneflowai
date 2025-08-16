// SceneFlow AI - Cue AI Assistant (DISABLED)
// This API has been disabled to resolve connection issues

class CueAssistant {
    constructor() {
        this.isOpen = false; // Force closed
        this.disabled = true; // Mark as disabled
        console.log('Cue AI Assistant DISABLED - Connection issues resolved');
    }

    init() {
        // Do nothing - API disabled
        console.log('Cue AI Assistant initialization skipped - API disabled');
    }

    setupEventListeners() {
        // Remove all event listeners - API disabled
        console.log('Cue AI Assistant event listeners disabled');
    }

    toggleCue() {
        // Force closed state
        this.isOpen = false;
        console.log('Cue AI Assistant is disabled - cannot be opened');
        
        // Show disabled message to user
        this.showDisabledMessage();
    }

    showDisabledMessage() {
        // Create or update disabled message
        let disabledMsg = document.getElementById('cueDisabledMessage');
        if (!disabledMsg) {
            disabledMsg = document.createElement('div');
            disabledMsg.id = 'cueDisabledMessage';
            disabledMsg.className = 'cue-disabled-message';
            disabledMsg.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #666;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 24px; color: #ff9800; margin-bottom: 10px;"></i>
                    <h4>Cue AI Assistant Temporarily Disabled</h4>
                    <p>This feature has been disabled to resolve connection issues.</p>
                    <p>Please try again later or contact support if the problem persists.</p>
                </div>
            `;
            
            // Insert into DOM where Cue would normally appear
            const cueContainer = document.getElementById('cueAssistant') || document.getElementById('cueAssistantWidget');
            if (cueContainer) {
                cueContainer.innerHTML = '';
                cueContainer.appendChild(disabledMsg);
            }
        }
    }

    // Disable all other methods
    async sendMessage() {
        console.log('Cue AI Assistant is disabled - cannot send messages');
        return 'Cue AI Assistant is temporarily disabled. Please try again later.';
    }

    addMessage() {
        console.log('Cue AI Assistant is disabled - cannot add messages');
    }

    formatMessage() {
        return 'Cue AI Assistant is disabled';
    }

    showTypingIndicator() {
        console.log('Cue AI Assistant is disabled - typing indicator disabled');
    }

    hideTypingIndicator() {
        console.log('Cue AI Assistant is disabled - typing indicator disabled');
    }

    async getAIResponse() {
        console.log('Cue AI Assistant is disabled - no AI responses available');
        return 'Cue AI Assistant is temporarily disabled. Please try again later.';
    }

    generateContextualResponse() {
        return 'Cue AI Assistant is temporarily disabled. Please try again later.';
    }

    updateContext() {
        console.log('Cue AI Assistant is disabled - context updates disabled');
    }

    getContextualPrompt() {
        return 'Cue AI Assistant is temporarily disabled.';
    }

    saveConversationHistory() {
        console.log('Cue AI Assistant is disabled - conversation history disabled');
    }

    loadConversationHistory() {
        console.log('Cue AI Assistant is disabled - conversation history disabled');
    }

    restoreConversation() {
        console.log('Cue AI Assistant is disabled - conversation restoration disabled');
    }

    clearConversation() {
        console.log('Cue AI Assistant is disabled - conversation clearing disabled');
    }

    getSmartSuggestions() {
        return ['Cue AI Assistant is temporarily disabled'];
    }

    showSmartSuggestions() {
        console.log('Cue AI Assistant is disabled - smart suggestions disabled');
    }

    useSuggestion() {
        console.log('Cue AI Assistant is disabled - suggestions disabled');
    }

    startVoiceInput() {
        console.log('Cue AI Assistant is disabled - voice input disabled');
    }
}

// Initialize disabled Cue assistant
let cueAssistant;

document.addEventListener('DOMContentLoaded', () => {
    cueAssistant = new CueAssistant();
    console.log('Cue AI Assistant initialized in DISABLED state');
});

// Global functions for HTML onclick handlers - all disabled
function toggleCue() {
    if (cueAssistant) {
        cueAssistant.toggleCue();
    }
}

function sendCueMessage() {
    if (cueAssistant) {
        cueAssistant.sendMessage();
    }
}

// Context updates from workflow - disabled
function updateCueContext(context) {
    if (cueAssistant) {
        console.log('Cue context update ignored - API disabled');
    }
}
