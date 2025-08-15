class UserAuth {
    constructor() {
        this.currentUser = null;
        this.apiBaseUrl = '/api';
        // Don't auto-initialize, let caller control when to initialize
    }

    async initializeAuth() {
        const userData = localStorage.getItem('currentChessUser');
        if (userData) {
            try {
                this.currentUser = JSON.parse(userData);
                // Verify user session is still valid by fetching fresh data
                await this.refreshUserData();
            } catch (error) {
                console.log('Session expired or invalid, logging out');
                this.logout();
            }
        }
    }

    async refreshUserData() {
        if (!this.currentUser) return;
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/user/${this.currentUser.id}/training-data`);
            if (response.ok) {
                const data = await response.json();
                this.currentUser.trainingData = data.trainingData;
                localStorage.setItem('currentChessUser', JSON.stringify(this.currentUser));
            } else {
                console.log('Failed to refresh user data, using cached data');
            }
        } catch (error) {
            console.log('Network error refreshing user data, using cached data:', error.message);
            // Don't throw error - just use cached data from localStorage
        }
    }

    async register(username, email, password) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            this.currentUser = data.user;
            localStorage.setItem('currentChessUser', JSON.stringify(this.currentUser));
            
            return {
                success: true,
                user: data.user
            };
        } catch (error) {
            throw new Error(error.message || 'Registration failed');
        }
    }

    async login(username, password) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            this.currentUser = data.user;
            localStorage.setItem('currentChessUser', JSON.stringify(this.currentUser));
            
            return {
                success: true,
                user: data.user
            };
        } catch (error) {
            throw new Error(error.message || 'Login failed');
        }
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentChessUser');
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    async updateUserData(trainingData) {
        if (!this.currentUser) return;
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/user/${this.currentUser.id}/training-data`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(trainingData)
            });

            if (response.ok) {
                // Update local copy
                this.currentUser.trainingData = { ...this.currentUser.trainingData, ...trainingData };
                localStorage.setItem('currentChessUser', JSON.stringify(this.currentUser));
            } else {
                console.error('Failed to update user data on server');
            }
        } catch (error) {
            console.error('Error updating user data:', error);
        }
    }

    async recordPuzzleAttempt(puzzleId, solved, timeSpent, hintsUsed) {
        if (!this.currentUser) return;

        try {
            const response = await fetch(`${this.apiBaseUrl}/user/${this.currentUser.id}/puzzle-attempt`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ puzzleId, solved, timeSpent, hintsUsed })
            });

            if (!response.ok) {
                console.error('Failed to record puzzle attempt');
            }
        } catch (error) {
            console.error('Error recording puzzle attempt:', error);
        }
    }

    async addAchievement(achievementId) {
        if (!this.currentUser) return;

        try {
            const response = await fetch(`${this.apiBaseUrl}/user/${this.currentUser.id}/achievement`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ achievementId })
            });

            if (!response.ok) {
                console.error('Failed to add achievement');
            }
        } catch (error) {
            console.error('Error adding achievement:', error);
        }
    }
}