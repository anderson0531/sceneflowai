// SceneFlow AI - Main Application JavaScript

class SceneFlowAI {
    constructor() {
        console.log('SceneFlow AI constructor called');
        this.currentUser = null;
        this.isAuthenticated = false;
        this.currentProject = null;
        this.creditSystem = {
            projectCredits: 0,
            monthlyCredits: 0,
            subscriptionTier: 'free',
            creditHistory: [],
            totalSpent: 0,
            lastPurchase: null
        };
        
        // Don't call initializeApp here - wait for DOM to be ready
        console.log('SceneFlow AI instance created, waiting for DOM...');
    }

    setupEventListeners() {
        // Navigation event listeners
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-section]')) {
                this.navigateToSection(e.target.dataset.section);
            }
        });

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

        // User menu toggle
        document.addEventListener('click', (e) => {
            if (e.target.closest('.user-btn')) {
                this.toggleUserMenu();
            }
        });

        // Close user menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.user-menu')) {
                this.closeUserMenu();
            }
        });
    }

    setupRouting() {
        // Handle browser back/forward only
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.route) {
                this.navigateToRoute(e.state.route, false);
            }
        });

        // Set initial route without triggering navigation
        this.currentRoute = 'landing';
        console.log('Basic routing setup complete');
    }

    navigateToRoute(route, updateHistory = true) {
        console.log('Navigating to route:', route);
        this.currentRoute = route;

        if (updateHistory) {
            window.history.pushState({ route }, '', `#${route}`);
        }

        // Clear any existing screen states
        this.clearAllScreens();

        // Show appropriate screen based on route
        switch (route) {
            case 'landing':
                this.showLandingPage();
                break;
            case 'login':
                this.showLoginScreen();
                break;
            case 'signup':
                this.showSignupScreen();
                break;
            case 'dashboard':
                this.showMainApp();
                break;

            case 'ideation':
                this.showIdeationStep();
                break;
            case 'storyboard':
                this.showStoryboardStep();
                break;
            case 'sceneDirection':
                this.showSceneDirectionStep();
                break;
            case 'videoGeneration':
                this.showVideoGenerationStep();
                break;
            case 'testScreening':
                this.showTestScreeningStep();
                break;
            default:
                console.warn('Unknown route:', route);
                this.showLandingPage();
        }
    }

    clearAllScreens() {
        // Hide all main screen containers
        const screens = [
            'landingPage',
            'authScreens', 
            'mainApp',
            'workflowScreens'
        ];
        
        screens.forEach(screenId => {
            const screen = document.getElementById(screenId);
            if (screen) {
                screen.style.display = 'none';
            }
        });
    }

    showLandingPage() {
        console.log('Showing landing page...');
        
        // Clear all screens first
        this.clearAllScreens();
        
        // Show landing page
        document.getElementById('landingPage').style.display = 'block';
        
        this.currentRoute = 'landing';
        console.log('Landing page displayed');
    }

    showAuthScreen(screen) {
        console.log('Showing auth screen:', screen);
        
        // Hide all screens first
        document.getElementById('landingPage').style.display = 'none';
        document.getElementById('mainApp').style.display = 'none';
        document.getElementById('workflowScreens').style.display = 'none';
        
        // Show auth screens container
        document.getElementById('authScreens').style.display = 'block';
        
        // Hide all auth screens
        document.querySelectorAll('.auth-screen').forEach(authScreen => {
            authScreen.style.display = 'none';
        });
        
        // Show the requested screen
        switch (screen) {
            case 'login':
                document.getElementById('loginScreen').style.display = 'block';
                break;
            case 'signup':
                document.getElementById('signupScreen').style.display = 'block';
                break;
            default:
                console.error('Invalid auth screen:', screen);
                return;
        }
        
        this.currentRoute = screen;
        console.log('Auth screen displayed:', screen);
    }

    showLoginScreen() {
        console.log('Showing login screen...');
        
        // Clear all screens first
        this.clearAllScreens();
        
        // Show auth screens container
        document.getElementById('authScreens').style.display = 'block';
        
        // Hide all auth screens first
        document.querySelectorAll('.auth-screen').forEach(authScreen => {
            authScreen.style.display = 'none';
        });
        
        // Show login screen
        document.getElementById('loginScreen').style.display = 'block';
        
        this.currentRoute = 'login';
        console.log('Login screen displayed');
    }

    showSignupScreen() {
        console.log('Showing signup screen...');
        
        // Clear all screens first
        this.clearAllScreens();
        
        // Show auth screens container
        document.getElementById('authScreens').style.display = 'block';
        
        // Hide all auth screens first
        document.querySelectorAll('.auth-screen').forEach(authScreen => {
            authScreen.style.display = 'none';
        });
        
        // Show signup screen
        document.getElementById('signupScreen').style.display = 'block';
        
        this.currentRoute = 'signup';
        console.log('Signup screen displayed');
    }

    showBYOKSetup() {
        // BYOK setup moved to onboarding and workflow options
        // Users can configure their API keys during the creative process
        console.log('BYOK setup available during workflow');
    }

    showMainApp() {
        console.log('Showing main app (dashboard)...');
        
        // Clear all screens first
        this.clearAllScreens();
        
        // Show main app
        document.getElementById('mainApp').style.display = 'block';
        
        // Show home section by default
        this.navigateToSection('home');
        this.loadUserData();
        
        // Initialize dashboard components
        this.initializeDashboard();
        
        this.currentRoute = 'dashboard';
        console.log('Main app (dashboard) displayed');
    }



    showIdeationStep() {
        console.log('Showing ideation step...');
        
        // Clear all screens first
        this.clearAllScreens();
        
        // Show workflow screens
        document.getElementById('workflowScreens').style.display = 'block';
        
        // Show ideation screen
        document.querySelectorAll('.workflow-screen').forEach(screen => {
            screen.style.display = 'none';
        });
        document.getElementById('ideationScreen').style.display = 'block';
        
        this.currentWorkflowStep = 'ideation';
        this.currentRoute = 'ideation';
        this.updateWorkflowProgress(1);
        console.log('Ideation step displayed');
    }

    showStoryboardStep() {
        console.log('Showing storyboard step...');
        
        // Clear all screens first
        this.clearAllScreens();
        
        // Show workflow screens
        document.getElementById('workflowScreens').style.display = 'block';
        
        // Show storyboard screen
        document.querySelectorAll('.workflow-screen').forEach(screen => {
            screen.style.display = 'none';
        });
        document.getElementById('storyboardScreen').style.display = 'block';
        
        this.currentWorkflowStep = 'storyboard';
        this.currentRoute = 'storyboard';
        this.updateWorkflowProgress(2);
        this.generateStoryboard();
        console.log('Storyboard step displayed');
    }

    showSceneDirectionStep() {
        console.log('Showing scene direction step...');
        
        // Clear all screens first
        this.clearAllScreens();
        
        // Show workflow screens
        document.getElementById('workflowScreens').style.display = 'block';
        
        // Show scene direction screen
        document.querySelectorAll('.workflow-screen').forEach(screen => {
            screen.style.display = 'none';
        });
        document.getElementById('sceneDirectionScreen').style.display = 'block';
        
        this.currentWorkflowStep = 'sceneDirection';
        this.currentRoute = 'sceneDirection';
        this.updateWorkflowProgress(3);
        this.generateSceneDirection();
        console.log('Scene direction step displayed');
    }

    showVideoGenerationStep() {
        console.log('Showing video generation step...');
        
        // Clear all screens first
        this.clearAllScreens();
        
        // Show workflow screens
        document.getElementById('workflowScreens').style.display = 'block';
        
        // Show video generation screen
        document.getElementById('videoGenerationScreen').style.display = 'block';
        
        this.currentWorkflowStep = 'videoGeneration';
        this.currentRoute = 'videoGeneration';
        this.updateWorkflowProgress(4);
        this.generateVideoClips();
        console.log('Video generation step displayed');
    }

    showTestScreeningStep() {
        console.log('Showing test screening step...');
        
        // Clear all screens first
        this.clearAllScreens();
        
        // Show workflow screens
        document.getElementById('workflowScreens').style.display = 'block';
        
        // Show test screening screen
        document.getElementById('testScreeningScreen').style.display = 'block';
        
        this.currentWorkflowStep = 'testScreening';
        this.currentRoute = 'testScreening';
        this.updateWorkflowProgress(5);
        console.log('Test screening step displayed');
    }

    navigateToSection(section) {
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(s => {
            s.classList.remove('active');
        });
        
        // Remove active class from all nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show selected section
        const targetSection = document.getElementById(section + 'Section');
        if (targetSection) {
            targetSection.classList.add('active');
        }
        
        // Update nav button state
        const targetBtn = document.querySelector(`[data-section="${section}"]`);
        if (targetBtn) {
            targetBtn.classList.add('active');
        }
    }

    updateWorkflowProgress(step) {
        document.querySelectorAll('.progress-step').forEach((stepEl, index) => {
            if (index + 1 <= step) {
                stepEl.classList.add('active');
            } else {
                stepEl.classList.remove('active');
            }
        });
    }

    async handleLogin() {
        console.log('handleLogin called');
        const email = document.getElementById('loginEmail')?.value;
        const password = document.getElementById('loginPassword')?.value;
        
        console.log('Login attempt:', { email, password: password ? '***' : 'empty' });

        if (!email || !password) {
            this.showNotification('Please fill in all fields', 'error');
            return;
        }

        // Validate email format
        if (!this.isValidEmail(email)) {
            this.showNotification('Please enter a valid email address', 'error');
            return;
        }

        try {
            this.showNotification('Signing you in...', 'info');
            
            // Simulate API call
            const user = await this.authenticateUser(email, password);
            this.setAuthenticatedUser(user);
            
            this.showNotification(`Welcome back, ${user.name}!`, 'success');
            
            // Navigate to dashboard after a short delay
            setTimeout(() => {
                this.navigateToRoute('dashboard');
            }, 1000);
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification('Login failed: ' + error.message, 'error');
        }
    }

    async handleSignup() {
        console.log('handleSignup called');
        const name = document.getElementById('signupName')?.value;
        const email = document.getElementById('signupEmail')?.value;
        const password = document.getElementById('signupPassword')?.value;
        const userType = document.getElementById('userType')?.value;
        
        console.log('Signup attempt:', { name, email, userType, password: password ? '***' : 'empty' });

        if (!name || !email || !password || !userType) {
            this.showNotification('Please fill in all fields', 'error');
            return;
        }

        // Validate email format
        if (!this.isValidEmail(email)) {
            this.showNotification('Please enter a valid email address', 'error');
            return;
        }

        // Validate password strength
        if (password.length < 6) {
            this.showNotification('Password must be at least 6 characters long', 'error');
            return;
        }

        try {
            this.showNotification('Creating your account...', 'info');
            
            // Simulate API call
            const user = await this.createUser({ name, email, password, userType });
            this.setAuthenticatedUser(user);
            
            this.showNotification('Account created successfully! Welcome to SceneFlow AI!', 'success');
            
            // Navigate to dashboard after a short delay
            setTimeout(() => {
                this.navigateToRoute('dashboard');
            }, 1500);
        } catch (error) {
            console.error('Signup error:', error);
            this.showNotification('Signup failed: ' + error.message, 'error');
        }
    }

    async authenticateUser(email, password) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Demo user validation
        if (email === 'demo@sceneflowai.com' && password === 'demo123') {
            return {
                id: 'demo-user-1',
                name: 'Demo User',
                email: 'demo@sceneflowai.com',
                userType: 'filmmaker',
                credits: 1500, // Start with 1500 credits for better demo experience
                monthlyCredits: 1500,
                subscriptionTier: 'free',
                hasBYOK: true,
                projects: [],
                ideas: []
            };
        }
        
        // Simulate other valid users
        if (email === 'test@example.com' && password === 'password') {
            return {
                id: 'test-user-1',
                name: 'Test User',
                email: 'test@example.com',
                userType: 'marketer',
                credits: 25,
                monthlyCredits: 5,
                subscriptionTier: 'creator',
                hasBYOK: false,
                projects: [],
                ideas: []
            };
        }
        
        throw new Error('Invalid email or password');
    }

    async createUser(userData) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if user already exists
        const existingUsers = JSON.parse(localStorage.getItem('users') || '[]');
        if (existingUsers.find(u => u.email === userData.email)) {
            throw new Error('User with this email already exists');
        }
        
        const newUser = {
            id: 'user-' + Date.now(),
            name: userData.name,
            email: userData.email,
            userType: userData.userType,
            credits: 10, // Starting credits
            monthlyCredits: 5,
            subscriptionTier: 'creator',
            hasBYOK: false,
            projects: [],
            ideas: [],
            createdAt: new Date().toISOString()
        };
        
        // Save to localStorage
        existingUsers.push(newUser);
        localStorage.setItem('users', JSON.stringify(existingUsers));
        
        return newUser;
    }

    setAuthenticatedUser(user) {
        console.log('Setting authenticated user:', user);
        this.currentUser = user;
        this.isAuthenticated = true;
        
        // Clear any existing credit system data first
        localStorage.removeItem('creditSystem');
        
        // Initialize credit system for the user with their actual credits
        this.initializeCreditSystem(user);
        
        // Save to localStorage
        localStorage.setItem('currentUser', JSON.stringify(user));
        localStorage.setItem('authToken', 'demo-token-' + Date.now());
        
        // Update UI
        this.updateUIForUser(user);
        
        // Update credits display to show the correct values
        this.updateCreditsDisplay();
        
        console.log('Credit system initialized:', this.creditSystem);
        this.showNotification(`Welcome back, ${user.name}!`, 'success');
    }

    updateUIForUser(user) {
        // Update user display name
        const userDisplayName = document.getElementById('userDisplayName');
        if (userDisplayName) {
            userDisplayName.textContent = user.name;
        }
        
        const userName = document.getElementById('userName');
        if (userName) {
            userName.textContent = user.name;
        }
        
        // Update credits display
        this.updateCreditsDisplay();
        
        // Update subscription info
        this.updateSubscriptionDisplay();
    }

    updateCreditsDisplay() {
        // Ensure credits are synchronized between user and credit system
        if (this.currentUser && this.currentUser.credits !== this.creditSystem.projectCredits) {
            console.log('Syncing credits in updateCreditsDisplay: user has', this.currentUser.credits, 'but credit system shows', this.creditSystem.projectCredits);
            this.creditSystem.projectCredits = this.currentUser.credits;
        }
        
        console.log('Updating credits display:', {
            projectCredits: this.creditSystem.projectCredits,
            userCredits: this.currentUser?.credits,
            monthlyCredits: this.creditSystem.monthlyCredits
        });
        
        const creditsDisplay = document.querySelector('.credits-display .credits-info .credits-count');
        if (creditsDisplay) {
            creditsDisplay.textContent = `${this.creditSystem.projectCredits} Credits`;
        }
        
        // Also update the header credits count
        const headerCreditsCount = document.getElementById('creditsCount');
        if (headerCreditsCount) {
            headerCreditsCount.textContent = `${this.creditSystem.projectCredits} Credits`;
        }
        
        // Update dashboard credit cards
        const dashboardCreditsCount = document.getElementById('dashboardCreditsCount');
        if (dashboardCreditsCount) {
            dashboardCreditsCount.textContent = this.creditSystem.projectCredits;
        }
        
        const dashboardMonthlyCredits = document.getElementById('dashboardMonthlyCredits');
        if (dashboardMonthlyCredits) {
            dashboardMonthlyCredits.textContent = this.creditSystem.monthlyCredits;
        }
        
        const dashboardUsageCount = document.getElementById('dashboardUsageCount');
        if (dashboardUsageCount) {
            const analytics = this.getCreditAnalytics();
            dashboardUsageCount.textContent = analytics.totalUsed;
        }
        
        // Update subscription display
        const subscriptionDisplay = document.querySelector('.subscription-display');
        if (subscriptionDisplay) {
            const tierNames = {
                'free': 'Free',
                'creator': 'Creator',
                'pro': 'Pro',
                'agency': 'Agency'
            };
            subscriptionDisplay.textContent = `${tierNames[this.creditSystem.subscriptionTier]} Plan`;
        }
        
        // Update credit history if modal is open
        const historyList = document.querySelector('.history-list');
        if (historyList) {
            historyList.innerHTML = this.renderCreditHistory();
        }
        
        // Update analytics if modal is open
        const analyticsGrid = document.querySelector('.analytics-grid');
        if (analyticsGrid) {
            const analytics = this.getCreditAnalytics();
            const analyticsCards = analyticsGrid.querySelectorAll('.analytics-card');
            if (analyticsCards.length >= 4) {
                analyticsCards[0].querySelector('.analytics-value').textContent = analytics.totalPurchased;
                analyticsCards[1].querySelector('.analytics-value').textContent = analytics.totalUsed;
                analyticsCards[2].querySelector('.analytics-value').textContent = `$${analytics.totalSpent}`;
                analyticsCards[3].querySelector('.analytics-value').textContent = `${analytics.creditEfficiency}%`;
        }
        }
    }

    // Load credit system data from localStorage
    loadCreditSystem() {
        const savedCreditSystem = localStorage.getItem('creditSystem');
        if (savedCreditSystem) {
            try {
                const parsed = JSON.parse(savedCreditSystem);
                this.creditSystem = { ...this.creditSystem, ...parsed };
                console.log('Loaded credit system from localStorage:', this.creditSystem);
            } catch (error) {
                console.warn('Failed to parse saved credit system:', error);
            }
        }
    }

    // Reset credit system for testing
    resetCreditSystem() {
        console.log('Resetting credit system...');
        localStorage.removeItem('creditSystem');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authToken');
        
        // Re-initialize with current user if available
        if (this.currentUser) {
            this.initializeCreditSystem(this.currentUser);
            this.updateCreditsDisplay();
        }
        
        console.log('Credit system reset complete');
    }

    // Force sync credits between user and credit system
    syncCredits() {
        console.log('Force syncing credits...');
        if (this.currentUser) {
            this.creditSystem.projectCredits = this.currentUser.credits;
            this.creditSystem.monthlyCredits = this.currentUser.monthlyCredits || 0;
            this.updateCreditsDisplay();
            console.log('Credits synced:', this.creditSystem);
        }
    }

    // Initialize credit system for new users
    initializeCreditSystem(user) {
        console.log('Initializing credit system for user:', user);
        
        // Always use the user's actual credits, regardless of subscription tier
        this.creditSystem = {
            projectCredits: user.credits || 0,
            monthlyCredits: user.monthlyCredits || 0,
            subscriptionTier: user.subscriptionTier || 'free',
            creditHistory: [],
            totalSpent: 0,
            lastPurchase: null
        };
        
        console.log('Credit system initialized with:', this.creditSystem);
        
        // Save to localStorage
        localStorage.setItem('creditSystem', JSON.stringify(this.creditSystem));
    }

    updateSubscriptionDisplay() {
        const subscriptionDisplay = document.querySelector('.subscription-display');
        if (subscriptionDisplay) {
            const tierNames = {
                'creator': 'Creator',
                'pro': 'Pro',
                'agency': 'Agency'
            };
            subscriptionDisplay.textContent = `${tierNames[this.creditSystem.subscriptionTier]} Plan`;
        }
    }

    checkCredits(required = 1) {
        console.log('Checking credits:', {
            required: required,
            projectCredits: this.creditSystem.projectCredits,
            userCredits: this.currentUser?.credits,
            creditSystem: this.creditSystem
        });
        
        // Ensure credits are synchronized
        if (this.currentUser && this.currentUser.credits !== this.creditSystem.projectCredits) {
            console.log('Syncing credits: user has', this.currentUser.credits, 'but credit system shows', this.creditSystem.projectCredits);
            this.creditSystem.projectCredits = this.currentUser.credits;
        }
        
        if (this.creditSystem.projectCredits >= required) {
            return true;
        }
        
        this.showInsufficientCreditsModal(required);
        return false;
    }

    consumeCredits(amount = 1, operation = 'General usage', details = {}) {
        if (this.creditSystem.projectCredits >= amount) {
            this.creditSystem.projectCredits -= amount;
            this.currentUser.credits = this.creditSystem.projectCredits;
            
            // Track credit usage
            this.trackCreditUsage(operation, amount, details);
            
            // Update localStorage
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            
            // Update UI
            this.updateCreditsDisplay();
            
            return true;
        } else {
            this.showInsufficientCreditsModal(amount);
        return false;
        }
    }

    showInsufficientCreditsModal(required) {
        const modalContent = `
            <div class="modal-header">
                <h3>Insufficient Credits</h3>
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-content">
                <div class="credits-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>You need ${required} credits to continue this operation.</p>
                    <p>Current credits: ${this.creditSystem.projectCredits}</p>
                    <p>Monthly credits: ${this.creditSystem.monthlyCredits}</p>
                    
                    <div class="credits-actions">
                        <button class="btn-primary" onclick="showCreditsModal()">Purchase Credits</button>
                        <button class="btn-secondary" onclick="upgradeSubscription()">Upgrade Plan</button>
                    </div>
                    
                    <div class="quick-credit-options">
                        <h4>Quick Credit Options</h4>
                        <div class="quick-options-grid">
                            <button class="quick-option" onclick="purchaseCreditPackage('starter', 10, 9.99)">
                                <span class="quick-credits">10 Credits</span>
                                <span class="quick-price">$9.99</span>
                            </button>
                            <button class="quick-option" onclick="purchaseCreditPackage('creator', 30, 24.99)">
                                <span class="quick-credits">30 Credits</span>
                                <span class="quick-price">$24.99</span>
                            </button>
                            <button class="quick-option" onclick="purchaseCreditPackage('pro', 75, 49.99)">
                                <span class="quick-credits">75 Credits</span>
                                <span class="quick-price">$49.99</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.showModal(modalContent);
    }

    purchaseCreditPackage(packageType, credits, price) {
        // Simulate purchase process
        this.showNotification(`Processing ${packageType} package purchase...`, 'info');
        
        setTimeout(() => {
            // Add credits to user account
            this.creditSystem.projectCredits += credits;
            this.currentUser.credits = this.creditSystem.projectCredits;
            
            // Track purchase history
            const purchase = {
                id: Date.now(),
                type: 'package',
                packageType: packageType,
                credits: credits,
                price: price,
                date: new Date().toISOString(),
                status: 'completed'
            };
            
            this.creditSystem.creditHistory.push(purchase);
            this.creditSystem.totalSpent += price;
            this.creditSystem.lastPurchase = purchase;
            
            // Update localStorage
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            localStorage.setItem('creditSystem', JSON.stringify(this.creditSystem));
            
            // Update UI
            this.updateCreditsDisplay();
            
            this.showNotification(`Successfully purchased ${credits} credits for $${price}!`, 'success');
            this.closeModal();
            
            // Show updated credits modal
            setTimeout(() => {
                this.showCreditsModal();
            }, 1000);
        }, 1500);
    }

    // Add credit usage tracking
    trackCreditUsage(operation, creditsUsed, details = {}) {
        const usage = {
            id: Date.now(),
            operation: operation,
            creditsUsed: creditsUsed,
            details: details,
            date: new Date().toISOString(),
            remainingCredits: this.creditSystem.projectCredits
        };
        
        this.creditSystem.creditHistory.push(usage);
        localStorage.setItem('creditSystem', JSON.stringify(this.creditSystem));
    }

    // Get credit analytics
    getCreditAnalytics() {
        const history = this.creditSystem.creditHistory;
        const purchases = history.filter(item => item.type === 'package');
        const usage = history.filter(item => item.type === 'usage');
        
        return {
            totalPurchased: purchases.reduce((sum, item) => sum + item.credits, 0),
            totalUsed: usage.reduce((sum, item) => sum + item.creditsUsed, 0),
            totalSpent: this.creditSystem.totalSpent,
            averageUsagePerDay: this.calculateAverageUsage(),
            mostUsedOperation: this.getMostUsedOperation(),
            creditEfficiency: this.calculateCreditEfficiency()
        };
    }

    calculateAverageUsage() {
        const usage = this.creditSystem.creditHistory.filter(item => item.type === 'usage');
        if (usage.length === 0) return 0;
        
        const totalDays = Math.max(1, Math.ceil((Date.now() - new Date(usage[0].date).getTime()) / (1000 * 60 * 60 * 24)));
        const totalCredits = usage.reduce((sum, item) => sum + item.creditsUsed, 0);
        
        return Math.round((totalCredits / totalDays) * 100) / 100;
    }

    getMostUsedOperation() {
        const usage = this.creditSystem.creditHistory.filter(item => item.type === 'usage');
        if (usage.length === 0) return 'None';
        
        const operationCounts = {};
        usage.forEach(item => {
            operationCounts[item.operation] = (operationCounts[item.operation] || 0) + 1;
        });
        
        return Object.keys(operationCounts).reduce((a, b) => 
            operationCounts[a] > operationCounts[b] ? a : b
        );
    }

    calculateCreditEfficiency() {
        const analytics = this.getCreditAnalytics();
        if (analytics.totalPurchased === 0) return 0;
        
        return Math.round((analytics.totalUsed / analytics.totalPurchased) * 100);
    }

    // Enhanced credits modal with analytics
    showCreditsModal() {
        const analytics = this.getCreditAnalytics();
        const modalContent = `
            <div class="modal-header">
                <h3>Manage Your Credits</h3>
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-content">
                <div class="credits-overview">
                    <div class="current-credits">
                        <h4>Current Credits</h4>
                        <div class="credits-display">
                            <div class="credit-item">
                                <i class="fas fa-coins"></i>
                                <span class="credit-label">Project Credits</span>
                                <span class="credit-value">${this.creditSystem.projectCredits}</span>
                            </div>
                            <div class="credit-item">
                                <i class="fas fa-calendar"></i>
                                <span class="credit-label">Monthly Credits</span>
                                <span class="credit-value">${this.creditSystem.monthlyCredits}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="credits-analytics">
                        <h4>Credit Analytics</h4>
                        <div class="analytics-grid">
                            <div class="analytics-card">
                                <i class="fas fa-chart-line"></i>
                                <div class="analytics-info">
                                    <span class="analytics-label">Total Purchased</span>
                                    <span class="analytics-value">${analytics.totalPurchased}</span>
                                </div>
                            </div>
                            <div class="analytics-card">
                                <i class="fas fa-chart-bar"></i>
                                <div class="analytics-info">
                                    <span class="analytics-label">Total Used</span>
                                    <span class="analytics-value">${analytics.totalUsed}</span>
                                </div>
                            </div>
                            <div class="analytics-card">
                                <i class="fas fa-dollar-sign"></i>
                                <div class="analytics-info">
                                    <span class="analytics-label">Total Spent</span>
                                    <span class="analytics-value">$${analytics.totalSpent}</span>
                                </div>
                            </div>
                            <div class="analytics-card">
                                <i class="fas fa-percentage"></i>
                                <div class="analytics-info">
                                    <span class="analytics-label">Efficiency</span>
                                    <span class="analytics-value">${analytics.creditEfficiency}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="credit-packages">
                        <h4>Purchase Credit Packages</h4>
                        <div class="package-grid">
                            <div class="package-card">
                                <div class="package-header">
                                    <h5>Starter Pack</h5>
                                    <div class="package-price">$9.99</div>
                                </div>
                                <div class="package-credits">10 Credits</div>
                                <ul class="package-features">
                                    <li>Standard quality videos</li>
                                    <li>Basic AI assistance</li>
                                    <li>Email support</li>
                                </ul>
                                <button class="btn-primary" onclick="purchaseCreditPackage('starter', 10, 9.99)">
                                    Purchase
                                </button>
                            </div>
                            
                            <div class="package-card featured">
                                <div class="popular-badge">Most Popular</div>
                                <div class="package-header">
                                    <h5>Creator Pack</h5>
                                    <div class="package-price">$24.99</div>
                                </div>
                                <div class="package-credits">30 Credits</div>
                                <ul class="package-features">
                                    <li>HD quality videos</li>
                                    <li>Advanced AI features</li>
                                    <li>Priority support</li>
                                    <li>Save 17%</li>
                                </ul>
                                <button class="btn-primary" onclick="purchaseCreditPackage('creator', 30, 24.99)">
                                    Purchase
                                </button>
                            </div>
                            
                            <div class="package-card">
                                <div class="package-header">
                                    <h5>Pro Pack</h5>
                                    <div class="package-price">$49.99</div>
                                </div>
                                <div class="package-credits">75 Credits</div>
                                <ul class="package-features">
                                    <li>4K quality videos</li>
                                    <li>Premium AI features</li>
                                    <li>24/7 support</li>
                                    <li>Save 33%</li>
                                </ul>
                                <button class="btn-primary" onclick="purchaseCreditPackage('pro', 75, 49.99)">
                                    Purchase
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="subscription-upgrade">
                        <h4>Upgrade Your Plan</h4>
                        <p>Get more credits monthly with a subscription plan</p>
                        <div class="plan-options">
                            <div class="plan-option">
                                <h5>Creator Plan - $29/month</h5>
                                <p>5 credits monthly + 5 bonus credits</p>
                                <button class="btn-secondary" onclick="upgradeToPlan('creator')">Upgrade</button>
                            </div>
                            <div class="plan-option">
                                <h5>Pro Plan - $59/month</h5>
                                <p>15 credits monthly + 10 bonus credits</p>
                                <button class="btn-secondary" onclick="upgradeToPlan('pro')">Upgrade</button>
                            </div>
                            <div class="plan-option">
                                <h5>Agency Plan - $149/month</h5>
                                <p>50 credits monthly + 25 bonus credits</p>
                                <button class="btn-secondary" onclick="upgradeToPlan('agency')">Upgrade</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="credit-history">
                        <h4>Recent Credit Activity</h4>
                        <div class="history-list">
                            ${this.renderCreditHistory()}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.showModal(modalContent);
    }

    // Render credit history
    renderCreditHistory() {
        const recentHistory = this.creditSystem.creditHistory
            .slice(-5)
            .reverse()
            .map(item => {
                if (item.type === 'package') {
                    return `
                        <div class="history-item purchase">
                            <i class="fas fa-plus-circle"></i>
                            <div class="history-details">
                                <span class="history-action">Purchased ${item.credits} credits</span>
                                <span class="history-date">${new Date(item.date).toLocaleDateString()}</span>
                            </div>
                            <span class="history-amount">+${item.credits}</span>
                        </div>
                    `;
                } else {
                    return `
                        <div class="history-item usage">
                            <i class="fas fa-minus-circle"></i>
                            <div class="history-details">
                                <span class="history-action">${item.operation}</span>
                                <span class="history-date">${new Date(item.date).toLocaleDateString()}</span>
                            </div>
                            <span class="history-amount">-${item.creditsUsed}</span>
                        </div>
                    `;
                }
            })
            .join('');
        
        return recentHistory || '<p class="no-history">No recent activity</p>';
    }

    upgradeToPlan(planType) {
        // Simulate plan upgrade process
        this.showNotification(`Upgrading to ${planType} plan...`, 'info');
        
        setTimeout(() => {
            // Update subscription tier
            this.creditSystem.subscriptionTier = planType;
            this.currentUser.subscriptionTier = planType;
            
            // Set monthly credits based on plan
            const monthlyCredits = {
                'creator': 5,
                'pro': 15,
                'agency': 50
            };
            
            this.creditSystem.monthlyCredits = monthlyCredits[planType];
            this.currentUser.monthlyCredits = monthlyCredits[planType];
            
            // Add bonus credits
            const bonusCredits = {
                'creator': 5,
                'pro': 10,
                'agency': 25
            };
            
            this.creditSystem.projectCredits += bonusCredits[planType];
            this.currentUser.credits = this.creditSystem.projectCredits;
            
            // Track upgrade in history
            const upgrade = {
                id: Date.now(),
                type: 'upgrade',
                planType: planType,
                bonusCredits: bonusCredits[planType],
                date: new Date().toISOString(),
                status: 'completed'
            };
            
            this.creditSystem.creditHistory.push(upgrade);
            
            // Update localStorage
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            localStorage.setItem('creditSystem', JSON.stringify(this.creditSystem));
            
            // Update UI
            this.updateCreditsDisplay();
            this.updateSubscriptionDisplay();
            
            this.showNotification(`Successfully upgraded to ${planType} plan!`, 'success');
            this.closeModal();
            
            // Show updated credits modal
            setTimeout(() => {
                this.showCreditsModal();
            }, 1000);
        }, 1500);
    }

    loadUserData() {
        if (!this.currentUser) return;
        
        this.loadProjects();
        this.loadIdeas();
    }

    loadProjects() {
        // Simulate loading projects
        const projects = this.currentUser.projects || [];
        this.renderProjects(projects);
    }

    loadIdeas() {
        // Simulate loading ideas
        const ideas = this.currentUser.ideas || [];
        this.renderIdeas(ideas);
    }

    renderProjects(projects) {
        const projectsGrid = document.getElementById('recentProjectsGrid');
        const projectsGridMain = document.getElementById('projectsGrid');
        
        if (!projectsGrid && !projectsGridMain) return;
        
        const projectsToRender = projects.slice(0, 6); // Show max 6 projects
        
        const projectHTML = projectsToRender.length > 0 ? projectsToRender.map(project => `
            <div class="project-card" onclick="openProject('${project.id}')">
                <div class="project-header">
                    <h4>${project.title}</h4>
                    <span class="project-status ${project.status}">${project.status}</span>
                </div>
                <p>${project.description}</p>
                <div class="project-meta">
                    <span class="project-date">${new Date(project.updatedAt).toLocaleDateString()}</span>
                    <span class="project-credits">${project.creditsUsed} credits</span>
                </div>
            </div>
        `).join('') : `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <h4>No projects yet</h4>
                <p>Start creating your first video project!</p>
                <button class="btn-primary" onclick="startNewProject()">Create Project</button>
            </div>
        `;
        
        if (projectsGrid) projectsGrid.innerHTML = projectHTML;
        if (projectsGridMain) projectsGridMain.innerHTML = projectHTML;
    }

    renderIdeas(ideas) {
        const ideasGrid = document.getElementById('ideasGrid');
        if (!ideasGrid) return;
        
        const ideasHTML = ideas.length > 0 ? ideas.map(idea => `
            <div class="idea-card" onclick="openIdea('${idea.id}')">
                <div class="idea-header">
                    <h4>${idea.title}</h4>
                    <span class="idea-category">${idea.category}</span>
                </div>
                <p>${idea.description}</p>
                <div class="idea-meta">
                    <span class="idea-date">${new Date(idea.createdAt).toLocaleDateString()}</span>
                    <span class="idea-status">${idea.status}</span>
                </div>
            </div>
        `).join('') : `
            <div class="empty-state">
                <i class="fas fa-lightbulb"></i>
                <h4>No ideas saved yet</h4>
                <p>Start brainstorming and save your creative ideas!</p>
                <button class="btn-primary" onclick="startNewProject()">Start Ideation</button>
            </div>
        `;
        
        ideasGrid.innerHTML = ideasHTML;
    }

    startNewProject() {
        // Check if user has credits
        if (!this.checkCredits(1)) {
            return;
        }
        
        this.navigateToRoute('ideation');
    }

    continueProject() {
        // Show project selection modal
        this.showProjectSelectionModal();
    }

    browseIdeas() {
        this.navigateToSection('ideas');
    }

    openProject(projectId) {
        // Load project and show workflow
        console.log('Opening project:', projectId);
        this.showNotification('Project loading...', 'info');
    }

    openIdea(ideaId) {
        // Load idea and show ideation step
        console.log('Opening idea:', ideaId);
        this.showNotification('Idea loading...', 'info');
    }

    showProjectSelectionModal() {
        const modal = document.getElementById('modal');
        const modalOverlay = document.getElementById('modalOverlay');
        
        modal.innerHTML = `
            <div class="modal-header">
                <h3>Continue Project</h3>
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-content">
                <p>Select a project to continue:</p>
                <div class="project-list">
                    ${this.currentUser.projects.length > 0 ? 
                        this.currentUser.projects.map(project => `
                            <div class="project-item" onclick="continueProjectById('${project.id}')">
                                <h4>${project.title}</h4>
                                <p>${project.description}</p>
                                <span class="project-status ${project.status}">${project.status}</span>
                            </div>
                        `).join('') : 
                        '<p>No projects found. Start a new one!</p>'
                    }
                </div>
            </div>
        `;
        
        modalOverlay.style.display = 'block';
    }

    showModal(content) {
        const modal = document.getElementById('modal');
        const modalOverlay = document.getElementById('modalOverlay');
        
        modal.innerHTML = content;
        modalOverlay.style.display = 'block';
    }

    closeModal() {
        const modalOverlay = document.getElementById('modalOverlay');
        modalOverlay.style.display = 'none';
    }

    toggleUserMenu() {
        const dropdown = document.getElementById('userDropdown');
        dropdown.classList.toggle('show');
    }

    closeUserMenu() {
        const dropdown = document.getElementById('userDropdown');
        dropdown.classList.remove('show');
    }

    showProfile() {
        this.showModal(`
            <div class="modal-header">
                <h3>User Profile</h3>
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-content">
                <div class="profile-info">
                    <h4>${this.currentUser.name}</h4>
                    <p><strong>Email:</strong> ${this.currentUser.email}</p>
                    <p><strong>Role:</strong> ${this.currentUser.userType}</p>
                    <p><strong>Subscription:</strong> ${this.creditSystem.subscriptionTier.charAt(0).toUpperCase() + this.creditSystem.subscriptionTier.slice(1)}</p>
                    <p><strong>Project Credits:</strong> ${this.creditSystem.projectCredits}</p>
                    <p><strong>Monthly Credits:</strong> ${this.creditSystem.monthlyCredits}</p>
                    <p><strong>BYOK Status:</strong> ${this.currentUser.hasBYOK ? 'Enabled' : 'Disabled'}</p>
                    <p><strong>Member since:</strong> ${new Date(this.currentUser.createdAt || Date.now()).toLocaleDateString()}</p>
                </div>
            </div>
        `);
    }

    showSettings() {
        this.showModal(`
            <div class="modal-header">
                <h3>Settings</h3>
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-content">
                <div class="settings-panel">
                    <h4>API Configuration</h4>
                    <div class="setting-item">
                        <label>Gemini API Key</label>
                        <input type="password" id="geminiKeySetting" value="${localStorage.getItem('geminiApiKey') || ''}" placeholder="Enter your API key">
                        <button class="btn-primary btn-small" onclick="updateApiKey()">Update</button>
                    </div>
                    
                    <h4>Preferences</h4>
                    <div class="setting-item">
                        <label>Default Video Resolution</label>
                        <select id="defaultResolution">
                            <option value="1080p">1080p</option>
                            <option value="4k">4K</option>
                        </select>
                    </div>
                    
                    <div class="setting-item">
                        <label>Default Frame Rate</label>
                        <select id="defaultFrameRate">
                            <option value="24">24 fps</option>
                            <option value="30">30 fps</option>
                            <option value="60">60 fps</option>
                        </select>
                    </div>
                </div>
            </div>
        `);
    }

    showBilling() {
        this.showModal(`
            <div class="modal-header">
                <h3>Billing & Credits</h3>
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-content">
                <div class="billing-info">
                    <h4>Current Plan: ${this.creditSystem.subscriptionTier.charAt(0).toUpperCase() + this.creditSystem.subscriptionTier.slice(1)}</h4>
                    <p><strong>Available Credits:</strong> ${this.creditSystem.projectCredits}</p>
                    <p><strong>Monthly Credits:</strong> ${this.creditSystem.monthlyCredits}</p>
                    
                    <div class="subscription-tiers">
                        <div class="tier-card ${this.creditSystem.subscriptionTier === 'creator' ? 'active' : ''}">
                            <h5>Creator</h5>
                            <p class="price">$29/month</p>
                            <ul>
                                <li>5 Project Credits/month</li>
                                <li>Standard video generation</li>
                                <li>Basic Test Screening</li>
                            </ul>
                            <button class="btn-primary" onclick="upgradeToTier('creator')">Current Plan</button>
                        </div>
                        
                        <div class="tier-card ${this.creditSystem.subscriptionTier === 'pro' ? 'active' : ''}">
                            <h5>Pro</h5>
                            <p class="price">$59/month</p>
                            <ul>
                                <li>15 Project Credits/month</li>
                                <li>4K video generation</li>
                                <li>Advanced Test Screening</li>
                                <li>Team collaboration</li>
                            </ul>
                            <button class="btn-primary" onclick="upgradeToTier('pro')">${this.creditSystem.subscriptionTier === 'pro' ? 'Current Plan' : 'Upgrade'}</button>
                        </div>
                        
                        <div class="tier-card ${this.creditSystem.subscriptionTier === 'agency' ? 'active' : ''}">
                            <h5>Agency</h5>
                            <p class="price">$149/month</p>
                            <ul>
                                <li>50 Project Credits/month</li>
                                <li>All Pro features</li>
                                <li>Priority support</li>
                                <li>Team management</li>
                            </ul>
                            <button class="btn-primary" onclick="upgradeToTier('agency')">${this.creditSystem.subscriptionTier === 'agency' ? 'Current Plan' : 'Upgrade'}</button>
                        </div>
                    </div>
                    
                    <div class="credit-packages">
                        <h4>Purchase Additional Credits</h4>
                        <div class="credit-options">
                            <button class="credit-option" onclick="purchaseCreditPack(5)">
                                <span class="credit-amount">5 Credits</span>
                                <span class="credit-price">$9.99</span>
                            </button>
                            <button class="credit-option" onclick="purchaseCreditPack(15)">
                                <span class="credit-amount">15 Credits</span>
                                <span class="credit-price">$24.99</span>
                            </button>
                            <button class="credit-option" onclick="purchaseCreditPack(50)">
                                <span class="credit-amount">50 Credits</span>
                                <span class="credit-price">$69.99</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `);
    }

    logout() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.currentRoute = 'landing';
        this.creditSystem = {
            projectCredits: 0,
            monthlyCredits: 0,
            subscriptionTier: 'free'
        };
        
        // Clear localStorage
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authToken');
        
        // Navigate to landing
        this.navigateToRoute('landing');
        
        this.showNotification('Successfully logged out', 'success');
    }

    showBYOKSetup() {
        this.navigateToRoute('byok');
    }

    setupBYOK() {
        const apiKey = document.getElementById('geminiKey').value;
        if (!apiKey) {
            this.showNotification('Please enter your API key', 'error');
            return;
        }
        
        // Validate API key format (basic validation)
        if (!this.validateGeminiKey(apiKey)) {
            this.showNotification('Invalid API key format', 'error');
            return;
        }
        
        // Save API key (in real app, this would be encrypted)
        localStorage.setItem('geminiApiKey', apiKey);
        
        // Update user BYOK status
        this.currentUser.hasBYOK = true;
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        
        this.showNotification('API key configured successfully!', 'success');
        
        // Navigate to dashboard
        setTimeout(() => {
            this.navigateToRoute('dashboard');
        }, 1500);
    }

    validateGeminiKey(apiKey) {
        // Basic validation - in real app, this would test the key with Gemini API
        return apiKey.length > 20 && apiKey.startsWith('AIza');
    }

    skipBYOK() {
        this.currentUser.hasBYOK = false;
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        
        this.showNotification('You can set up your API key later in settings', 'info');
        
        // Navigate to dashboard
        setTimeout(() => {
            this.navigateToRoute('dashboard');
        }, 1500);
    }

    checkAuthentication() {
        // Simple authentication check without redirects
        const token = localStorage.getItem('authToken');
        const user = localStorage.getItem('currentUser');
        
        if (token && user) {
            try {
                this.currentUser = JSON.parse(user);
                this.isAuthenticated = true;
                
                // Set up credit system
                this.creditSystem = {
                    projectCredits: this.currentUser.credits,
                    monthlyCredits: this.currentUser.monthlyCredits,
                    subscriptionTier: this.currentUser.subscriptionTier
                };
                
                this.updateUIForUser(this.currentUser);
                console.log('User authenticated:', this.currentUser.name);
            } catch (error) {
                console.error('Error parsing stored user data:', error);
                this.clearAuth();
            }
        } else {
            console.log('No authentication found - user can browse landing page');
        }
    }

    clearAuth() {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authToken');
        this.currentUser = null;
        this.isAuthenticated = false;
        this.creditSystem = {
            projectCredits: 0,
            monthlyCredits: 0,
            subscriptionTier: 'free'
        };
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
            </div>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful');
                })
                .catch(error => {
                    console.log('ServiceWorker registration failed:', error);
                });
        }
    }

    // Workflow step methods
    generateStoryboard() {
        if (!this.currentUser.hasBYOK) {
            this.showNotification('BYOK required for storyboard generation', 'error');
            return;
        }
        
        this.showNotification('Generating storyboard...', 'info');
        // Storyboard generation logic will be implemented
    }

    generateSceneDirection() {
        this.showNotification('Generating scene direction...', 'info');
        // Scene direction generation logic will be implemented
    }

    generateVideoClips() {
        if (!this.currentUser.hasBYOK) {
            this.showNotification('BYOK required for video generation', 'error');
            return;
        }
        
        this.showNotification('Generating video clips...', 'info');
        // Video generation logic will be implemented
    }

    // Track credit usage for AI operations
    async generateAIVideo(prompt, settings = {}) {
        const requiredCredits = settings.quality === '4k' ? 3 : 1;
        
        if (!this.consumeCredits(requiredCredits, 'AI Video Generation', { prompt, settings })) {
            return false;
        }
        
        // Continue with video generation...
        this.showNotification(`Generating AI video (${requiredCredits} credit${requiredCredits > 1 ? 's' : ''} used)...`, 'info');
        
        // Simulate video generation
        setTimeout(() => {
            this.showNotification('AI video generated successfully!', 'success');
        }, 3000);
        
        return true;
    }

    async createAIScene(prompt, settings = {}) {
        const requiredCredits = 1;
        
        if (!this.consumeCredits(requiredCredits, 'AI Scene Creation', { prompt, settings })) {
            return false;
        }
        
        // Continue with scene creation...
        this.showNotification(`Creating AI scene (${requiredCredits} credit used)...`, 'info');
        
        // Simulate scene creation
        setTimeout(() => {
            this.showNotification('AI scene created successfully!', 'success');
        }, 2000);
        
        return true;
    }

    async generateAIStoryboard(prompt, settings = {}) {
        const requiredCredits = settings.panels > 6 ? 2 : 1;
        
        if (!this.consumeCredits(requiredCredits, 'AI Storyboard Generation', { prompt, settings })) {
            return false;
        }
        
        // Continue with storyboard generation...
        this.showNotification(`Generating AI storyboard (${requiredCredits} credit${requiredCredits > 1 ? 's' : ''} used)...`, 'info');
        
        // Simulate storyboard generation
        setTimeout(() => {
            this.showNotification('AI storyboard generated successfully!', 'success');
        }, 2500);
        
        return true;
    }

    // Reset monthly credits (called monthly or when subscription renews)
    resetMonthlyCredits() {
        const monthlyCredits = {
            'free': 5,
            'creator': 5,
            'pro': 15,
            'agency': 50
        };
        
        this.creditSystem.monthlyCredits = monthlyCredits[this.creditSystem.subscriptionTier];
        this.currentUser.monthlyCredits = this.creditSystem.monthlyCredits;
        
        // Track the reset
        const reset = {
            id: Date.now(),
            type: 'monthly_reset',
            credits: this.creditSystem.monthlyCredits,
            date: new Date().toISOString(),
            status: 'completed'
        };
        
        this.creditSystem.creditHistory.push(reset);
        
        // Update localStorage
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        localStorage.setItem('creditSystem', JSON.stringify(this.creditSystem));
        
        // Update UI
        this.updateCreditsDisplay();
        
        this.showNotification(`Monthly credits refreshed! You now have ${this.creditSystem.monthlyCredits} monthly credits.`, 'success');
    }

    // Check if monthly credits need to be reset (based on last reset date)
    checkMonthlyCreditReset() {
        const lastReset = this.creditSystem.creditHistory
            .filter(item => item.type === 'monthly_reset')
            .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        
        if (!lastReset) {
            // First time user, set initial monthly credits
            this.resetMonthlyCredits();
            return;
        }
        
        const lastResetDate = new Date(lastReset.date);
        const now = new Date();
        const daysSinceReset = Math.floor((now - lastResetDate) / (1000 * 60 * 60 * 24));
        
        // Reset if more than 30 days have passed
        if (daysSinceReset >= 30) {
            this.resetMonthlyCredits();
        }
    }

    // Get credit recommendations based on usage
    getCreditRecommendations() {
        const analytics = this.getCreditAnalytics();
        const recommendations = [];
        
        if (analytics.averageUsagePerDay > 2) {
            recommendations.push({
                type: 'upgrade',
                message: 'High daily usage detected. Consider upgrading to a higher plan for more monthly credits.',
                action: 'upgrade'
            });
        }
        
        if (analytics.creditEfficiency < 50) {
            recommendations.push({
                type: 'efficiency',
                message: 'Low credit efficiency. Review your usage patterns to optimize credit consumption.',
                action: 'analyze'
            });
        }
        
        if (this.creditSystem.projectCredits < 5) {
            recommendations.push({
                type: 'low_credits',
                message: 'Low credit balance. Purchase a credit package to continue using AI features.',
                action: 'purchase'
            });
        }
        
        return recommendations;
    }

    initializeApp() {
        console.log('SceneFlow AI initializeApp called');
        try {
            this.loadUserData();
            this.setupEventListeners();
            this.checkMonthlyCreditReset(); // Check if monthly credits need reset
            this.showLandingPage();
            console.log('SceneFlow AI app initialized successfully');
        } catch (error) {
            console.error('Error initializing SceneFlow AI app:', error);
        }
    }

    // Check if the app is ready
    isReady() {
        return this.currentUser !== null || this.isAuthenticated !== undefined;
    }

    initializeDashboard() {
        console.log('Initializing dashboard components...');
        
        // Load recent projects for Project Hub
        this.loadRecentProjects();
        
        // Update Continue Project button state
        this.updateContinueProjectButton();
        
        // Update credit status display
        this.updateCreditStatus();
    }

    loadRecentProjects() {
        const projectHubContent = document.getElementById('projectHubContent');
        if (!projectHubContent) return;
        
        const user = this.getCurrentUser();
        if (!user || !user.projects || user.projects.length === 0) {
            // Show empty state
            projectHubContent.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-film"></i>
                    <p>No projects yet. Start your first video project!</p>
                    <button class="btn-primary" onclick="startNewProject()">
                        <i class="fas fa-plus"></i>
                        Create Project
                    </button>
            </div>
            `;
        } else {
            // Show recent projects
            const recentProjects = user.projects.slice(0, 3); // Show last 3 projects
            projectHubContent.innerHTML = `
                <div class="projects-list">
                    ${recentProjects.map(project => `
                        <div class="project-item">
                            <div class="project-info">
                                <h4>${project.title}</h4>
                                <p>Stage: ${project.currentStage || 'Planning'}</p>
                                <span class="project-date">${new Date(project.lastModified).toLocaleDateString()}</span>
                            </div>
                            <button class="btn-secondary btn-small" onclick="continueProject('${project.id}')">
                                Continue
                            </button>
                        </div>
                    `).join('')}
                            </div>
            `;
        }
    }

    updateContinueProjectButton() {
        const continueBtn = document.getElementById('continueProjectBtn');
        const continueDesc = document.getElementById('continueProjectDesc');
        
        if (!continueBtn || !continueDesc) return;
        
        const user = this.getCurrentUser();
        if (!user || !user.projects || user.projects.length === 0) {
            // No projects - disable button
            continueBtn.disabled = true;
            continueDesc.textContent = 'No active projects';
            continueBtn.style.opacity = '0.5';
        } else {
            // Has projects - enable button and show latest
            const latestProject = user.projects[user.projects.length - 1];
            continueBtn.disabled = false;
            continueDesc.textContent = `${latestProject.title} - ${latestProject.currentStage || 'Planning'}`;
            continueBtn.style.opacity = '1';
        }
    }

    updateCreditStatus() {
        // Update credit display values
        const creditsCount = document.getElementById('dashboardCreditsCount');
        const monthlyCredits = document.getElementById('dashboardMonthlyCredits');
        const usageCount = document.getElementById('dashboardUsageCount');
        
        if (creditsCount) {
            creditsCount.textContent = this.creditSystem.projectCredits;
        }
        if (monthlyCredits) {
            monthlyCredits.textContent = this.creditSystem.monthlyCredits;
        }
        if (usageCount) {
            usageCount.textContent = this.creditSystem.analytics.totalUsed;
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
            console.log('DOM Content Loaded, initializing SceneFlow AI...');
    updateAppStatus('Initializing...', 'loading');
    
    // Show loading screen
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.style.display = 'block';
        console.log('Loading screen shown');
    } else {
        console.warn('Loading screen not found');
    }
    
    try {
        // Create SceneFlow AI instance
        console.log('Creating SceneFlow AI instance...');
        updateAppStatus('Creating app...', 'loading');
        window.sceneFlowAI = new SceneFlowAI();
        console.log('SceneFlow AI instance created successfully:', window.sceneFlowAI);
        
        // Initialize the app immediately
        console.log('Initializing SceneFlow AI app...');
        updateAppStatus('Setting up app...', 'loading');
        window.sceneFlowAI.initializeApp();
        
        // Hide loading screen after a short delay to ensure everything is ready
        setTimeout(() => {
            if (loadingScreen) {
                loadingScreen.style.display = 'none';
                console.log('Loading screen hidden');
            }
            console.log('SceneFlow AI app is ready!');
            updateAppStatus('Ready!', 'ready');
            console.log('Global functions available:', {
                showAuth: typeof showAuth,
                handleLogin: typeof handleLogin,
                handleSignup: typeof handleSignup
            });
        }, 1000);
        
    } catch (error) {
        console.error('Failed to create SceneFlow AI instance:', error);
        updateAppStatus('Error!', 'error');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
        // Show error message to user
        alert('Failed to initialize the app. Please refresh the page and try again.');
    }
});

// Check if app is ready
function isAppReady() {
    return window.sceneFlowAI && window.sceneFlowAI.isReady && window.sceneFlowAI.isReady();
}

// Wait for app to be ready
function waitForApp(callback, maxWait = 5000) {
    if (isAppReady()) {
        callback();
        return;
    }
    
    let waitTime = 0;
    const checkInterval = setInterval(() => {
        waitTime += 100;
        if (isAppReady()) {
            clearInterval(checkInterval);
            callback();
        } else if (waitTime >= maxWait) {
            clearInterval(checkInterval);
            console.error('App failed to initialize within timeout');
            callback(); // Call anyway, let the function handle the error
        }
    }, 100);
}

// Global functions for HTML onclick handlers
function showAuth(screen) {
    console.log('showAuth called with screen:', screen);
    
    // Wait for app to be ready
    waitForApp(() => {
        if (window.sceneFlowAI && window.sceneFlowAI.navigateToRoute) {
            console.log('Calling navigateToRoute with:', screen);
            window.sceneFlowAI.navigateToRoute(screen);
        } else {
            console.error('SceneFlow AI not properly initialized');
            // Fallback: show the auth screen directly
            if (screen === 'login' || screen === 'signup') {
                console.log('Showing auth screen directly:', screen);
                const authScreens = document.getElementById('authScreens');
                const landingPage = document.getElementById('landingPage');
                const targetScreen = document.getElementById(screen + 'Screen');
                
                if (authScreens && landingPage && targetScreen) {
                    // Hide landing page
                    landingPage.style.display = 'none';
                    
                    // Show auth screens container
                    authScreens.style.display = 'block';
                    
                    // Hide all auth screens first
                    document.querySelectorAll('.auth-screen').forEach(authScreen => {
                        authScreen.style.display = 'none';
                    });
                    
                    // Show target screen
                    targetScreen.style.display = 'block';
                } else {
                    console.error('Auth screen elements not found');
                    alert('Authentication screen not found. Please refresh the page.');
                }
            }
        }
    });
}

function handleLogin(event) {
    console.log('Global handleLogin called');
    event.preventDefault();
    if (window.sceneFlowAI) {
        console.log('SceneFlow AI instance found, calling handleLogin');
        window.sceneFlowAI.handleLogin();
    } else {
        console.error('SceneFlow AI instance not found!');
        // Fallback: show error message
        alert('App is still loading. Please wait a moment and try again.');
    }
}

function handleSignup(event) {
    console.log('Global handleSignup called');
    event.preventDefault();
    if (window.sceneFlowAI) {
        console.log('SceneFlow AI instance found, calling handleSignup');
        window.sceneFlowAI.handleSignup();
    } else {
        console.error('SceneFlow AI instance not found!');
        // Fallback: show error message
        alert('App is still loading. Please wait a moment and try again.');
    }
}

function closeModal() {
    if (window.sceneFlowAI) {
        window.sceneFlowAI.closeModal();
    } else {
        // Fallback: hide any visible modals
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(modal => modal.style.display = 'none');
    }
}

function showCreditsModal() {
    if (window.sceneFlowAI) {
        window.sceneFlowAI.showCreditsModal();
    } else {
        alert('App is still loading. Please wait a moment and try again.');
    }
}

function purchaseCreditPackage(packageType, credits, price) {
    if (window.sceneFlowAI) {
        window.sceneFlowAI.purchaseCreditPackage(packageType, credits, price);
    } else {
        alert('App is still loading. Please wait a moment and try again.');
    }
}

function upgradeToPlan(planType) {
    if (window.sceneFlowAI) {
        window.sceneFlowAI.upgradeToPlan(planType);
    } else {
        alert('App is still loading. Please wait a moment and try again.');
    }
}

function upgradeSubscription() {
    if (window.sceneFlowAI) {
        window.sceneFlowAI.showBilling();
        window.sceneFlowAI.closeModal();
    } else {
        alert('App is still loading. Please wait a moment and try again.');
    }
}

function startNewProject() {
    if (window.sceneFlowAI) {
        window.sceneFlowAI.startNewProject();
    } else {
        alert('App is still loading. Please wait a moment and try again.');
    }
}

function continueProject() {
    if (window.sceneFlowAI) {
        window.sceneFlowAI.continueProject();
    } else {
        alert('App is still loading. Please wait a moment and try again.');
    }
}

function browseIdeas() {
    if (window.sceneFlowAI) {
        window.sceneFlowAI.browseIdeas();
    } else {
        alert('App is still loading. Please wait a moment and try again.');
    }
}

function openProject(projectId) {
    if (window.sceneFlowAI) {
        window.sceneFlowAI.openProject(projectId);
    } else {
        alert('App is still loading. Please wait a moment and try again.');
    }
}

function openIdea(ideaId) {
    if (window.sceneFlowAI) {
        window.sceneFlowAI.openIdea(ideaId);
    } else {
        alert('App is still loading. Please wait a moment and try again.');
    }
}

function showProfile() {
    if (window.sceneFlowAI) {
        window.sceneFlowAI.showProfile();
    } else {
        alert('App is still loading. Please wait a moment and try again.');
    }
}

function showSettings() {
    if (window.sceneFlowAI) {
        window.sceneFlowAI.showSettings();
    } else {
        alert('App is still loading. Please wait a moment and try again.');
    }
}

function showBilling() {
    if (window.sceneFlowAI) {
        window.sceneFlowAI.showBilling();
    } else {
        alert('App is still loading. Please wait a moment and try again.');
    }
}

function logout() {
    if (window.sceneFlowAI) {
        window.sceneFlowAI.logout();
    } else {
        alert('App is still loading. Please wait a moment and try again.');
    }
}

function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

function closeUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.remove('show');
    }
}

// Update app status indicator
function updateAppStatus(status, type = 'info') {
    const statusElement = document.getElementById('statusText');
    const statusContainer = document.getElementById('appStatus');
    
    if (statusElement && statusContainer) {
        statusElement.textContent = status;
        
        // Update colors based on type
        const colors = {
            'loading': '#f0f0f0',
            'ready': '#d4edda',
            'error': '#f8d7da',
            'info': '#d1ecf1'
        };
        
        statusContainer.style.background = colors[type] || colors.info;
    }
}

// Test function for debugging
function testSignIn() {
    console.log('=== Testing Sign-In Functionality ===');
    console.log('SceneFlow AI instance:', window.sceneFlowAI);
    console.log('showAuth function:', typeof showAuth);
    console.log('handleLogin function:', typeof handleLogin);
    
    // Test the showAuth function
    console.log('Testing showAuth function...');
    showAuth('login');
    
    // Check if elements exist
    const loginScreen = document.getElementById('loginScreen');
    const landingPage = document.getElementById('landingPage');
    console.log('Login screen element:', loginScreen);
    console.log('Landing page element:', landingPage);
    
    if (loginScreen) {
        console.log('Login screen display style:', loginScreen.style.display);
    }
    
    // Test form submission
    setTimeout(() => {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            console.log('Login form found:', loginForm);
            // Simulate form submission
            const emailInput = document.getElementById('loginEmail');
            const passwordInput = document.getElementById('loginPassword');
            
            if (emailInput && passwordInput) {
                emailInput.value = 'demo@sceneflowai.com';
                passwordInput.value = 'demo123';
                console.log('Form inputs populated');
                
                // Test form submission
                const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                loginForm.dispatchEvent(submitEvent);
            }
        } else {
            console.error('Login form not found');
        }
    }, 1000);
}

// Reset credit system for testing
function resetCredits() {
    if (window.sceneFlowAI) {
        window.sceneFlowAI.resetCreditSystem();
        alert('Credit system reset! Please log in again.');
        // Redirect to landing page
        if (window.sceneFlowAI.navigateToRoute) {
            window.sceneFlowAI.navigateToRoute('landing');
        }
    } else {
        alert('App is still loading. Please wait a moment and try again.');
    }
}

// Sync credits for debugging
function syncCredits() {
    if (window.sceneFlowAI) {
        window.sceneFlowAI.syncCredits();
        alert('Credits synced! Check console for details.');
    } else {
        alert('App is still loading. Please wait a moment and try again.');
    }
}

// Ask Cue a question
function askCue(question) {
    const cueInput = document.getElementById('cueInput');
    if (cueInput) {
        cueInput.value = question;
        // Trigger the send function
        sendCueMessage();
    }
}

// Navigate to section (global function for HTML buttons)
function navigateToSection(section) {
    if (window.sceneFlowAI) {
        window.sceneFlowAI.navigateToSection(section);
    } else {
        alert('App is still loading. Please wait a moment and try again.');
    }
}

// Scroll to workflow section
function scrollToWorkflow() {
    const workflowSection = document.getElementById('workflowShowcase');
    if (workflowSection) {
        workflowSection.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }
}
