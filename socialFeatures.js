// Social Features System for Chess Puzzle Trainer
class SocialFeatures {
    constructor() {
        this.friends = [];
        this.challenges = [];
        this.sharedPuzzles = [];
        this.comments = {};
        this.notifications = [];
        this.loadSocialData();
    }

    loadSocialData() {
        const savedData = localStorage.getItem('socialData');
        if (savedData) {
            const data = JSON.parse(savedData);
            this.friends = data.friends || [];
            this.challenges = data.challenges || [];
            this.sharedPuzzles = data.sharedPuzzles || [];
            this.comments = data.comments || {};
            this.notifications = data.notifications || [];
        }
    }

    saveSocialData() {
        localStorage.setItem('socialData', JSON.stringify({
            friends: this.friends,
            challenges: this.challenges,
            sharedPuzzles: this.sharedPuzzles,
            comments: this.comments,
            notifications: this.notifications
        }));
    }

    // Friend System
    addFriend(username) {
        const friend = {
            id: Date.now(),
            username: username,
            addedAt: new Date().toISOString(),
            status: 'pending',
            stats: {
                rating: 1200 + Math.floor(Math.random() * 800),
                puzzlesSolved: Math.floor(Math.random() * 1000),
                winRate: 0
            }
        };
        
        this.friends.push(friend);
        this.saveSocialData();
        
        this.createNotification({
            type: 'friend_request',
            message: `Friend request sent to ${username}`,
            timestamp: Date.now()
        });
        
        // Simulate friend acceptance after delay
        setTimeout(() => {
            this.acceptFriend(friend.id);
        }, 3000);
        
        return friend;
    }

    acceptFriend(friendId) {
        const friend = this.friends.find(f => f.id === friendId);
        if (friend) {
            friend.status = 'accepted';
            this.saveSocialData();
            
            this.createNotification({
                type: 'friend_accepted',
                message: `${friend.username} accepted your friend request!`,
                timestamp: Date.now()
            });
        }
    }

    removeFriend(friendId) {
        this.friends = this.friends.filter(f => f.id !== friendId);
        this.saveSocialData();
    }

    getFriendsList() {
        return this.friends.filter(f => f.status === 'accepted');
    }

    // Challenge System
    createChallenge(friendId, puzzleId, options = {}) {
        const friend = this.friends.find(f => f.id === friendId);
        if (!friend) return null;
        
        const challenge = {
            id: Date.now(),
            from: this.getCurrentUser(),
            to: friend.username,
            friendId: friendId,
            puzzleId: puzzleId,
            status: 'pending',
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            wager: options.wager || 0,
            timeLimit: options.timeLimit || null,
            results: {
                challenger: null,
                challenged: null
            }
        };
        
        this.challenges.push(challenge);
        this.saveSocialData();
        
        // Send notification to friend
        this.createNotification({
            type: 'challenge_received',
            message: `${this.getCurrentUser()} challenged you to a puzzle!`,
            challengeId: challenge.id,
            timestamp: Date.now()
        });
        
        return challenge;
    }

    acceptChallenge(challengeId) {
        const challenge = this.challenges.find(c => c.id === challengeId);
        if (challenge) {
            challenge.status = 'active';
            this.saveSocialData();
            return challenge;
        }
        return null;
    }

    completeChallenge(challengeId, userId, result) {
        const challenge = this.challenges.find(c => c.id === challengeId);
        if (!challenge) return;
        
        if (userId === this.getCurrentUser()) {
            challenge.results.challenger = result;
        } else {
            challenge.results.challenged = result;
        }
        
        // Check if both completed
        if (challenge.results.challenger && challenge.results.challenged) {
            challenge.status = 'completed';
            this.determineWinner(challenge);
        }
        
        this.saveSocialData();
    }

    determineWinner(challenge) {
        const { challenger, challenged } = challenge.results;
        let winner = null;
        
        // Compare results
        if (challenger.solved && challenged.solved) {
            // Both solved, check time
            winner = challenger.time < challenged.time ? 'challenger' : 'challenged';
        } else if (challenger.solved) {
            winner = 'challenger';
        } else if (challenged.solved) {
            winner = 'challenged';
        }
        
        challenge.winner = winner;
        
        // Create notifications
        if (winner) {
            const winnerName = winner === 'challenger' ? challenge.from : challenge.to;
            this.createNotification({
                type: 'challenge_complete',
                message: `${winnerName} won the challenge!`,
                challengeId: challenge.id,
                timestamp: Date.now()
            });
        }
    }

    // Puzzle Sharing
    sharePuzzle(puzzleId, options = {}) {
        const shareData = {
            id: Date.now(),
            puzzleId: puzzleId,
            sharedBy: this.getCurrentUser(),
            sharedAt: new Date().toISOString(),
            message: options.message || '',
            recipients: options.recipients || 'public',
            likes: 0,
            views: 0,
            solves: 0
        };
        
        this.sharedPuzzles.push(shareData);
        this.saveSocialData();
        
        // Generate share link
        const shareLink = this.generateShareLink(shareData.id);
        
        // If sharing to specific friends
        if (Array.isArray(options.recipients)) {
            options.recipients.forEach(friendId => {
                this.createNotification({
                    type: 'puzzle_shared',
                    message: `${this.getCurrentUser()} shared a puzzle with you!`,
                    shareId: shareData.id,
                    timestamp: Date.now()
                });
            });
        }
        
        return {
            shareData,
            shareLink,
            shareCode: this.generateShareCode(shareData.id)
        };
    }

    generateShareLink(shareId) {
        const baseUrl = window.location.origin;
        return `${baseUrl}/puzzle/shared/${shareId}`;
    }

    generateShareCode(shareId) {
        return btoa(shareId.toString()).slice(0, 8).toUpperCase();
    }

    likePuzzle(shareId) {
        const shared = this.sharedPuzzles.find(s => s.id === shareId);
        if (shared) {
            shared.likes++;
            this.saveSocialData();
            return true;
        }
        return false;
    }

    // Comments System
    addComment(puzzleId, text, parentId = null) {
        if (!this.comments[puzzleId]) {
            this.comments[puzzleId] = [];
        }
        
        const comment = {
            id: Date.now(),
            author: this.getCurrentUser(),
            text: text,
            timestamp: new Date().toISOString(),
            likes: 0,
            parentId: parentId,
            replies: []
        };
        
        if (parentId) {
            // Find parent and add as reply
            const parent = this.findComment(puzzleId, parentId);
            if (parent) {
                parent.replies.push(comment);
            }
        } else {
            this.comments[puzzleId].push(comment);
        }
        
        this.saveSocialData();
        return comment;
    }

    findComment(puzzleId, commentId) {
        const comments = this.comments[puzzleId] || [];
        
        function search(commentList) {
            for (const comment of commentList) {
                if (comment.id === commentId) return comment;
                const found = search(comment.replies || []);
                if (found) return found;
            }
            return null;
        }
        
        return search(comments);
    }

    likeComment(puzzleId, commentId) {
        const comment = this.findComment(puzzleId, commentId);
        if (comment) {
            comment.likes++;
            this.saveSocialData();
            return true;
        }
        return false;
    }

    getComments(puzzleId) {
        return this.comments[puzzleId] || [];
    }

    // Notification System
    createNotification(notification) {
        notification.id = Date.now();
        notification.read = false;
        
        this.notifications.unshift(notification);
        
        // Keep only last 50 notifications
        if (this.notifications.length > 50) {
            this.notifications = this.notifications.slice(0, 50);
        }
        
        this.saveSocialData();
        this.showNotificationUI(notification);
    }

    markNotificationRead(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
            this.saveSocialData();
        }
    }

    getUnreadCount() {
        return this.notifications.filter(n => !n.read).length;
    }

    // Leaderboard Integration
    getFriendsLeaderboard() {
        const friends = this.getFriendsList();
        const currentUser = {
            username: this.getCurrentUser(),
            stats: this.getCurrentUserStats()
        };
        
        const leaderboard = [currentUser, ...friends].map(user => ({
            username: user.username || user.stats.username,
            rating: user.stats.rating,
            puzzlesSolved: user.stats.puzzlesSolved || user.stats.totalPuzzlesSolved,
            accuracy: user.stats.accuracy || 0,
            streak: user.stats.streak || 0
        }));
        
        leaderboard.sort((a, b) => b.rating - a.rating);
        
        return leaderboard.map((user, index) => ({
            ...user,
            rank: index + 1
        }));
    }

    // Activity Feed
    getActivityFeed() {
        const activities = [];
        
        // Add friend activities
        this.friends.forEach(friend => {
            if (friend.status === 'accepted') {
                activities.push({
                    type: 'friend_added',
                    user: friend.username,
                    timestamp: friend.addedAt,
                    message: `became friends with ${friend.username}`
                });
            }
        });
        
        // Add shared puzzles
        this.sharedPuzzles.forEach(share => {
            activities.push({
                type: 'puzzle_shared',
                user: share.sharedBy,
                timestamp: share.sharedAt,
                message: `shared a puzzle`,
                likes: share.likes
            });
        });
        
        // Add completed challenges
        this.challenges.filter(c => c.status === 'completed').forEach(challenge => {
            activities.push({
                type: 'challenge_complete',
                user: challenge.from,
                timestamp: challenge.createdAt,
                message: `completed a challenge with ${challenge.to}`,
                winner: challenge.winner
            });
        });
        
        // Sort by timestamp
        activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        return activities.slice(0, 20); // Return latest 20 activities
    }

    // Helper Methods
    getCurrentUser() {
        const userData = JSON.parse(localStorage.getItem('currentChessUser') || '{}');
        return userData.username || 'Guest';
    }

    getCurrentUserStats() {
        const userData = JSON.parse(localStorage.getItem('currentChessUser') || '{}');
        return userData.trainingData || {
            rating: 1200,
            totalPuzzlesSolved: 0,
            accuracy: 0,
            streak: 0
        };
    }

    // UI Methods
    showNotificationUI(notification) {
        const notifElement = document.createElement('div');
        notifElement.className = 'social-notification';
        notifElement.innerHTML = `
            <div class="notif-icon">${this.getNotificationIcon(notification.type)}</div>
            <div class="notif-content">
                <div class="notif-message">${notification.message}</div>
                <div class="notif-time">Just now</div>
            </div>
        `;
        
        document.body.appendChild(notifElement);
        
        setTimeout(() => {
            notifElement.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notifElement.classList.remove('show');
            setTimeout(() => notifElement.remove(), 300);
        }, 5000);
    }

    getNotificationIcon(type) {
        const icons = {
            'friend_request': '👥',
            'friend_accepted': '✅',
            'challenge_received': '⚔️',
            'challenge_complete': '🏆',
            'puzzle_shared': '🔗',
            'comment': '💬',
            'like': '❤️'
        };
        return icons[type] || '📬';
    }

    // Share to Social Media
    shareToSocialMedia(platform, puzzleData) {
        const text = `I just solved this chess puzzle in ${puzzleData.time} seconds! Can you beat my time?`;
        const url = this.generateShareLink(puzzleData.id);
        
        const shareUrls = {
            twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
            reddit: `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`,
            whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + url)}`
        };
        
        if (shareUrls[platform]) {
            window.open(shareUrls[platform], '_blank', 'width=600,height=400');
            return true;
        }
        
        return false;
    }

    // Copy share link to clipboard
    copyShareLink(shareId) {
        const link = this.generateShareLink(shareId);
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(link).then(() => {
                this.showNotificationUI({
                    type: 'success',
                    message: 'Share link copied to clipboard!'
                });
            });
        } else {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = link;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            
            this.showNotificationUI({
                type: 'success',
                message: 'Share link copied!'
            });
        }
    }
}

// Add social features CSS
const style = document.createElement('style');
style.textContent = `
    .social-notification {
        position: fixed;
        bottom: 20px;
        left: -400px;
        background: linear-gradient(135deg, #8b5cf6, #3b82f6);
        color: white;
        padding: 15px 20px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 15px;
        transition: left 0.3s ease;
        z-index: 10000;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        max-width: 350px;
    }

    .social-notification.show {
        left: 20px;
    }

    .notif-icon {
        font-size: 24px;
    }

    .notif-message {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 2px;
    }

    .notif-time {
        font-size: 12px;
        opacity: 0.8;
    }

    .friends-panel {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 15px;
        margin: 15px 0;
    }

    .friend-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        margin-bottom: 8px;
        transition: all 0.3s ease;
    }

    .friend-item:hover {
        background: rgba(255, 255, 255, 0.08);
        transform: translateX(5px);
    }

    .friend-info {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .friend-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: linear-gradient(135deg, var(--primary), var(--secondary));
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 14px;
    }

    .friend-name {
        font-size: 14px;
        font-weight: 600;
    }

    .friend-rating {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
    }

    .challenge-btn {
        padding: 6px 12px;
        background: linear-gradient(135deg, #ef4444, #dc2626);
        border: none;
        border-radius: 6px;
        color: white;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .challenge-btn:hover {
        transform: scale(1.05);
        box-shadow: 0 5px 15px rgba(239, 68, 68, 0.3);
    }

    .share-panel {
        display: flex;
        gap: 10px;
        margin: 15px 0;
    }

    .share-btn {
        flex: 1;
        padding: 8px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        color: white;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
    }

    .share-btn:hover {
        background: rgba(255, 255, 255, 0.15);
        border-color: var(--primary);
    }

    .comments-section {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 15px;
        margin: 15px 0;
    }

    .comment-item {
        padding: 10px;
        border-left: 2px solid var(--primary);
        margin-bottom: 10px;
    }

    .comment-author {
        font-size: 12px;
        font-weight: 600;
        color: var(--primary);
        margin-bottom: 5px;
    }

    .comment-text {
        font-size: 13px;
        line-height: 1.4;
        margin-bottom: 5px;
    }

    .comment-actions {
        display: flex;
        gap: 15px;
        font-size: 11px;
        color: rgba(255, 255, 255, 0.5);
    }

    .comment-action {
        cursor: pointer;
        transition: color 0.3s ease;
    }

    .comment-action:hover {
        color: var(--primary);
    }

    .activity-feed {
        max-height: 300px;
        overflow-y: auto;
        padding: 10px;
    }

    .activity-item {
        display: flex;
        gap: 10px;
        padding: 8px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        font-size: 13px;
    }

    .activity-icon {
        font-size: 16px;
    }

    .activity-text {
        flex: 1;
        line-height: 1.4;
    }

    .activity-time {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.5);
    }
`;
document.head.appendChild(style);

// Export for use
window.SocialFeatures = SocialFeatures;