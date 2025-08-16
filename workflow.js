// SceneFlow AI - Workflow Management

class WorkflowManager {
    constructor() {
        this.currentStep = 1;
        this.workflowData = {};
        this.generatedIdeas = [];
        this.youtubeReferences = [];
        this.selectedIdea = null;
        this.byokManager = new BYOKManager();
        this.creditManager = new CreditManager();
        this.cueAssistant = null; // Will be initialized after DOM is ready
        
        this.init();
    }

    init() {
        console.log('WorkflowManager initialized');
        this.setupEventListeners();
        this.initializeBYOK();
        
        // Initialize Cue Assistant after DOM is ready
        setTimeout(() => {
            this.cueAssistant = new CueAssistant(this);
        }, 100);
    }

    async initializeBYOK() {
        // BYOK setup moved to onboarding and workflow options
        // Users can set up their own API keys during the creative process
        console.log('BYOK setup available during workflow');
    }

    showBYOKSetupModal() {
        // BYOK setup moved to onboarding and workflow options
        // Users can configure their API keys during the creative process
        console.log('BYOK setup available during workflow');
    }

    setupEventListeners() {
        // Ideation step event listeners
        document.addEventListener('click', (e) => {
            if (e.target.id === 'generateIdeasBtn') {
                this.generateIdeas();
            } else if (e.target.closest('.idea-card')) {
                const ideaId = e.target.closest('.idea-card').dataset.ideaId;
                this.selectIdea(ideaId);
            } else if (e.target.closest('.video-card')) {
                const videoId = e.target.closest('.video-card').dataset.videoId;
                this.inspireFromVideo(videoId);
            }
        });
    }

    async generateIdeas() {
        const ideaInput = document.getElementById('ideaInput').value.trim();
        
        if (!ideaInput) {
            this.showNotification('Please describe your video idea first', 'error');
            return;
        }

        // Check BYOK requirement
        // BYOK setup available during workflow
        // Users can configure their API keys as needed
        console.log('Proceeding with idea generation');

        // Check credit requirement for workflow start
        const workflowCost = 5; // Credits for starting new project
        if (!await this.creditManager.reserveCredits(workflowCost, 'PROJECT_START')) {
            this.showNotification('Insufficient credits. Please purchase more credits.', 'error');
            this.showCreditPurchaseModal();
            return;
        }

        // Show loading state
        const generateBtn = document.getElementById('generateIdeasBtn');
        const originalText = generateBtn.innerHTML;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        generateBtn.disabled = true;

        try {
            // Use BYOK for AI generation
            const geminiKey = await this.byokManager.getDecryptedAPIKey();
            
            // Simulate AI processing with BYOK
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Generate ideas based on input using BYOK
            this.generatedIdeas = await this.createIdeasWithBYOK(ideaInput, geminiKey);
            
            // Display generated ideas
            this.displayGeneratedIdeas();
            
            // Show YouTube references
            this.youtubeReferences = await this.createYouTubeReferencesWithBYOK(ideaInput, geminiKey);
            this.displayYouTubeReferences();
            
            // Deduct credits after successful generation
            await this.creditManager.deductCredits(workflowCost, 'PROJECT_START', {
                projectType: 'video_ideation',
                ideaCount: this.generatedIdeas.length
            });
            
            this.showNotification('Ideas generated successfully!', 'success');
            
        } catch (error) {
            console.error('Error generating ideas:', error);
            this.showNotification('Failed to generate ideas. Please try again.', 'error');
            
            // Refund credits on failure
            await this.creditManager.refundCredits(workflowCost, 'PROJECT_START_FAILED');
        } finally {
            // Restore button state
            generateBtn.innerHTML = originalText;
            generateBtn.disabled = false;
        }
    }

    async createIdeasWithBYOK(input, apiKey) {
        // This would integrate with Google Gemini API using the user's key
        // For now, simulating the enhanced idea generation
        const baseIdeas = [
            {
                id: 'idea-1',
                title: 'Dynamic Visual Story',
                description: 'A cinematic journey that transforms your concept into a compelling visual narrative with dramatic lighting and smooth camera movements.',
                category: 'cinematic',
                style: 'Professional',
                duration: '30-60 seconds',
                complexity: 'Medium',
                estimatedCredits: 1500,
                byokGenerated: true,
                generationCost: 2 // Credits used from user's Gemini API
            },
            {
                id: 'idea-2',
                title: 'Modern Minimalist Approach',
                description: 'Clean, contemporary style focusing on simplicity and elegance, perfect for modern audiences and brand messaging.',
                category: 'minimalist',
                style: 'Contemporary',
                duration: '15-30 seconds',
                complexity: 'Low',
                estimatedCredits: 8,
                byokGenerated: true,
                generationCost: 1
            },
            {
                id: 'idea-3',
                title: 'Emotional Journey',
                description: 'An emotionally-driven piece that connects with viewers on a deeper level through storytelling and atmospheric elements.',
                category: 'emotional',
                style: 'Artistic',
                duration: '45-90 seconds',
                complexity: 'High',
                estimatedCredits: 25,
                byokGenerated: true,
                generationCost: 3
            }
        ];

        // Customize ideas based on input
        const customizedIdeas = baseIdeas.map((idea, index) => ({
            ...idea,
            title: `${idea.title} - ${input.split(' ').slice(0, 3).join(' ')}`,
            description: `${idea.description} Based on your concept: "${input.substring(0, 100)}${input.length > 100 ? '...' : ''}"`,
            id: `idea-${Date.now()}-${index + 1}`
        }));

        return customizedIdeas;
    }

    async createYouTubeReferencesWithBYOK(input, apiKey) {
        // This would use Gemini API to analyze YouTube content
        // For now, simulating enhanced analysis
        const searchTerms = input.toLowerCase().split(' ').slice(0, 3);
        const baseVideos = [
            {
                id: 'video-1',
                title: 'Professional Video Production Techniques',
                channel: 'Film Academy',
                views: '2.3M',
                duration: '12:45',
                thumbnail: 'https://via.placeholder.com/320x180/2196F3/FFFFFF?text=Video+1',
                description: 'Learn advanced cinematography and editing techniques for professional video production.',
                relevance: 'High',
                category: 'tutorial',
                aiAnalysis: 'Strong pacing, excellent visual consistency, engaging hook',
                byokAnalyzed: true
            },
            {
                id: 'video-2',
                title: 'Creative Storytelling in Video',
                channel: 'Creative Masters',
                views: '890K',
                duration: '8:32',
                thumbnail: 'https://via.placeholder.com/320x180/4CAF50/FFFFFF?text=Video+2',
                description: 'Explore innovative storytelling methods that engage and captivate your audience.',
                relevance: 'Medium',
                category: 'inspiration',
                aiAnalysis: 'Good narrative structure, could improve visual transitions',
                byokAnalyzed: true
            },
            {
                id: 'video-3',
                title: 'Modern Video Editing Trends',
                channel: 'Tech Creators',
                views: '1.1M',
                duration: '15:20',
                thumbnail: 'https://via.placeholder.com/320x180/FF9800/FFFFFF?text=Video+3',
                description: 'Discover the latest trends in video editing and post-production techniques.',
                relevance: 'Medium',
                category: 'trends',
                aiAnalysis: 'Trendy effects, good for inspiration, moderate engagement',
                byokAnalyzed: true
            }
        ];

        // Customize videos based on input
        const customizedVideos = baseVideos.map((video, index) => ({
            ...video,
            title: `${video.title} - ${searchTerms.join(' ')}`,
            description: `${video.description} Relevant to your concept: "${input.substring(0, 80)}${input.length > 80 ? '...' : ''}"`,
            id: `video-${Date.now()}-${index + 1}`
        }));

        return customizedVideos;
    }

    displayGeneratedIdeas() {
        const ideasContainer = document.getElementById('ideasContainer');
        const generatedIdeasSection = document.getElementById('generatedIdeas');
        
        if (!ideasContainer || !generatedIdeasSection) return;

        const ideasHTML = this.generatedIdeas.map(idea => `
            <div class="idea-card" data-idea-id="${idea.id}">
                <div class="idea-header">
                    <h4>${idea.title}</h4>
                    <span class="idea-category ${idea.category}">${idea.category}</span>
                </div>
                <p class="idea-description">${idea.description}</p>
                <div class="idea-details">
                    <div class="idea-meta">
                        <span class="idea-style"><i class="fas fa-palette"></i> ${idea.style}</span>
                        <span class="idea-duration"><i class="fas fa-clock"></i> ${idea.duration}</span>
                        <span class="idea-complexity"><i class="fas fa-chart-line"></i> ${idea.complexity}</span>
                    </div>
                    <div class="idea-actions">
                        <span class="idea-credits"><i class="fas fa-coins"></i> ${idea.estimatedCredits} credits</span>
                        <button class="btn-primary btn-small" onclick="selectIdea('${idea.id}')">
                            <i class="fas fa-check"></i> Select
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        ideasContainer.innerHTML = ideasHTML;
        generatedIdeasSection.style.display = 'block';
    }

    displayYouTubeReferences() {
        const videosContainer = document.getElementById('videosContainer');
        const youtubeReferencesSection = document.getElementById('youtubeReferences');
        
        if (!videosContainer || !youtubeReferencesSection) return;

        const videosHTML = this.youtubeReferences.map(video => `
            <div class="video-card" data-video-id="${video.id}">
                <div class="video-thumbnail">
                    <img src="${video.thumbnail}" alt="${video.title}">
                    <div class="video-duration">${video.duration}</div>
                    <div class="video-overlay">
                        <i class="fas fa-play-circle"></i>
                    </div>
                </div>
                <div class="video-info">
                    <h4 class="video-title">${video.title}</h4>
                    <p class="video-channel">${video.channel}</p>
                    <div class="video-meta">
                        <span class="video-views"><i class="fas fa-eye"></i> ${video.views}</span>
                        <span class="video-relevance ${video.relevance.toLowerCase()}">${video.relevance} relevance</span>
                    </div>
                    <p class="video-description">${video.description}</p>
                    <div class="video-actions">
                        <button class="btn-secondary btn-small" onclick="watchVideo('${video.id}')">
                            <i class="fas fa-play"></i> Watch
                        </button>
                        <button class="btn-primary btn-small" onclick="inspireFromVideo('${video.id}')">
                            <i class="fas fa-lightbulb"></i> Inspire
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        videosContainer.innerHTML = videosHTML;
        youtubeReferencesSection.style.display = 'block';
    }

    selectIdea(ideaId) {
        const idea = this.generatedIdeas.find(i => i.id === ideaId);
        if (!idea) return;

        this.selectedIdea = idea;
        this.workflowData.selectedIdea = idea;
        
        // Update UI to show selected idea
        document.querySelectorAll('.idea-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        const selectedCard = document.querySelector(`[data-idea-id="${ideaId}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }

        // Show next step button
        this.showNextStepButton();
        
        this.showNotification(`Selected: ${idea.title}`, 'success');
    }

    showNextStepButton() {
        const ideationContent = document.querySelector('.ideation-input');
        if (!ideationContent) return;

        // Remove existing next step button if any
        const existingBtn = document.querySelector('.next-step-btn');
        if (existingBtn) existingBtn.remove();

        // Add next step button
        const nextStepBtn = document.createElement('button');
        nextStepBtn.className = 'btn-primary btn-large next-step-btn';
        nextStepBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Continue to Storyboard';
        nextStepBtn.onclick = () => this.proceedToStoryboard();
        
        ideationContent.appendChild(nextStepBtn);
    }

    async proceedToStoryboard() {
        if (!this.selectedIdea) {
            this.showNotification('Please select an idea first', 'error');
            return;
        }

        // BYOK setup available during workflow
        // Users can configure their API keys as needed
        console.log('Proceeding with storyboard generation');

        // Check credit requirement for storyboard
        const storyboardCost = 5; // Credits for major storyboard regeneration
        if (!await this.creditManager.reserveCredits(storyboardCost, 'STORYBOARD_REGENERATION')) {
            this.showNotification('Insufficient credits. Please purchase more credits.', 'error');
            this.showCreditPurchaseModal();
            return;
        }

        try {
            // Save workflow data
            this.workflowData.ideation = {
                input: document.getElementById('ideaInput').value,
                selectedIdea: this.selectedIdea,
                generatedIdeas: this.generatedIdeas,
                youtubeReferences: this.youtubeReferences
            };

            // Deduct credits after successful storyboard creation
            await this.creditManager.deductCredits(storyboardCost, 'STORYBOARD_REGENERATION', {
                projectId: this.workflowData.projectId,
                ideaTitle: this.selectedIdea.title
            });

            // Navigate to next step (storyboard)
            this.showNotification('Moving to Storyboard step...', 'info');
            
            // In a real app, this would navigate to the storyboard step
            setTimeout(() => {
                if (window.sceneFlowAI) {
                    window.sceneFlowAI.showNotification('Storyboard step coming soon!', 'info');
                }
            }, 1500);
        } catch (error) {
            console.error('Error proceeding to storyboard:', error);
            this.showNotification('Failed to create storyboard. Please try again.', 'error');
            
            // Refund credits on failure
            await this.creditManager.refundCredits(storyboardCost, 'STORYBOARD_REGENERATION_FAILED');
        }
    }

    iterateIdea(ideaId) {
        const idea = this.generatedIdeas.find(i => i.id === ideaId);
        if (!idea) return;

        // Show iteration modal
        this.showIterationModal(idea);
    }

    showIterationModal(idea) {
        const modalContent = `
            <div class="modal-header">
                <h3>Iterate on Idea</h3>
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-content">
                <div class="iteration-form">
                    <h4>${idea.title}</h4>
                    <p>${idea.description}</p>
                    
                    <div class="form-group">
                        <label for="iterationInput">What would you like to change or improve?</label>
                        <textarea id="iterationInput" placeholder="Describe your desired changes..."></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="iterationStyle">Preferred Style:</label>
                        <select id="iterationStyle">
                            <option value="cinematic">Cinematic</option>
                            <option value="minimalist">Minimalist</option>
                            <option value="artistic">Artistic</option>
                            <option value="commercial">Commercial</option>
                        </select>
                    </div>
                    
                    <div class="form-actions">
                        <button class="btn-secondary" onclick="closeModal()">Cancel</button>
                        <button class="btn-primary" onclick="submitIteration('${idea.id}')">Generate Iteration</button>
                    </div>
                </div>
            </div>
        `;

        if (window.sceneFlowAI) {
            window.sceneFlowAI.showModal(modalContent);
        }
    }

    submitIteration(ideaId) {
        const iterationInput = document.getElementById('iterationInput').value;
        const iterationStyle = document.getElementById('iterationStyle').value;
        
        if (!iterationInput.trim()) {
            this.showNotification('Please describe your desired changes', 'error');
            return;
        }

        // Simulate iteration generation
        this.showNotification('Generating iteration...', 'info');
        
        setTimeout(() => {
            this.updateIdeaWithIteration(ideaId, iterationInput, iterationStyle);
            if (window.sceneFlowAI) {
                window.sceneFlowAI.closeModal();
            }
        }, 2000);
    }

    updateIdeaWithIteration(ideaId, iterationInput, style) {
        const idea = this.generatedIdeas.find(i => i.id === ideaId);
        if (!idea) return;

        // Create new iteration
        const iteration = {
            id: `iteration-${Date.now()}`,
            originalIdeaId: ideaId,
            input: iterationInput,
            style: style,
            title: `${idea.title} - ${style} Iteration`,
            description: `${idea.description} Modified based on: "${iterationInput}"`,
            category: style,
            style: style.charAt(0).toUpperCase() + style.slice(1),
            duration: idea.duration,
            complexity: idea.complexity,
            estimatedCredits: idea.estimatedCredits + 5 // Iterations cost more
        };

        // Add to generated ideas
        this.generatedIdeas.push(iteration);
        
        // Update display
        this.displayGeneratedIdeas();
        
        this.showNotification('Iteration generated successfully!', 'success');
    }

    watchVideo(videoId) {
        const video = this.youtubeReferences.find(v => v.id === videoId);
        if (!video) return;

        // Simulate opening video
        this.showNotification(`Opening: ${video.title}`, 'info');
        
        // In a real app, this would open the video in a modal or new tab
        setTimeout(() => {
            this.showNotification('Video player would open here', 'info');
        }, 1000);
    }

    inspireFromVideo(videoId) {
        const video = this.youtubeReferences.find(v => v.id === videoId);
        if (!video) return;

        // Use video as inspiration for new ideas
        this.showNotification(`Using "${video.title}" as inspiration...`, 'info');
        
        setTimeout(() => {
            // Generate new ideas inspired by the video
            const inspiredIdeas = this.createInspiredIdeas(video);
            this.generatedIdeas = [...this.generatedIdeas, ...inspiredIdeas];
            this.displayGeneratedIdeas();
            
            this.showNotification('New inspired ideas generated!', 'success');
        }, 2000);
    }

    createInspiredIdeas(video) {
        const inspiredIdeas = [
            {
                id: `inspired-${Date.now()}-1`,
                title: `Inspired by ${video.title}`,
                description: `A creative adaptation inspired by the techniques and style shown in "${video.title}".`,
                category: 'inspired',
                style: 'Adaptive',
                duration: '30-45 seconds',
                complexity: 'Medium',
                estimatedCredits: 20,
                inspiration: video.title
            }
        ];

        return inspiredIdeas;
    }

    checkCredits() {
        return this.creditManager.getCurrentUser()?.credits > 0;
    }

    async consumeCredit(amount = 1, reason = 'GENERAL') {
        return await this.creditManager.deductCredits(amount, reason);
    }

    updateCreditsDisplay() {
        const user = this.creditManager.getCurrentUser();
        if (!user) return;
        
        const creditsDisplay = document.querySelector('.credits-display');
        if (creditsDisplay) {
            creditsDisplay.textContent = `${user.credits} Credits`;
        }
        
        // Show subscription tier if available
        if (user.subscriptionTier) {
            const tierDisplay = document.querySelector('.tier-display');
            if (tierDisplay) {
                tierDisplay.textContent = user.subscriptionTier.charAt(0).toUpperCase() + user.subscriptionTier.slice(1);
            }
        }
    }

    purchaseCredits() {
        this.showCreditPurchaseModal();
    }

    showCreditPurchaseModal() {
        showCreditPurchaseModal();
    }

    nextStep() {
        if (this.currentStep < 5) {
            this.currentStep++;
            this.updateWorkflowProgress(this.currentStep);
            this.showCurrentStep();
        }
    }

    previousStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateWorkflowProgress(this.currentStep);
            this.showCurrentStep();
        }
    }

    showCurrentStep() {
        // Hide all steps
        document.querySelectorAll('.workflow-screen').forEach(screen => {
            screen.style.display = 'none';
        });

        // Show current step
        const currentStepScreen = document.getElementById(`${this.getStepName(this.currentStep)}Screen`);
        if (currentStepScreen) {
            currentStepScreen.style.display = 'block';
        }
    }

    getStepName(stepNumber) {
        const stepNames = ['', 'ideation', 'storyboard', 'sceneDirection', 'videoGeneration', 'testScreening'];
        return stepNames[stepNumber] || 'ideation';
    }

    analyzeYouTubeVideo() {
        const youtubeLink = document.getElementById('youtubeLink').value;
        if (!youtubeLink) {
            this.showNotification('Please enter a YouTube link', 'error');
            return;
        }

        this.showNotification('Analyzing YouTube video...', 'info');
        
        // Simulate analysis
        setTimeout(() => {
            this.displayAnalysisResults({
                type: 'youtube',
                url: youtubeLink,
                results: this.generateSampleAnalysis()
            });
        }, 3000);
    }

    analyzeUploadedVideo() {
        const videoFile = document.getElementById('videoFile').files[0];
        if (!videoFile) {
            this.showNotification('Please select a video file', 'error');
            return;
        }

        this.showNotification('Analyzing uploaded video...', 'info');
        
        // Simulate analysis
        setTimeout(() => {
            this.displayAnalysisResults({
                type: 'upload',
                filename: videoFile.name,
                results: this.generateSampleAnalysis()
            });
        }, 3000);
    }

    generateSampleAnalysis() {
        return {
            pacing: {
                score: 8.5,
                issues: ['Slow section at 0:45-1:15', 'Rushed conclusion'],
                suggestions: ['Add more dynamic cuts in slow section', 'Extend conclusion by 5 seconds']
            },
            hook: {
                score: 9.2,
                strengths: ['Strong visual opening', 'Clear value proposition'],
                suggestions: ['Add question in first 3 seconds']
            },
            engagement: {
                score: 7.8,
                opportunities: ['Add call-to-action at 1:30', 'Include viewer question'],
                suggestions: ['Insert poll question at 2:00', 'Stronger CTA needed']
            },
            visualConsistency: {
                score: 8.9,
                issues: ['Color grading varies slightly', 'Character appearance consistent'],
                suggestions: ['Standardize color palette', 'Maintain character styling']
            }
        };
    }

    displayAnalysisResults(analysis) {
        const resultsContainer = document.getElementById('analysisResults');
        if (!resultsContainer) return;

        const resultsHTML = `
            <div class="analysis-summary">
                <h3>Analysis Complete</h3>
                <p>AI-powered analysis of your video content</p>
                
                <div class="analysis-scores">
                    <div class="score-card">
                        <h4>Pacing</h4>
                        <div class="score">${analysis.results.pacing.score}/10</div>
                        <p>${analysis.results.pacing.issues.join(', ')}</p>
                    </div>
                    
                    <div class="score-card">
                        <h4>Hook</h4>
                        <div class="score">${analysis.results.hook.score}/10</div>
                        <p>${analysis.results.hook.strengths.join(', ')}</p>
                    </div>
                    
                    <div class="score-card">
                        <h4>Engagement</h4>
                        <div class="score">${analysis.results.engagement.score}/10</div>
                        <p>${analysis.results.engagement.opportunities.join(', ')}</p>
                    </div>
                    
                    <div class="score-card">
                        <h4>Visual Consistency</h4>
                        <div class="score">${analysis.results.visualConsistency.score}/10</div>
                        <p>${analysis.results.visualConsistency.issues.join(', ')}</p>
                    </div>
                </div>
                
                <div class="analysis-recommendations">
                    <h4>Key Recommendations</h4>
                    <ul>
                        ${analysis.results.pacing.suggestions.map(s => `<li>${s}</li>`).join('')}
                        ${analysis.results.hook.suggestions.map(s => `<li>${s}</li>`).join('')}
                        ${analysis.results.engagement.suggestions.map(s => `<li>${s}</li>`).join('')}
                        ${analysis.results.visualConsistency.suggestions.map(s => `<li>${s}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;

        resultsContainer.innerHTML = resultsHTML;
        resultsContainer.style.display = 'block';
    }

    async createProject() {
        if (!this.selectedIdea) {
            this.showNotification('Please select an idea first', 'error');
            return;
        }

        const project = {
            id: `project-${Date.now()}`,
            title: this.selectedIdea.title,
            description: this.selectedIdea.description,
            status: 'draft',
            progress: 20, // Ideation step completed
            currentStep: 'ideation',
            workflowData: this.workflowData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            creditsUsed: 5,
            estimatedDuration: this.selectedIdea.duration
        };

        // Save project
        this.saveProject(project);
        
        // Navigate to dashboard
        if (window.sceneFlowAI) {
            window.sceneFlowAI.showNotification('Project created successfully!', 'success');
            window.sceneFlowAI.navigateToRoute('dashboard');
        }
    }

    // Step 4: Auto-Editor rendering cost calculation
    async calculateRenderingCost(projectId, resolution = '1080p') {
        const project = this.loadProject(projectId);
        if (!project) return null;

        // Parse duration from the idea (e.g., "30-60 seconds" -> 45 seconds average)
        const durationText = project.estimatedDuration || '30-60 seconds';
        const durationMatch = durationText.match(/(\d+)-(\d+)/);
        let durationMinutes = 1; // Default to 1 minute
        
        if (durationMatch) {
            const min = parseInt(durationMatch[1]);
            const max = parseInt(durationMatch[2]);
            durationMinutes = (min + max) / 2 / 60; // Convert to minutes
        }

        const cost = this.creditManager.calculateRenderingCost(durationMinutes, resolution);
        
        return {
            durationMinutes,
            resolution,
            cost,
            costBreakdown: `${cost} credits for ${durationMinutes.toFixed(1)} minutes at ${resolution}`
        };
    }

    // Step 5: Analysis cost calculation
    async calculateAnalysisCost(projectId, analysisType = 'standard') {
        const project = this.loadProject(projectId);
        if (!project) return null;

        const durationText = project.estimatedDuration || '30-60 seconds';
        const durationMatch = durationText.match(/(\d+)-(\d+)/);
        let durationMinutes = 1;
        
        if (durationMatch) {
            const min = parseInt(durationMatch[1]);
            const max = parseInt(durationMatch[2]);
            durationMinutes = (min + max) / 2 / 60;
        }

        const cost = this.creditManager.calculateAnalysisCost(durationMinutes, analysisType);
        
        return {
            durationMinutes,
            analysisType,
            cost,
            costBreakdown: `${cost} credits for ${durationMinutes.toFixed(1)} minutes of ${analysisType} analysis`
        };
    }

    // Enhanced Workflow Steps Implementation

    // Step 2: Storyboard Generation (BYOK Required for Images)
    async generateStoryboard(projectId) {
        // BYOK setup available during workflow
        // Users can configure their API keys as needed
        console.log('Proceeding with storyboard generation');

        const project = this.loadProject(projectId);
        if (!project) {
            this.showNotification('Project not found', 'error');
            return;
        }

        // Check credit requirement
        const storyboardCost = 5;
        if (!await this.creditManager.reserveCredits(storyboardCost, 'STORYBOARD_REGENERATION')) {
            this.showNotification('Insufficient credits for storyboard generation', 'error');
            this.showCreditPurchaseModal();
            return;
        }

        try {
            this.showNotification('Generating storyboard panels...', 'info');
            
            // Generate storyboard using BYOK
            const geminiKey = await this.byokManager.getDecryptedAPIKey();
            const storyboard = await this.createStoryboardWithBYOK(project, geminiKey);
            
            // Save storyboard to project
            project.storyboard = storyboard;
            project.currentStep = 'storyboard';
            project.progress = 40;
            this.saveProject(project);
            
            // Deduct credits
            await this.creditManager.deductCredits(storyboardCost, 'STORYBOARD_REGENERATION', {
                projectId,
                panelCount: storyboard.panels.length
            });
            
            this.showNotification('Storyboard generated successfully!', 'success');
            this.displayStoryboard(storyboard);
            
        } catch (error) {
            console.error('Error generating storyboard:', error);
            this.showNotification('Failed to generate storyboard', 'error');
            await this.creditManager.refundCredits(storyboardCost, 'STORYBOARD_REGENERATION_FAILED');
        }
    }

    async createStoryboardWithBYOK(project, apiKey) {
        // This would integrate with Google Gemini API using the user's key
        // For now, simulating professional storyboard generation
        
        const storyboard = {
            id: `storyboard-${Date.now()}`,
            projectId: project.id,
            panels: [],
            version: 1,
            generatedAt: new Date().toISOString()
        };

        // Generate storyboard panels based on the selected idea
        const idea = project.workflowData.ideation.selectedIdea;
        const panelCount = this.calculatePanelCount(idea.duration);
        
        for (let i = 0; i < panelCount; i++) {
            const panel = await this.generateStoryboardPanel(i + 1, idea, apiKey);
            storyboard.panels.push(panel);
        }

        return storyboard;
    }

    async generateStoryboardPanel(panelNumber, idea, apiKey) {
        // Simulate AI-generated storyboard panel
        const panelTypes = ['Establishing Shot', 'Medium Shot', 'Close-up', 'Wide Shot', 'Detail Shot'];
        const panelType = panelTypes[panelNumber % panelTypes.length];
        
        const panel = {
            id: `panel-${panelNumber}`,
            panelCode: `P${panelNumber.toString().padStart(2, '0')}`,
            title: `${panelType} - Scene ${Math.ceil(panelNumber / 3)}`,
            description: `AI-generated ${panelType.toLowerCase()} for ${idea.title}`,
            imageUrl: `https://via.placeholder.com/400x300/4A90E2/FFFFFF?text=Panel+${panelNumber}`,
            technicalSpecs: {
                shotType: panelType,
                duration: '3-5 seconds',
                cameraMovement: panelNumber % 2 === 0 ? 'Static' : 'Slow Pan',
                lighting: 'Natural, warm',
                composition: 'Rule of thirds',
                focus: 'Subject centered'
            },
            audio: {
                music: 'Ambient background',
                soundEffects: 'Natural environment',
                voiceOver: panelNumber === 1 ? 'Opening narration' : 'None'
            },
            action: `Scene ${Math.ceil(panelNumber / 3)}: ${panelType.toLowerCase()} showing key elements`,
            notes: 'AI-generated based on cinematic best practices',
            byokGenerated: true
        };

        return panel;
    }

    calculatePanelCount(duration) {
        // Estimate panel count based on duration
        const durationMatch = duration.match(/(\d+)-(\d+)/);
        if (durationMatch) {
            const avgDuration = (parseInt(durationMatch[1]) + parseInt(durationMatch[2])) / 2;
            return Math.max(6, Math.ceil(avgDuration / 10)); // 1 panel per 10 seconds, minimum 6
        }
        return 8; // Default
    }

    displayStoryboard(storyboard) {
        const storyboardContainer = document.getElementById('storyboardContainer');
        if (!storyboardContainer) return;

        const storyboardHTML = `
            <div class="storyboard-view">
                <div class="storyboard-header">
                    <h3>Storyboard - ${storyboard.panels.length} Panels</h3>
                    <div class="storyboard-actions">
                        <button class="btn-secondary" onclick="workflowManager.exportStoryboard('${storyboard.id}')">
                            <i class="fas fa-download"></i> Export
                        </button>
                        <button class="btn-primary" onclick="workflowManager.proceedToSceneDirection()">
                            <i class="fas fa-arrow-right"></i> Continue to Scene Direction
                        </button>
                    </div>
                </div>
                
                <div class="storyboard-panels">
                    ${storyboard.panels.map(panel => `
                        <div class="storyboard-panel" data-panel-id="${panel.id}">
                            <div class="panel-header">
                                <span class="panel-code">${panel.panelCode}</span>
                                <span class="panel-title">${panel.title}</span>
                            </div>
                            
                            <div class="panel-image">
                                <img src="${panel.imageUrl}" alt="${panel.title}">
                            </div>
                            
                            <div class="panel-details">
                                <div class="technical-specs">
                                    <h5>Technical Specifications</h5>
                                    <ul>
                                        <li><strong>Shot:</strong> ${panel.technicalSpecs.shotType}</li>
                                        <li><strong>Duration:</strong> ${panel.technicalSpecs.duration}</li>
                                        <li><strong>Camera:</strong> ${panel.technicalSpecs.cameraMovement}</li>
                                        <li><strong>Lighting:</strong> ${panel.technicalSpecs.lighting}</li>
                                    </ul>
                                </div>
                                
                                <div class="audio-cues">
                                    <h5>Audio Cues</h5>
                                    <ul>
                                        <li><strong>Music:</strong> ${panel.audio.music}</li>
                                        <li><strong>SFX:</strong> ${panel.audio.soundEffects}</li>
                                        <li><strong>VO:</strong> ${panel.audio.voiceOver}</li>
                                    </ul>
                                </div>
                                
                                <div class="action-description">
                                    <h5>Action</h5>
                                    <p>${panel.action}</p>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        storyboardContainer.innerHTML = storyboardHTML;
        storyboardContainer.style.display = 'block';
    }

    // Step 3: Scene Direction Generation
    async generateSceneDirection(projectId) {
        const project = this.loadProject(projectId);
        if (!project || !project.storyboard) {
            this.showNotification('Storyboard required for scene direction', 'error');
            return;
        }

        // Check credit requirement
        const directionCost = 3; // Credits for scene direction generation
        if (!await this.creditManager.reserveCredits(directionCost, 'SCENE_DIRECTION')) {
            this.showNotification('Insufficient credits for scene direction', 'error');
            this.showCreditPurchaseModal();
            return;
        }

        try {
            this.showNotification('Generating scene direction package...', 'info');
            
            const sceneDirection = await this.createSceneDirectionPackage(project);
            
            // Save to project
            project.sceneDirection = sceneDirection;
            project.currentStep = 'sceneDirection';
            project.progress = 60;
            this.saveProject(project);
            
            // Deduct credits
            await this.creditManager.deductCredits(directionCost, 'SCENE_DIRECTION', {
                projectId,
                sceneCount: sceneDirection.scenes.length
            });
            
            this.showNotification('Scene direction package generated!', 'success');
            this.displaySceneDirection(sceneDirection);
            
        } catch (error) {
            console.error('Error generating scene direction:', error);
            this.showNotification('Failed to generate scene direction', 'error');
            await this.creditManager.refundCredits(directionCost, 'SCENE_DIRECTION_FAILED');
        }
    }

    async createSceneDirectionPackage(project) {
        const storyboard = project.storyboard;
        const sceneDirection = {
            id: `direction-${Date.now()}`,
            projectId: project.id,
            scenes: [],
            overallDirection: {
                style: project.workflowData.ideation.selectedIdea.style,
                tone: 'Professional and engaging',
                targetAudience: 'General audience',
                brandGuidelines: 'Modern, clean aesthetic'
            },
            generatedAt: new Date().toISOString()
        };

        // Group panels into scenes
        const scenes = this.groupPanelsIntoScenes(storyboard.panels);
        
        for (let i = 0; i < scenes.length; i++) {
            const scene = await this.generateSceneSpecification(i + 1, scenes[i], project);
            sceneDirection.scenes.push(scene);
        }

        return sceneDirection;
    }

    groupPanelsIntoScenes(panels) {
        // Group panels into logical scenes (3-4 panels per scene)
        const scenes = [];
        const panelsPerScene = Math.ceil(panels.length / 3);
        
        for (let i = 0; i < panels.length; i += panelsPerScene) {
            scenes.push(panels.slice(i, i + panelsPerScene));
        }
        
        return scenes;
    }

    async generateSceneSpecification(sceneNumber, panels, project) {
        const scene = {
            id: `scene-${sceneNumber}`,
            sceneNumber,
            title: `Scene ${sceneNumber}: ${this.generateSceneTitle(panels)}`,
            duration: `${panels.length * 4}-${panels.length * 6} seconds`,
            panels: panels.map(p => p.id),
            technicalSpecs: {
                lighting: this.consolidateLighting(panels),
                cameraWork: this.consolidateCameraWork(panels),
                audio: this.consolidateAudio(panels),
                transitions: this.generateTransitions(panels)
            },
            creativeDirection: {
                mood: this.determineMood(panels),
                pacing: this.determinePacing(panels),
                visualStyle: this.determineVisualStyle(panels)
            },
            productionNotes: this.generateProductionNotes(panels, project)
        };

        return scene;
    }

    generateSceneTitle(panels) {
        const firstPanel = panels[0];
        const lastPanel = panels[panels.length - 1];
        return `${firstPanel.technicalSpecs.shotType} to ${lastPanel.technicalSpecs.shotType}`;
    }

    consolidateLighting(panels) {
        const lighting = panels.map(p => p.technicalSpecs.lighting);
        return [...new Set(lighting)].join(', ');
    }

    consolidateCameraWork(panels) {
        const camera = panels.map(p => p.technicalSpecs.cameraMovement);
        return [...new Set(camera)].join(', ');
    }

    consolidateAudio(panels) {
        const audio = panels.map(p => p.audio);
        return {
            music: [...new Set(audio.map(a => a.music))].join(', '),
            soundEffects: [...new Set(audio.map(a => a.soundEffects))].join(', '),
            voiceOver: [...new Set(audio.map(a => a.voiceOver))].filter(vo => vo !== 'None').join(', ')
        };
    }

    generateTransitions(panels) {
        const transitions = [];
        for (let i = 0; i < panels.length - 1; i++) {
            transitions.push({
                from: panels[i].panelCode,
                to: panels[i + 1].panelCode,
                type: 'Cross Dissolve',
                duration: '0.5 seconds'
            });
        }
        return transitions;
    }

    determineMood(panels) {
        const idea = this.workflowData.ideation?.selectedIdea;
        if (idea?.category === 'emotional') return 'Emotional, atmospheric';
        if (idea?.category === 'cinematic') return 'Dramatic, cinematic';
        return 'Professional, engaging';
    }

    determinePacing(panels) {
        if (panels.length <= 2) return 'Slow, contemplative';
        if (panels.length <= 4) return 'Moderate, balanced';
        return 'Fast, dynamic';
    }

    determineVisualStyle(panels) {
        const idea = this.workflowData.ideation?.selectedIdea;
        return idea?.style || 'Professional';
    }

    generateProductionNotes(panels, project) {
        const idea = project.workflowData.ideation.selectedIdea;
        return [
            `Maintain consistent ${idea.style.toLowerCase()} aesthetic throughout`,
            'Ensure smooth transitions between shots',
            'Pay attention to audio synchronization',
            'Maintain brand consistency in visual elements'
        ];
    }

    displaySceneDirection(sceneDirection) {
        const directionContainer = document.getElementById('sceneDirectionContainer');
        if (!directionContainer) return;

        const directionHTML = `
            <div class="scene-direction-view">
                <div class="direction-header">
                    <h3>Scene Direction Package</h3>
                    <div class="direction-actions">
                        <button class="btn-secondary" onclick="workflowManager.downloadDirectionPackage('${sceneDirection.id}')">
                            <i class="fas fa-download"></i> Download Package
                        </button>
                        <button class="btn-primary" onclick="workflowManager.proceedToAutoEditor()">
                            <i class="fas fa-arrow-right"></i> Continue to Auto-Editor
                        </button>
                    </div>
                </div>
                
                <div class="overall-direction">
                    <h4>Overall Direction</h4>
                    <div class="direction-grid">
                        <div class="direction-item">
                            <strong>Style:</strong> ${sceneDirection.overallDirection.style}
                        </div>
                        <div class="direction-item">
                            <strong>Tone:</strong> ${sceneDirection.overallDirection.tone}
                        </div>
                        <div class="direction-item">
                            <strong>Target Audience:</strong> ${sceneDirection.overallDirection.targetAudience}
                        </div>
                    </div>
                </div>
                
                <div class="scene-specifications">
                    <h4>Scene Specifications</h4>
                    ${sceneDirection.scenes.map(scene => `
                        <div class="scene-spec" data-scene-id="${scene.id}">
                            <div class="scene-header">
                                <h5>${scene.title}</h5>
                                <span class="scene-duration">${scene.duration}</span>
                            </div>
                            
                            <div class="scene-details">
                                <div class="technical-specs">
                                    <h6>Technical Specifications</h6>
                                    <ul>
                                        <li><strong>Lighting:</strong> ${scene.technicalSpecs.lighting}</li>
                                        <li><strong>Camera Work:</strong> ${scene.technicalSpecs.cameraWork}</li>
                                        <li><strong>Audio:</strong> ${scene.audio.music}, ${scene.audio.soundEffects}</li>
                                    </ul>
                                </div>
                                
                                <div class="creative-direction">
                                    <h6>Creative Direction</h6>
                                    <ul>
                                        <li><strong>Mood:</strong> ${scene.creativeDirection.mood}</li>
                                        <li><strong>Pacing:</strong> ${scene.creativeDirection.pacing}</li>
                                        <li><strong>Visual Style:</strong> ${scene.creativeDirection.visualStyle}</li>
                                    </ul>
                                </div>
                                
                                <div class="production-notes">
                                    <h6>Production Notes</h6>
                                    <ul>
                                        ${scene.productionNotes.map(note => `<li>${note}</li>`).join('')}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        directionContainer.innerHTML = directionHTML;
        directionContainer.style.display = 'block';
    }

    // Step 4: Auto-Editor (BYOK Required for Video Clips)
    async generateVideoWithAutoEditor(projectId, resolution = '1080p') {
        // BYOK setup available during workflow
        // Users can configure their API keys as needed
        console.log('Proceeding with video generation');

        const project = this.loadProject(projectId);
        if (!project || !project.sceneDirection) {
            this.showNotification('Scene direction required for video generation', 'error');
            return;
        }

        // Calculate rendering cost
        const durationText = project.estimatedDuration || '30-60 seconds';
        const durationMatch = durationText.match(/(\d+)-(\d+)/);
        let durationMinutes = 1;
        
        if (durationMatch) {
            const min = parseInt(durationMatch[1]);
            const max = parseInt(durationMatch[2]);
            durationMinutes = (min + max) / 2 / 60;
        }

        const renderingCost = this.creditManager.calculateRenderingCost(durationMinutes, resolution);
        
        // Check credit requirement
        if (!await this.creditManager.reserveCredits(renderingCost, 'RENDER_HD')) {
            this.showNotification(`Insufficient credits for ${resolution} rendering`, 'error');
            this.showCreditPurchaseModal();
            return;
        }

        try {
            this.showNotification(`Starting ${resolution} video generation...`, 'info');
            
            // Generate video using BYOK and Auto-Editor
            const geminiKey = await this.byokManager.getDecryptedAPIKey();
            const videoResult = await this.generateVideoWithBYOK(project, geminiKey, resolution);
            
            // Save to project
            project.generatedVideo = videoResult;
            project.currentStep = 'videoGeneration';
            project.progress = 80;
            this.saveProject(project);
            
            // Deduct credits
            await this.creditManager.deductCredits(renderingCost, resolution === '4K' ? 'RENDER_4K' : 'RENDER_HD', {
                projectId,
                resolution,
                durationMinutes,
                cost: renderingCost
            });
            
            this.showNotification('Video generated successfully!', 'success');
            this.displayGeneratedVideo(videoResult);
            
        } catch (error) {
            console.error('Error generating video:', error);
            this.showNotification('Failed to generate video', 'error');
            await this.creditManager.refundCredits(renderingCost, 'RENDER_FAILED');
        }
    }

    async generateVideoWithBYOK(project, apiKey, resolution) {
        // This would integrate with Google Gemini Veo API using the user's key
        // For now, simulating the Auto-Editor workflow
        
        const videoResult = {
            id: `video-${Date.now()}`,
            projectId: project.id,
            resolution,
            status: 'completed',
            videoUrl: `https://via.placeholder.com/1920x1080/000000/FFFFFF?text=Generated+Video+${resolution}`,
            duration: project.estimatedDuration,
            generatedAt: new Date().toISOString(),
            byokGenerated: true,
            autoEditorUsed: true
        };

        // Simulate the multi-stage Celery workflow
        await this.simulateAutoEditorWorkflow(project, videoResult);
        
        return videoResult;
    }

    async simulateAutoEditorWorkflow(project, videoResult) {
        // Stage 1: Prompt Builder
        this.showNotification('Building cinematic prompts...', 'info');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Stage 2: Clip Generation (Parallel)
        this.showNotification('Generating video clips with Veo...', 'info');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Stage 3: Auto-Editor Assembly
        this.showNotification('Assembling final video...', 'info');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Stage 4: Rendering
        this.showNotification('Rendering final video...', 'info');
        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    displayGeneratedVideo(videoResult) {
        const videoContainer = document.getElementById('generatedVideoContainer');
        if (!videoContainer) return;

        const videoHTML = `
            <div class="generated-video-view">
                <div class="video-header">
                    <h3>Generated Video</h3>
                    <div class="video-actions">
                        <button class="btn-secondary" onclick="workflowManager.downloadVideo('${videoResult.id}')">
                            <i class="fas fa-download"></i> Download
                        </button>
                        <button class="btn-primary" onclick="workflowManager.proceedToAnalysis()">
                            <i class="fas fa-arrow-right"></i> Continue to Analysis
                        </button>
                    </div>
                </div>
                
                <div class="video-player">
                    <video controls width="100%" height="auto">
                        <source src="${videoResult.videoUrl}" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>
                </div>
                
                <div class="video-details">
                    <div class="detail-item">
                        <strong>Resolution:</strong> ${videoResult.resolution}
                    </div>
                    <div class="detail-item">
                        <strong>Duration:</strong> ${videoResult.duration}
                    </div>
                    <div class="detail-item">
                        <strong>Generated:</strong> ${new Date(videoResult.generatedAt).toLocaleString()}
                    </div>
                    <div class="detail-item">
                        <strong>Status:</strong> <span class="status-completed">${videoResult.status}</span>
                    </div>
                </div>
            </div>
        `;

        videoContainer.innerHTML = videoHTML;
        videoContainer.style.display = 'block';
    }

    saveProject(project) {
        if (!window.sceneFlowAI || !window.sceneFlowAI.currentUser) return;

        const user = window.sceneFlowAI.currentUser;
        user.projects.push(project);
        
        // Update localStorage
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        // Update UI
        window.sceneFlowAI.updateUIForUser(user);
    }

    loadProject(projectId) {
        if (!window.sceneFlowAI || !window.sceneFlowAI.currentUser) return null;

        const user = window.sceneFlowAI.currentUser;
        const project = user.projects.find(p => p.id === projectId);
        
        if (project) {
            this.workflowData = project.workflowData || {};
            this.currentStep = this.getStepNumber(project.currentStep);
            this.selectedIdea = this.workflowData.ideation?.selectedIdea;
            
            // Restore workflow state
            this.restoreWorkflowState();
        }
        
        return project;
    }

    getStepNumber(stepName) {
        const stepNumbers = {
            'ideation': 1,
            'storyboard': 2,
            'sceneDirection': 3,
            'videoGeneration': 4,
            'testScreening': 5
        };
        return stepNumbers[stepName] || 1;
    }

    restoreWorkflowState() {
        if (this.workflowData.ideation) {
            // Restore ideation data
            const ideaInput = document.getElementById('ideaInput');
            if (ideaInput) {
                ideaInput.value = this.workflowData.ideation.input || '';
            }
            
            this.generatedIdeas = this.workflowData.ideation.generatedIdeas || [];
            this.youtubeReferences = this.workflowData.ideation.youtubeReferences || [];
            
            // Display restored data
            this.displayGeneratedIdeas();
            this.displayYouTubeReferences();
            
            // Show selected idea if any
            if (this.selectedIdea) {
                this.selectIdea(this.selectedIdea.id);
            }
        }
    }

    showNotification(message, type = 'info') {
        if (window.sceneFlowAI) {
            window.sceneFlowAI.showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    // Display current credit status and subscription information
    displayCreditStatus() {
        const user = this.creditManager.getCurrentUser();
        if (!user) return;

        const statusHTML = `
            <div class="credit-status">
                <div class="credit-balance">
                    <h4>Credit Balance</h4>
                    <div class="credits-remaining">${user.credits} Credits</div>
                    ${user.subscriptionTier ? `<div class="subscription-tier">${user.subscriptionTier.charAt(0).toUpperCase() + user.subscriptionTier.slice(1)} Plan</div>` : ''}
                </div>
                
                <div class="credit-usage">
                    <h4>Credit Usage</h4>
                    <div class="usage-item">
                        <span>Workflow Start:</span>
                        <span>${this.creditManager.creditCosts.PROJECT_START} credits</span>
                    </div>
                    <div class="usage-item">
                        <span>Storyboard Regeneration:</span>
                        <span>${this.creditManager.creditCosts.STORYBOARD_REGENERATION} credits</span>
                    </div>
                    <div class="usage-item">
                        <span>HD Rendering:</span>
                        <span>${this.creditManager.creditCosts.RENDER_HD} credits/min</span>
                    </div>
                    <div class="usage-item">
                        <span>4K Rendering:</span>
                        <span>${this.creditManager.creditCosts.RENDER_4K} credits/min</span>
                    </div>
                    <div class="usage-item">
                        <span>Standard Analysis:</span>
                        <span>${this.creditManager.creditCosts.ANALYSIS_STANDARD} credits/min</span>
                    </div>
                    <div class="usage-item">
                        <span>Advanced Analysis:</span>
                        <span>${this.creditManager.creditCosts.ANALYSIS_ADVANCED} credits/min</span>
                    </div>
                </div>
                
                <div class="credit-actions">
                    <button class="btn-primary" onclick="showCreditPurchaseModal()">Purchase Credits</button>
                    <button class="btn-secondary" onclick="showCreditHistory()">View History</button>
                </div>
            </div>
        `;

        // Find or create credit status container
        let statusContainer = document.getElementById('creditStatusContainer');
        if (!statusContainer) {
            statusContainer = document.createElement('div');
            statusContainer.id = 'creditStatusContainer';
            document.body.appendChild(statusContainer);
        }
        
        statusContainer.innerHTML = statusHTML;
    }

    // Display credit transaction history
    showCreditHistory() {
        const transactions = this.creditManager.getStoredTransactions();
        const user = this.creditManager.getCurrentUser();
        
        if (!user) return;

        const historyHTML = `
            <div class="modal-header">
                <h3>Credit Transaction History</h3>
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-content">
                <div class="credit-history">
                    <h4>Transaction History for ${user.email || 'User'}</h4>
                    
                    <div class="transaction-list">
                        ${transactions.length === 0 ? '<p>No transactions found.</p>' : 
                          transactions.map(txn => `
                            <div class="transaction-item ${txn.delta > 0 ? 'credit' : 'debit'}">
                                <div class="transaction-details">
                                    <span class="transaction-reason">${txn.reason.replace(/_/g, ' ')}</span>
                                    <span class="transaction-amount">${txn.delta > 0 ? '+' : ''}${txn.delta} credits</span>
                                </div>
                                <div class="transaction-meta">
                                    <span class="transaction-balance">Balance: ${txn.balanceSnapshot}</span>
                                    <span class="transaction-time">${new Date(txn.timestamp).toLocaleString()}</span>
                                </div>
                            </div>
                          `).join('')}
                    </div>
                </div>
            </div>
        `;

        if (window.sceneFlowAI) {
            window.sceneFlowAI.showModal(historyHTML);
        }
    }

    // Workflow Navigation Methods
    proceedToSceneDirection() {
        if (!this.workflowData.projectId) {
            this.showNotification('Please create a project first', 'error');
            return;
        }
        
        this.generateSceneDirection(this.workflowData.projectId);
    }

    proceedToAutoEditor() {
        if (!this.workflowData.projectId) {
            this.showNotification('Please create a project first', 'error');
            return;
        }
        
        // Show resolution selection modal
        this.showResolutionSelectionModal();
    }

    proceedToAnalysis() {
        if (!this.workflowData.projectId) {
            this.showNotification('Please create a project first', 'error');
            return;
        }
        
        // Show analysis type selection
        this.showAnalysisTypeSelection();
    }

    showResolutionSelectionModal() {
        const modalContent = `
            <div class="modal-header">
                <h3>Select Video Resolution</h3>
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-content">
                <div class="resolution-selection">
                    <h4>Choose your preferred resolution</h4>
                    <p>Higher resolution requires more credits but delivers better quality.</p>
                    
                    <div class="resolution-options">
                        <div class="resolution-option" onclick="selectResolution('1080p')">
                            <div class="resolution-header">
                                <h5>1080p (HD)</h5>
                                <span class="resolution-price">2 credits/min</span>
                            </div>
                            <p>High definition suitable for most platforms</p>
                        </div>
                        
                        <div class="resolution-option" onclick="selectResolution('4K')">
                            <div class="resolution-header">
                                <h5>4K (UHD)</h5>
                                <span class="resolution-price">5 credits/min</span>
                            </div>
                            <p>Ultra high definition for premium content</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        if (window.sceneFlowAI) {
            window.sceneFlowAI.showModal(modalContent);
        }
    }

    showAnalysisTypeSelection() {
        const modalContent = `
            <div class="modal-header">
                <h3>Select Analysis Type</h3>
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-content">
                <div class="analysis-selection">
                    <h4>Choose your analysis depth</h4>
                    
                    <div class="analysis-options">
                        <div class="analysis-option" onclick="selectAnalysisType('standard')">
                            <div class="analysis-header">
                                <h5>Standard Analysis</h5>
                                <span class="analysis-price">1 credit/min</span>
                            </div>
                            <ul>
                                <li>Pacing analysis</li>
                                <li>Script adherence</li>
                                <li>Basic feedback</li>
                            </ul>
                        </div>
                        
                        <div class="analysis-option" onclick="selectAnalysisType('advanced')">
                            <div class="analysis-header">
                                <h5>Advanced Analysis</h5>
                                <span class="analysis-price">4 credits/min</span>
                            </div>
                            <ul>
                                <li>Hook analysis</li>
                                <li>Engagement metrics</li>
                                <li>Visual consistency</li>
                                <li>Multimodal AI insights</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;

        if (window.sceneFlowAI) {
            window.sceneFlowAI.showModal(modalContent);
        }
    }

    // Export and Download Methods
    exportStoryboard(storyboardId) {
        this.showNotification('Exporting storyboard...', 'info');
        // In production, this would generate a PDF or other export format
        setTimeout(() => {
            this.showNotification('Storyboard exported successfully!', 'success');
        }, 2000);
    }

    downloadDirectionPackage(directionId) {
        this.showNotification('Preparing direction package...', 'info');
        // In production, this would generate a downloadable package
        setTimeout(() => {
            this.showNotification('Direction package ready for download!', 'success');
        }, 2000);
    }

    downloadVideo(videoId) {
        this.showNotification('Preparing video download...', 'info');
        // In production, this would provide the actual video file
        setTimeout(() => {
            this.showNotification('Video download started!', 'success');
        }, 2000);
    }
}

// BYOK Manager for handling user's API keys securely
class BYOKManager {
    constructor() {
        this.storageKey = 'sceneflow_byok_keys';
        this.encryptionKey = 'sceneflow_encryption_key'; // In production, use proper KMS
    }

    async hasValidAPIKey() {
        const keys = this.getStoredKeys();
        return keys.gemini && keys.gemini.isValid && keys.gemini.lastVerifiedAt > Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    }

    async getDecryptedAPIKey() {
        const keys = this.getStoredKeys();
        if (!keys.gemini || !keys.gemini.encryptedKey) {
            throw new Error('No valid Gemini API key found');
        }
        
        // In production, this would use proper KMS decryption
        return this.decryptKey(keys.gemini.encryptedKey);
    }

    async saveAPIKey(provider, apiKey) {
        try {
            // Validate the API key with a test call
            const isValid = await this.validateAPIKey(provider, apiKey);
            if (!isValid) {
                throw new Error('Invalid API key');
            }

            // Encrypt and store the key
            const encryptedKey = this.encryptKey(apiKey);
            const keys = this.getStoredKeys();
            
            keys[provider] = {
                encryptedKey,
                isValid: true,
                lastVerifiedAt: Date.now(),
                provider
            };

            this.storeKeys(keys);
            return true;
        } catch (error) {
            console.error('Error saving API key:', error);
            throw error;
        }
    }

    async validateAPIKey(provider, apiKey) {
        // In production, make actual API call to validate
        // For now, simulate validation
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(apiKey && apiKey.length > 20);
            }, 1000);
        });
    }

    getStoredKeys() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('Error reading stored keys:', error);
            return {};
        }
    }

    storeKeys(keys) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(keys));
        } catch (error) {
            console.error('Error storing keys:', error);
        }
    }

    // Simple encryption/decryption (In production, use proper KMS)
    encryptKey(key) {
        return btoa(key); // Base64 encoding for demo
    }

    decryptKey(encryptedKey) {
        return atob(encryptedKey); // Base64 decoding for demo
    }
}

// Unified Credit Manager implementing the credit system from specification
class CreditManager {
    constructor() {
        this.creditCosts = {
            PROJECT_START: 5,
            STORYBOARD_REGENERATION: 5,
            RENDER_HD: 2, // per minute
            RENDER_4K: 5, // per minute
            ANALYSIS_STANDARD: 1, // per minute
            ANALYSIS_ADVANCED: 4 // per minute
        };
    }

    async reserveCredits(amount, reason) {
        const user = this.getCurrentUser();
        if (!user) return false;

        if (user.credits < amount) {
            return false;
        }

        // Reserve credits (don't deduct yet)
        user.reservedCredits = (user.reservedCredits || 0) + amount;
        this.updateUser(user);
        return true;
    }

    async deductCredits(amount, reason, metadata = {}) {
        const user = this.getCurrentUser();
        if (!user) return false;

        // Release reserved credits and deduct actual credits
        user.reservedCredits = Math.max(0, (user.reservedCredits || 0) - amount);
        user.credits = Math.max(0, user.credits - amount);

        // Record transaction
        await this.recordCreditTransaction(user.id, -amount, reason, metadata);

        this.updateUser(user);
        return true;
    }

    async refundCredits(amount, reason) {
        const user = this.getCurrentUser();
        if (!user) return false;

        user.credits += amount;
        
        // Record refund transaction
        await this.recordCreditTransaction(user.id, amount, reason, { refund: true });

        this.updateUser(user);
        return true;
    }

    async recordCreditTransaction(userId, delta, reason, metadata = {}) {
        const transaction = {
            id: `txn-${Date.now()}`,
            userId,
            delta,
            reason,
            balanceSnapshot: this.getCurrentUser()?.credits || 0,
            metadata,
            timestamp: new Date().toISOString()
        };

        // In production, this would be sent to backend
        console.log('Credit transaction:', transaction);
        
        // Store locally for demo
        const transactions = this.getStoredTransactions();
        transactions.push(transaction);
        this.storeTransactions(transactions);
    }

    getCurrentUser() {
        if (window.sceneFlowAI && window.sceneFlowAI.currentUser) {
            return window.sceneFlowAI.currentUser;
        }
        
        // Fallback to localStorage
        try {
            const stored = localStorage.getItem('currentUser');
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            return null;
        }
    }

    updateUser(user) {
        if (window.sceneFlowAI) {
            window.sceneFlowAI.currentUser = user;
            window.sceneFlowAI.updateUIForUser(user);
        }
        
        // Update localStorage
        localStorage.setItem('currentUser', JSON.stringify(user));
    }

    getStoredTransactions() {
        try {
            const stored = localStorage.getItem('sceneflow_credit_transactions');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            return [];
        }
    }

    storeTransactions(transactions) {
        try {
            localStorage.setItem('sceneflow_credit_transactions', JSON.stringify(transactions));
        } catch (error) {
            console.error('Error storing transactions:', error);
        }
    }

    calculateRenderingCost(durationMinutes, resolution = '1080p') {
        const costPerMinute = resolution === '4K' ? this.creditCosts.RENDER_4K : this.creditCosts.RENDER_HD;
        return Math.ceil(durationMinutes * costPerMinute);
    }

    calculateAnalysisCost(durationMinutes, analysisType = 'standard') {
        const costPerMinute = analysisType === 'advanced' ? this.creditCosts.ANALYSIS_ADVANCED : this.creditCosts.ANALYSIS_STANDARD;
        return Math.ceil(durationMinutes * costPerMinute);
    }
}

// Cue Assistant - DISABLED to resolve connection issues
class CueAssistant {
    constructor(workflowManager) {
        this.workflowManager = workflowManager;
        this.disabled = true; // Mark as disabled
        console.log('Cue AI Assistant in workflow.js DISABLED - Connection issues resolved');
    }

    init() {
        // Do nothing - API disabled
        console.log('Cue AI Assistant initialization skipped - API disabled');
    }

    setupSpeechRecognition() {
        // Speech recognition disabled
        console.log('Cue speech recognition disabled');
    }

    setupEventListeners() {
        // Event listeners disabled
        console.log('Cue event listeners disabled');
    }

    createCueInterface() {
        // Cue interface creation disabled
        console.log('Cue interface creation disabled');
        return false;
    }

    toggleCueInterface() {
        console.log('Cue interface toggle disabled');
        return false;
    }

    toggleVoiceInput() {
        console.log('Cue voice input toggle disabled');
        return false;
    }

    startListening() {
        console.log('Cue voice listening disabled');
        return false;
    }

    stopListening() {
        console.log('Cue voice listening disabled');
        return false;
    }

    handleVoiceInput(transcript) {
        this.stopListening();
        
        // Set the input value
        const cueInput = document.getElementById('cueInput');
        if (cueInput) {
            cueInput.value = transcript;
        }
        
        // Process the voice input
        this.processUserInput(transcript);
    }

    sendMessage() {
        const cueInput = document.getElementById('cueInput');
        if (!cueInput || !cueInput.value.trim()) return;

        const message = cueInput.value.trim();
        this.processUserInput(message);
        cueInput.value = '';
    }

    async processUserInput(userInput) {
        // Add user message to conversation
        this.addMessage('user', userInput);
        
        // Update context based on current workflow step
        this.updateContext();
        
        try {
            // Generate AI response using Gemini API (via BYOK)
            const response = await this.generateAIResponse(userInput);
            
            // Add AI response to conversation
            this.addMessage('assistant', response);
            
            // Process any actions from the response
            await this.processCueActions(response);
            
        } catch (error) {
            console.error('Error generating Cue response:', error);
            this.addMessage('assistant', 'I apologize, but I encountered an error. Please try again or contact support if the issue persists.');
        }
    }

    async generateAIResponse(userInput) {
        // In production, this would call Gemini API with the user's BYOK key
        // For now, simulating intelligent responses based on context
        
        const context = this.getCurrentContext();
        const project = this.workflowManager.workflowData;
        
        // Simulate AI processing delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Generate contextual response
        return this.generateContextualResponse(userInput, context, project);
    }

    generateContextualResponse(userInput, context, project) {
        const input = userInput.toLowerCase();
        
        // Scene modification requests
        if (input.includes('darker') || input.includes('dark')) {
            return "I'll make that scene darker for you. This will create more dramatic lighting and enhance the mood. Would you like me to adjust the brightness by 20% or would you prefer a different level?";
        }
        
        if (input.includes('close-up') || input.includes('closeup')) {
            return "Perfect! A close-up shot will create more intimacy and focus on the subject. I'll update the storyboard to change that shot from a medium to a close-up. This will require regenerating the storyboard panel - would you like me to proceed?";
        }
        
        if (input.includes('pacing') || input.includes('faster') || input.includes('slower')) {
            return "I can help improve the pacing. Based on your current storyboard, I recommend adjusting the shot duration in scene 3 from 4 seconds to 2.5 seconds to create more dynamic movement. Should I implement this change?";
        }
        
        // Project guidance
        if (input.includes('help') || input.includes('guidance')) {
            return "I'm here to help! You're currently in the ${context} phase. I can help you iterate on your ideas, refine your storyboard, or guide you through the next steps. What specific aspect would you like assistance with?";
        }
        
        if (input.includes('next') || input.includes('continue')) {
            return "Great! You're ready to move to the next step. Based on your current progress, you should proceed to ${this.getNextStep(context)}. Would you like me to guide you through this transition?";
        }
        
        // Default response
        return "I understand you want to ${userInput}. Let me analyze your current project context and provide specific recommendations. Could you give me a bit more detail about what you're trying to achieve?";
    }

    async processCueActions(response) {
        // Extract and execute any actions from the AI response
        const actions = this.extractActions(response);
        
        for (const action of actions) {
            await this.executeAction(action);
        }
    }

    extractActions(response) {
        console.log('Cue action extraction disabled');
        return [];
    }

    async executeAction(action) {
        console.log('Cue action execution disabled');
        return false;
    }

    quickAction(action) {
        const actionMap = {
            'make_scene_darker': 'Make scene 2 darker and more dramatic',
            'change_to_closeup': 'Change the medium shot to a close-up for more intimacy',
            'improve_pacing': 'Analyze and improve the pacing of your current sequence'
        };
        
        const userInput = actionMap[action] || action;
        this.processUserInput(userInput);
    }

    addMessage(sender, content) {
        const messagesContainer = document.getElementById('cueMessages');
        if (!messagesContainer) return;

        const messageHTML = `
            <div class="cue-message cue-${sender}-message">
                <div class="cue-avatar">
                    <i class="fas fa-${sender === 'user' ? 'user' : 'robot'}"></i>
                </div>
                <div class="cue-content">
                    <p>${content}</p>
                </div>
            </div>
        `;

        messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    updateContext() {
        const currentStep = this.workflowManager.currentStep;
        const stepNames = ['', 'ideation', 'storyboard', 'sceneDirection', 'videoGeneration', 'testScreening'];
        this.currentContext = stepNames[currentStep] || 'general';
    }

    getCurrentContext() {
        return this.currentContext;
    }

    getNextStep(currentStep) {
        const stepFlow = {
            'ideation': 'storyboard creation',
            'storyboard': 'scene direction',
            'sceneDirection': 'auto-editor',
            'videoGeneration': 'test screening',
            'testScreening': 'project completion'
        };
        return stepFlow[currentStep] || 'the next phase';
    }

    setLanguage(language) {
        this.userLanguage = language;
        if (this.speechRecognition) {
            this.speechRecognition.lang = this.getLanguageCode(language);
        }
    }

    getLanguageCode(language) {
        const languageCodes = {
            'en': 'en-US',
            'es': 'es-ES',
            'fr': 'fr-FR',
            'de': 'de-DE',
            'ja': 'ja-JP',
            'zh': 'zh-CN'
        };
        return languageCodes[language] || 'en-US';
    }

    speakText(text) {
        if (this.speechSynthesis) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = this.getLanguageCode(this.userLanguage);
            utterance.rate = 0.9;
            this.speechSynthesis.speak(utterance);
        }
    }

    showNotification(message, type = 'info') {
        if (this.workflowManager) {
            this.workflowManager.showNotification(message, type);
        }
    }
}

// Global functions for workflow
function generateIdeas() {
    if (window.workflowManager) {
        window.workflowManager.generateIdeas();
    }
}

function selectIdea(ideaId) {
    if (window.workflowManager) {
        window.workflowManager.selectIdea(ideaId);
    }
}

function iterateIdea(ideaId) {
    if (window.workflowManager) {
        window.workflowManager.iterateIdea(ideaId);
    }
}

function submitIteration(ideaId) {
    if (window.workflowManager) {
        window.workflowManager.submitIteration(ideaId);
    }
}

function watchVideo(videoId) {
    if (window.workflowManager) {
        window.workflowManager.watchVideo(videoId);
    }
}

function inspireFromVideo(videoId) {
    if (window.workflowManager) {
        window.workflowManager.inspireFromVideo(videoId);
    }
}

// BYOK Management Functions
function saveBYOK() {
    const geminiKey = document.getElementById('geminiApiKey').value;
    const confirmKey = document.getElementById('confirmApiKey').value;
    
    if (!geminiKey || !confirmKey) {
        window.workflowManager.showNotification('Please fill in both fields', 'error');
        return;
    }
    
    if (geminiKey !== confirmKey) {
        window.workflowManager.showNotification('API keys do not match', 'error');
        return;
    }
    
    if (window.workflowManager && window.workflowManager.byokManager) {
        window.workflowManager.byokManager.saveAPIKey('gemini', geminiKey)
            .then(() => {
                window.workflowManager.showNotification('API key saved successfully!', 'success');
                if (window.sceneFlowAI) {
                    window.sceneFlowAI.closeModal();
                }
            })
            .catch(error => {
                window.workflowManager.showNotification(`Failed to save API key: ${error.message}`, 'error');
            });
    }
}

function closeModal() {
    if (window.sceneFlowAI) {
        window.sceneFlowAI.closeModal();
    }
}

// Credit Management Functions
function showCreditPurchaseModal() {
    const modalContent = `
        <div class="modal-header">
            <h3>Purchase Credits</h3>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-content">
            <div class="credit-purchase">
                <h4>Choose Your Plan</h4>
                <p>Select a subscription plan to continue using SceneFlow AI</p>
                
                <div class="subscription-tiers">
                    <div class="tier-card">
                        <h5>Trial</h5>
                        <div class="price">$5</div>
                        <div class="credits">50 Credits (One-Time)</div>
                        <ul>
                            <li>7-Day access to Creator features</li>
                            <li>1080p Max resolution</li>
                            <li>Requires payment info</li>
                        </ul>
                        <button class="btn-primary" onclick="selectTier('trial')">Start Trial</button>
                    </div>
                    
                    <div class="tier-card featured">
                        <h5>Creator</h5>
                        <div class="price">$29/month</div>
                        <div class="credits">1500 Credits</div>
                        <ul>
                            <li>1080p Rendering</li>
                            <li>Standard Analysis</li>
                            <li>BYOK Generation</li>
                            <li>Multilingual Support</li>
                        </ul>
                        <button class="btn-primary" onclick="selectTier('creator')">Choose Creator</button>
                    </div>
                    
                    <div class="tier-card">
                        <h5>Pro</h5>
                        <div class="price">$79/month</div>
                        <div class="credits">500 Credits</div>
                        <ul>
                            <li>4K Rendering</li>
                            <li>Advanced Analysis</li>
                            <li>5 Team Members</li>
                            <li>Downloadable Direction Packages</li>
                        </ul>
                        <button class="btn-primary" onclick="selectTier('pro')">Choose Pro</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    if (window.sceneFlowAI) {
        window.sceneFlowAI.showModal(modalContent);
    }
}

function selectTier(tier) {
    // In production, this would redirect to Stripe checkout
    window.workflowManager.showNotification(`Redirecting to ${tier} plan checkout...`, 'info');
    
    // Simulate subscription activation
    setTimeout(() => {
        const user = window.workflowManager.creditManager.getCurrentUser();
        if (user) {
            const tierCredits = {
                'trial': 500,
                'creator': 1500,
                'pro': 5000
            };
            
            user.credits = tierCredits[tier] || 1500;
            user.subscriptionTier = tier;
            window.workflowManager.creditManager.updateUser(user);
            
            window.workflowManager.showNotification(`Subscription activated! You now have ${user.credits} credits.`, 'success');
            if (window.sceneFlowAI) {
                window.sceneFlowAI.closeModal();
            }
        }
    }, 2000);
}

function showCreditHistory() {
    if (window.workflowManager) {
        window.workflowManager.showCreditHistory();
    }
}

// Resolution and Analysis Selection Functions
function selectResolution(resolution) {
    if (window.workflowManager) {
        window.workflowManager.generateVideoWithAutoEditor(
            window.workflowManager.workflowData.projectId, 
            resolution
        );
        if (window.sceneFlowAI) {
            window.sceneFlowAI.closeModal();
        }
    }
}

function selectAnalysisType(analysisType) {
    if (window.workflowManager) {
        // This would trigger the analysis workflow
        window.workflowManager.showNotification(`Starting ${analysisType} analysis...`, 'info');
        if (window.sceneFlowAI) {
            window.sceneFlowAI.closeModal();
        }
    }
}

// Internationalization (i18n) Support
class I18nManager {
    constructor() {
        this.currentLanguage = 'en';
        this.translations = {
            en: {
                // Workflow Steps
                ideation: 'Ideation',
                storyboard: 'Storyboard',
                sceneDirection: 'Scene Direction',
                videoGeneration: 'Video Generation',
                testScreening: 'Test Screening',
                
                // Common Actions
                continue: 'Continue',
                back: 'Back',
                save: 'Save',
                cancel: 'Cancel',
                download: 'Download',
                export: 'Export',
                
                // Notifications
                success: 'Success',
                error: 'Error',
                info: 'Information',
                warning: 'Warning',
                
                // Cue Assistant
                cueTitle: 'Cue - Your AI Director Assistant',
                cueGreeting: 'Hello! I\'m Cue, your AI director assistant. I can help you iterate on your video projects, provide guidance, and answer questions. How can I help you today?',
                cuePlaceholder: 'Ask Cue anything about your project...',
                
                // Credit System
                credits: 'Credits',
                insufficientCredits: 'Insufficient credits',
                purchaseCredits: 'Purchase Credits',
                creditBalance: 'Credit Balance',
                
                // BYOK
                apiKeyRequired: 'API Key Required',
                byokSetup: 'Bring Your Own Key (BYOK) Setup',
                byokDescription: 'SceneFlow AI requires your Google Gemini API key for generating visual assets. We focus on orchestration and editing while you control your generation costs.',
                geminiApiKey: 'Google Gemini API Key',
                confirmApiKey: 'Confirm API Key',
                keySecureNote: 'Your key is encrypted and stored securely. We never see the raw value.',
                
                // Subscription Tiers
                choosePlan: 'Choose Your Plan',
                selectPlan: 'Select a subscription plan to continue using SceneFlow AI',
                trial: 'Trial',
                creator: 'Creator',
                pro: 'Pro',
                studio: 'Studio',
                startTrial: 'Start Trial',
                chooseCreator: 'Choose Creator',
                choosePro: 'Choose Pro',
                chooseStudio: 'Choose Studio'
            },
            es: {
                // Spanish translations
                ideation: 'Ideación',
                storyboard: 'Guión Gráfico',
                sceneDirection: 'Dirección de Escena',
                videoGeneration: 'Generación de Video',
                testScreening: 'Proyección de Prueba',
                
                continue: 'Continuar',
                back: 'Atrás',
                save: 'Guardar',
                cancel: 'Cancelar',
                download: 'Descargar',
                export: 'Exportar',
                
                success: 'Éxito',
                error: 'Error',
                info: 'Información',
                warning: 'Advertencia',
                
                cueTitle: 'Cue - Tu Asistente de Dirección IA',
                cueGreeting: '¡Hola! Soy Cue, tu asistente de dirección IA. Puedo ayudarte a iterar en tus proyectos de video, proporcionar orientación y responder preguntas. ¿Cómo puedo ayudarte hoy?',
                cuePlaceholder: 'Pregúntale a Cue cualquier cosa sobre tu proyecto...',
                
                credits: 'Créditos',
                insufficientCredits: 'Créditos insuficientes',
                purchaseCredits: 'Comprar Créditos',
                creditBalance: 'Saldo de Créditos',
                
                apiKeyRequired: 'Clave API Requerida',
                byokSetup: 'Configuración de Trae Tu Propia Clave (BYOK)',
                byokDescription: 'SceneFlow AI requiere tu clave API de Google Gemini para generar activos visuales. Nos enfocamos en orquestación y edición mientras tú controlas tus costos de generación.',
                geminiApiKey: 'Clave API de Google Gemini',
                confirmApiKey: 'Confirmar Clave API',
                keySecureNote: 'Tu clave está encriptada y almacenada de forma segura. Nunca vemos el valor original.'
            },
            fr: {
                // French translations
                ideation: 'Idéation',
                storyboard: 'Storyboard',
                sceneDirection: 'Direction de Scène',
                videoGeneration: 'Génération de Vidéo',
                testScreening: 'Projection de Test',
                
                continue: 'Continuer',
                back: 'Retour',
                save: 'Sauvegarder',
                cancel: 'Annuler',
                download: 'Télécharger',
                export: 'Exporter',
                
                success: 'Succès',
                error: 'Erreur',
                info: 'Information',
                warning: 'Avertissement',
                
                cueTitle: 'Cue - Votre Assistant de Réalisation IA',
                cueGreeting: 'Bonjour ! Je suis Cue, votre assistant de réalisation IA. Je peux vous aider à itérer sur vos projets vidéo, fournir des conseils et répondre à vos questions. Comment puis-je vous aider aujourd\'hui ?',
                cuePlaceholder: 'Demandez à Cue n\'importe quoi sur votre projet...',
                
                credits: 'Crédits',
                insufficientCredits: 'Crédits insuffisants',
                purchaseCredits: 'Acheter des Crédits',
                creditBalance: 'Solde de Crédits',
                
                apiKeyRequired: 'Clé API Requise',
                byokSetup: 'Configuration Apportez Votre Propre Clé (BYOK)',
                byokDescription: 'SceneFlow AI nécessite votre clé API Google Gemini pour générer des actifs visuels. Nous nous concentrons sur l\'orchestration et l\'édition pendant que vous contrôlez vos coûts de génération.',
                geminiApiKey: 'Clé API Google Gemini',
                confirmApiKey: 'Confirmer la Clé API',
                keySecureNote: 'Votre clé est chiffrée et stockée en toute sécurité. Nous ne voyons jamais la valeur originale.'
            }
        };
        
        this.init();
    }

    init() {
        this.loadLanguagePreference();
        this.applyTranslations();
    }

    loadLanguagePreference() {
        const savedLanguage = localStorage.getItem('sceneflow_language');
        if (savedLanguage && this.translations[savedLanguage]) {
            this.currentLanguage = savedLanguage;
        }
    }

    setLanguage(language) {
        if (this.translations[language]) {
            this.currentLanguage = language;
            localStorage.setItem('sceneflow_language', language);
            this.applyTranslations();
            
            // Update Cue Assistant language
            if (window.workflowManager && window.workflowManager.cueAssistant) {
                window.workflowManager.cueAssistant.setLanguage(language);
            }
        }
    }

    getText(key) {
        const translation = this.translations[this.currentLanguage];
        return translation && translation[key] ? translation[key] : this.translations.en[key] || key;
    }

    applyTranslations() {
        // Apply translations to existing UI elements
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            element.textContent = this.getText(key);
        });
    }

    getCurrentLanguage() {
        return this.currentLanguage;
    }

    getSupportedLanguages() {
        return Object.keys(this.translations);
    }
}

// Initialize i18n manager
let i18nManager;

// Initialize workflow manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - initializing components...');
    
    // Initialize internationalization first
    i18nManager = new I18nManager();
    
    // Wait a bit more to ensure all scripts are loaded
    setTimeout(() => {
        try {
            console.log('Initializing WorkflowManager...');
            window.workflowManager = new WorkflowManager();
            console.log('WorkflowManager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize WorkflowManager:', error);
        }
        
        // Make i18n manager globally accessible
        window.i18nManager = i18nManager;
    }, 500);
});
