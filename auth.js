// SceneFlow AI - Authentication Module

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.authToken = null;
        this.init();
    }

    init() {
        this.setupAuthListeners();
        this.checkStoredAuth();
        console.log('Auth Manager initialized');
    }

    setupAuthListeners() {
        // Form submissions
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'loginForm') {
                e.preventDefault();
                this.handleLogin();
            } else if (e.target.id === 'signupForm') {
                e.preventDefault();
                this.handleSignup();
            }
        });

        // Real-time validation
        this.setupRealTimeValidation();

        // BYOK setup
        document.addEventListener('click', (e) => {
            if (e.target.matches('#setupBYOKBtn')) {
                this.setupBYOK();
            } else if (e.target.matches('#skipBYOKBtn')) {
                this.skipBYOK();
            }
        });
    }

    setupRealTimeValidation() {
        // Name validation
        const nameInput = document.getElementById('signupName');
        if (nameInput) {
            nameInput.addEventListener('input', () => this.validateNameField());
            nameInput.addEventListener('blur', () => this.validateNameField());
        }

        // Email validation
        const emailInput = document.getElementById('signupEmail');
        if (emailInput) {
            emailInput.addEventListener('input', () => this.validateEmailField());
            emailInput.addEventListener('blur', () => this.validateEmailField());
        }

        // Password validation
        const passwordInput = document.getElementById('signupPassword');
        if (passwordInput) {
            passwordInput.addEventListener('input', () => this.validatePasswordField());
            passwordInput.addEventListener('blur', () => this.validatePasswordField());
        }

        // Password confirmation validation
        const passwordConfirmInput = document.getElementById('signupPasswordConfirm');
        if (passwordConfirmInput) {
            passwordConfirmInput.addEventListener('input', () => this.validatePasswordConfirmField());
            passwordConfirmInput.addEventListener('blur', () => this.validatePasswordConfirmField());
        }
    }

    validateNameField() {
        const name = document.getElementById('signupName').value.trim();
        const validationField = document.getElementById('nameValidation');
        
        if (!name) {
            this.showFieldValidation('nameValidation', '', '');
        } else if (name.length < 2) {
            this.showFieldValidation('nameValidation', 'Name must be at least 2 characters long', 'error');
        } else if (name.length > 50) {
            this.showFieldValidation('nameValidation', 'Name must be less than 50 characters', 'error');
        } else {
            this.showFieldValidation('nameValidation', '✓ Name looks good', 'success');
        }
    }

    validateEmailField() {
        const email = document.getElementById('signupEmail').value.trim();
        const validationField = document.getElementById('emailValidation');
        
        if (!email) {
            this.showFieldValidation('emailValidation', '', '');
        } else if (!this.isValidEmail(email)) {
            this.showFieldValidation('emailValidation', 'Please enter a valid email address', 'error');
        } else {
            this.showFieldValidation('emailValidation', '✓ Email format is valid', 'success');
        }
    }

    validatePasswordField() {
        const password = document.getElementById('signupPassword').value;
        const strengthFill = document.getElementById('strengthFill');
        const strengthText = document.getElementById('strengthText');
        
        if (!password) {
            this.showFieldValidation('passwordValidation', '', '');
            if (strengthFill) strengthFill.style.width = '0%';
            if (strengthText) strengthText.textContent = 'Password strength';
            return;
        }

        const strength = this.calculatePasswordStrength(password);
        this.updatePasswordStrength(strength);
        
        if (password.length < 8) {
            this.showFieldValidation('passwordValidation', 'Password must be at least 8 characters long', 'error');
        } else if (!this.isStrongPassword(password)) {
            this.showFieldValidation('passwordValidation', 'Password must include uppercase, lowercase, number, and special character', 'error');
        } else {
            this.showFieldValidation('passwordValidation', '✓ Password meets all requirements', 'success');
        }
    }

    validatePasswordConfirmField() {
        const password = document.getElementById('signupPassword').value;
        const passwordConfirm = document.getElementById('signupPasswordConfirm').value;
        
        if (!passwordConfirm) {
            this.showFieldValidation('passwordConfirmValidation', '', '');
        } else if (password !== passwordConfirm) {
            this.showFieldValidation('passwordConfirmValidation', 'Passwords do not match', 'error');
        } else {
            this.showFieldValidation('passwordConfirmValidation', '✓ Passwords match', 'success');
        }
    }

    calculatePasswordStrength(password) {
        let score = 0;
        
        if (password.length >= 8) score += 1;
        if (password.length >= 12) score += 1;
        if (/[A-Z]/.test(password)) score += 1;
        if (/[a-z]/.test(password)) score += 1;
        if (/\d/.test(password)) score += 1;
        if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
        
        return Math.min(score, 5);
    }

    updatePasswordStrength(strength) {
        const strengthFill = document.getElementById('strengthFill');
        const strengthText = document.getElementById('strengthText');
        
        if (!strengthFill || !strengthText) return;
        
        const percentage = (strength / 5) * 100;
        strengthFill.style.width = percentage + '%';
        
        const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
        strengthText.textContent = strengthLabels[strength - 1] || 'Password strength';
        
        // Update colors based on strength
        const colors = ['#ff4444', '#ff8800', '#ffaa00', '#00aa00', '#008800'];
        strengthFill.style.backgroundColor = colors[strength - 1] || '#ccc';
    }

    async checkStoredAuth() {
        const token = localStorage.getItem('sceneFlowToken');
        if (token) {
            try {
                await this.validateStoredToken(token);
            } catch (error) {
                console.log('Stored token validation failed:', error);
                this.clearAuth();
            }
        }
    }

    async validateStoredToken(token) {
        // In a real app, this would validate with your backend
        // For now, we'll simulate a valid user
        const user = await this.getUserFromToken(token);
        if (user) {
            this.setAuthenticatedUser(user, token);
        } else {
            throw new Error('Invalid token');
        }
    }

    async getUserFromToken(token) {
        // Simulate API call to get user from token
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Return mock user data
        return {
            id: 'user123',
            name: 'Demo User',
            email: 'demo@sceneflowai.com',
            userType: 'filmmaker',
            hasBYOK: true,
            subscription: 'pro',
            credits: 15,
            avatar: null,
            preferences: {
                theme: 'light',
                notifications: true,
                language: 'en'
            }
        };
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            this.showError('Please fill in all fields');
            return;
        }

        try {
            this.showLoading('loginForm', 'Signing in...');
            const result = await this.authenticateUser(email, password);
            this.handleLoginSuccess(result);
        } catch (error) {
            this.handleLoginError(error);
        } finally {
            this.hideLoading('loginForm', 'Sign In');
        }
    }

    async handleSignup() {
        const name = document.getElementById('signupName').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;
        const passwordConfirm = document.getElementById('signupPasswordConfirm').value;
        const userType = document.getElementById('userType').value;
        const company = document.getElementById('signupCompany').value.trim();
        const termsAccept = document.getElementById('termsAccept').checked;
        const marketingAccept = document.getElementById('marketingAccept').checked;

        // Clear previous validation messages
        this.clearValidationMessages();

        // Validate all required fields
        if (!this.validateSignupFields(name, email, password, passwordConfirm, userType, termsAccept)) {
            return;
        }

        try {
            this.showLoading('signupSubmitBtn', 'Creating account...');
            const result = await this.createUser({ 
                name, 
                email, 
                password, 
                userType, 
                company, 
                marketingAccept 
            });
            this.handleSignupSuccess(result);
        } catch (error) {
            this.handleSignupError(error);
        } finally {
            this.hideLoading('signupSubmitBtn', 'Create Account');
        }
    }

    validateSignupFields(name, email, password, passwordConfirm, userType, termsAccept) {
        let isValid = true;

        // Name validation
        if (!name || name.length < 2) {
            this.showFieldValidation('nameValidation', 'Name must be at least 2 characters long', 'error');
            isValid = false;
        } else if (name.length > 50) {
            this.showFieldValidation('nameValidation', 'Name must be less than 50 characters', 'error');
            isValid = false;
        }

        // Email validation
        if (!email) {
            this.showFieldValidation('emailValidation', 'Email is required', 'error');
            isValid = false;
        } else if (!this.isValidEmail(email)) {
            this.showFieldValidation('emailValidation', 'Please enter a valid email address', 'error');
            isValid = false;
        }

        // Password validation
        if (!password) {
            this.showFieldValidation('passwordValidation', 'Password is required', 'error');
            isValid = false;
        } else if (password.length < 8) {
            this.showFieldValidation('passwordValidation', 'Password must be at least 8 characters long', 'error');
            isValid = false;
        } else if (!this.isStrongPassword(password)) {
            this.showFieldValidation('passwordValidation', 'Password must include uppercase, lowercase, number, and special character', 'error');
            isValid = false;
        }

        // Password confirmation validation
        if (!passwordConfirm) {
            this.showFieldValidation('passwordConfirmValidation', 'Please confirm your password', 'error');
            isValid = false;
        } else if (password !== passwordConfirm) {
            this.showFieldValidation('passwordConfirmValidation', 'Passwords do not match', 'error');
            isValid = false;
        }

        // User type validation
        if (!userType) {
            this.showFieldValidation('userType', 'Please select your role', 'error');
            isValid = false;
        }

        // Terms acceptance validation
        if (!termsAccept) {
            this.showError('You must accept the Terms of Service to continue');
            isValid = false;
        }

        return isValid;
    }

    isStrongPassword(password) {
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        
        return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
    }

    showFieldValidation(fieldId, message, type) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.textContent = message;
            field.className = `input-validation ${type}`;
        }
    }

    clearValidationMessages() {
        const validationFields = ['nameValidation', 'emailValidation', 'passwordValidation', 'passwordConfirmValidation'];
        validationFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.textContent = '';
                field.className = 'input-validation';
            }
        });
    }

    async authenticateUser(email, password) {
        // Simulate authentication API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Demo credentials
        if (email === 'demo@sceneflowai.com' && password === 'demo123') {
            return {
                user: {
                    id: 'user123',
                    name: 'Demo User',
                    email: email,
                    userType: 'filmmaker',
                    hasBYOK: true,
                    subscription: 'pro',
                    credits: 15
                },
                token: 'demo-token-' + Date.now()
            };
        } else {
            throw new Error('Invalid email or password');
        }
    }

    async createUser(userData) {
        // Simulate user creation API call
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Validate email format
        if (!this.isValidEmail(userData.email)) {
            throw new Error('Please enter a valid email address');
        }
        
        // Check if email already exists (simulate)
        if (userData.email === 'demo@sceneflowai.com') {
            throw new Error('An account with this email already exists');
        }
        
        // Create user profile with enhanced data
        const user = {
            id: 'user' + Date.now(),
            name: userData.name,
            email: userData.email,
            userType: userData.userType,
            company: userData.company || null,
            hasBYOK: false,
            subscription: 'creator',
            credits: 5,
            createdAt: new Date().toISOString(),
            preferences: {
                theme: 'light',
                notifications: true,
                language: 'en',
                marketingEmails: userData.marketingAccept || false
            },
            profile: {
                avatar: null,
                bio: null,
                website: null,
                socialLinks: {}
            }
        };
        
        // Store user data in localStorage for demo purposes
        const existingUsers = JSON.parse(localStorage.getItem('sceneFlowUsers') || '[]');
        existingUsers.push({
            email: userData.email,
            password: this.hashPassword(userData.password), // In real app, this would be hashed server-side
            userId: user.id
        });
        localStorage.setItem('sceneFlowUsers', JSON.stringify(existingUsers));
        
        return {
            user,
            token: 'new-user-token-' + Date.now()
        };
    }

    hashPassword(password) {
        // Simple hash for demo purposes - in production, use proper hashing
        return btoa(password + 'sceneflow-salt');
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    handleLoginSuccess(result) {
        this.setAuthenticatedUser(result.user, result.token);
        this.showSuccess('Login successful!');
        
        // Navigate to main app
        setTimeout(() => {
            this.showMainApp();
        }, 1000);
    }

    handleLoginError(error) {
        this.showError('Login failed: ' + error.message);
        console.error('Login error:', error);
    }

    handleSignupSuccess(result) {
        this.setAuthenticatedUser(result.user, result.token);
        this.showSuccess('Account created successfully!');
        
        // BYOK setup moved to onboarding and workflow options
        // Users can configure their API keys during the creative process
        console.log('BYOK setup available during workflow');
    }

    handleSignupError(error) {
        this.showError('Signup failed: ' + error.message);
        console.error('Signup error:', error);
    }

    setAuthenticatedUser(user, token) {
        this.currentUser = user;
        this.authToken = token;
        this.isAuthenticated = true;
        
        // Store in localStorage
        localStorage.setItem('sceneFlowToken', token);
        localStorage.setItem('sceneFlowUser', JSON.stringify(user));
        
        // Update global app state
        if (window.sceneFlowAI) {
            window.sceneFlowAI.currentUser = user;
            window.sceneFlowAI.isAuthenticated = true;
        }
        
        console.log('User authenticated:', user);
    }

    async setupBYOK() {
        const apiKey = document.getElementById('geminiKey').value.trim();
        
        if (!apiKey) {
            this.showError('Please enter your Gemini API key');
            return;
        }

        try {
            this.showLoading('setupBYOKBtn', 'Setting up...');
            
            // Validate API key (simulate)
            await this.validateGeminiKey(apiKey);
            
            // Update user BYOK status
            this.currentUser.hasBYOK = true;
            this.currentUser.geminiKey = this.encryptApiKey(apiKey);
            
            // Save updated user data
            this.saveUserData();
            
            this.showSuccess('BYOK setup successful!');
            
            // Navigate to main app
            setTimeout(() => {
                this.showMainApp();
            }, 1000);
            
        } catch (error) {
            this.handleBYOKError(error);
        } finally {
            this.hideLoading('setupBYOKBtn', 'Set Up Key');
        }
    }

    async validateGeminiKey(apiKey) {
        // Simulate API key validation
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Basic validation (in real app, test with actual API call)
        if (apiKey.length < 20) {
            throw new Error('Invalid API key format');
        }
        
        // Simulate network error occasionally
        if (Math.random() < 0.1) {
            throw new Error('Network error. Please try again.');
        }
    }

    encryptApiKey(apiKey) {
        // In a real app, this would use proper encryption
        // For demo purposes, we'll just encode it
        return btoa(apiKey);
    }

    decryptApiKey(encryptedKey) {
        // In a real app, this would use proper decryption
        try {
            return atob(encryptedKey);
        } catch (error) {
            return null;
        }
    }

    handleBYOKError(error) {
        this.showError('BYOK setup failed: ' + error.message);
        console.error('BYOK error:', error);
    }

    skipBYOK() {
        this.currentUser.hasBYOK = false;
        this.saveUserData();
        
        this.showInfo('You can add your API key later in settings');
        
        // Navigate to main app
        setTimeout(() => {
            this.showMainApp();
        }, 1000);
    }

    saveUserData() {
        if (this.currentUser) {
            localStorage.setItem('sceneFlowUser', JSON.stringify(this.currentUser));
            
            // Update global app state
            if (window.sceneFlowAI) {
                window.sceneFlowAI.currentUser = this.currentUser;
            }
        }
    }

    logout() {
        this.clearAuth();
        this.showInfo('Logged out successfully');
        
        // Navigate to landing page
        setTimeout(() => {
            this.showLandingPage();
        }, 1000);
    }

    clearAuth() {
        this.currentUser = null;
        this.authToken = null;
        this.isAuthenticated = false;
        
        // Clear localStorage
        localStorage.removeItem('sceneFlowToken');
        localStorage.removeItem('sceneFlowUser');
        
        // Update global app state
        if (window.sceneFlowAI) {
            window.sceneFlowAI.currentUser = null;
            window.sceneFlowAI.isAuthenticated = false;
        }
        
        console.log('User logged out');
    }

    // UI Navigation
    showLandingPage() {
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('authScreens').style.display = 'block';
        document.getElementById('landingPage').style.display = 'block';
        document.getElementById('mainApp').style.display = 'none';
        document.getElementById('workflowScreens').style.display = 'none';
    }

    showMainApp() {
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('authScreens').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        document.getElementById('workflowScreens').style.display = 'none';
        
        // Update UI for authenticated user
        this.updateUIForUser();
    }

    showBYOKSetup() {
        // BYOK setup moved to onboarding and workflow options
        // Users can configure their API keys during the creative process
        console.log('BYOK setup available during workflow');
    }

    updateUIForUser() {
        if (this.currentUser) {
            // Update user name displays
            const userNameElements = document.querySelectorAll('#userName, #userDisplayName');
            userNameElements.forEach(el => {
                if (el) el.textContent = this.currentUser.name;
            });
            
            // Update credits display if available
            const creditsElements = document.querySelectorAll('.credits-display');
            creditsElements.forEach(el => {
                if (el) el.textContent = this.currentUser.credits;
            });
            
            // Update subscription display if available
            const subscriptionElements = document.querySelectorAll('.subscription-display');
            subscriptionElements.forEach(el => {
                if (el) el.textContent = this.currentUser.subscription;
            });
        }
    }

    // Utility methods
    showLoading(formId, loadingText) {
        const form = document.getElementById(formId);
        if (form) {
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + loadingText;
            }
        }
    }

    hideLoading(formId, originalText) {
        const form = document.getElementById(formId);
        if (form) {
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        }
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showInfo(message) {
        this.showNotification(message, 'info');
    }

    showNotification(message, type = 'info') {
        // Use the main app's notification system if available
        if (window.sceneFlowAI && window.sceneFlowAI.showNotification) {
            window.sceneFlowAI.showNotification(message, type);
        } else {
            // Fallback notification
            const notification = document.createElement('div');
            notification.className = `auth-notification auth-notification-${type}`;
            notification.textContent = message;
            
            Object.assign(notification.style, {
                position: 'fixed',
                top: '20px',
                right: '20px',
                padding: '1rem 1.5rem',
                borderRadius: '10px',
                color: 'white',
                fontWeight: '600',
                zIndex: '1000',
                transform: 'translateX(100%)',
                transition: 'transform 0.3s ease',
                maxWidth: '300px',
                wordWrap: 'break-word'
            });

            const colors = {
                success: '#4CAF50',
                error: '#F44336',
                info: '#2196F3',
                warning: '#FF9800'
            };
            notification.style.backgroundColor = colors[type] || colors.info;

            document.body.appendChild(notification);

            setTimeout(() => {
                notification.style.transform = 'translateX(0)';
            }, 100);

            setTimeout(() => {
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }, 5000);
        }
    }

    // Password reset functionality
    async requestPasswordReset(email) {
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            this.showSuccess('Password reset email sent! Check your inbox.');
        } catch (error) {
            this.showError('Failed to send reset email: ' + error.message);
        }
    }

    // Account deletion
    async deleteAccount() {
        if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            try {
                // Simulate API call
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                this.clearAuth();
                this.showSuccess('Account deleted successfully');
                
                setTimeout(() => {
                    this.showLandingPage();
                }, 1000);
            } catch (error) {
                this.showError('Failed to delete account: ' + error.message);
            }
        }
    }

    // Session management
    refreshSession() {
        // In a real app, this would refresh the auth token
        if (this.authToken) {
            // Extend session
            localStorage.setItem('sceneFlowToken', this.authToken);
            console.log('Session refreshed');
        }
    }

    // Auto-logout on inactivity
    setupInactivityLogout() {
        let inactivityTimer;
        const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
        
        const resetTimer = () => {
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(() => {
                if (this.isAuthenticated) {
                    this.showInfo('Session expired due to inactivity');
                    this.logout();
                }
            }, INACTIVITY_TIMEOUT);
        };
        
        // Reset timer on user activity
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, resetTimer, true);
        });
        
        resetTimer();
    }
}

// Initialize auth manager
let authManager;

document.addEventListener('DOMContentLoaded', () => {
    authManager = new AuthManager();
});

// Global functions for HTML onclick handlers
function setupBYOK() {
    if (authManager) {
        authManager.setupBYOK();
    }
}

function skipBYOK() {
    if (authManager) {
        authManager.skipBYOK();
    }
}
