// Sound Manager for Chess Puzzle Trainer
class SoundManager {
    constructor() {
        this.enabled = localStorage.getItem('soundEnabled') !== 'false';
        this.volume = parseFloat(localStorage.getItem('soundVolume') || '0.5');
        this.sounds = {};
        this.audioContext = null;
        
        // Initialize sounds
        this.initializeSounds();
    }

    initializeSounds() {
        // We'll use Web Audio API to generate sounds programmatically
        // This avoids needing external sound files
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Define sound configurations
            this.soundConfigs = {
                move: { frequency: 400, duration: 0.1, type: 'sine' },
                capture: { frequency: 600, duration: 0.15, type: 'square', volume: 0.3 },
                correct: { frequency: 800, duration: 0.3, type: 'sine', secondFreq: 1000 },
                incorrect: { frequency: 200, duration: 0.3, type: 'sawtooth' },
                gameStart: { frequency: 523, duration: 0.2, type: 'sine', secondFreq: 659 },
                gameEnd: { frequency: 659, duration: 0.4, type: 'sine', secondFreq: 523 },
                tick: { frequency: 1000, duration: 0.05, type: 'square', volume: 0.2 },
                achievement: { frequency: 523, duration: 0.5, type: 'sine', melody: true }
            };
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
            this.enabled = false;
        }
    }

    playSound(soundName) {
        if (!this.enabled || !this.audioContext) return;
        
        const config = this.soundConfigs[soundName];
        if (!config) return;

        try {
            if (config.melody) {
                this.playMelody(soundName);
            } else if (config.secondFreq) {
                this.playDoubleNote(config);
            } else {
                this.playNote(config);
            }
        } catch (e) {
            console.warn('Error playing sound:', e);
        }
    }

    playNote(config) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = config.type;
        oscillator.frequency.value = config.frequency;
        
        const volume = (config.volume || 1) * this.volume;
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + config.duration);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + config.duration);
    }

    playDoubleNote(config) {
        // Play two notes in sequence for correct/incorrect sounds
        this.playNote(config);
        setTimeout(() => {
            this.playNote({
                ...config,
                frequency: config.secondFreq
            });
        }, config.duration * 500);
    }

    playMelody(soundName) {
        // Play achievement melody
        const notes = [523, 659, 784, 1047]; // C, E, G, C (octave higher)
        notes.forEach((freq, index) => {
            setTimeout(() => {
                this.playNote({
                    frequency: freq,
                    duration: 0.15,
                    type: 'sine',
                    volume: 0.5
                });
            }, index * 150);
        });
    }

    // Chess-specific sounds
    playMove() {
        this.playSound('move');
    }

    playCapture() {
        this.playSound('capture');
    }

    playCorrect() {
        this.playSound('correct');
    }

    playIncorrect() {
        this.playSound('incorrect');
    }

    playGameStart() {
        this.playSound('gameStart');
    }

    playGameEnd() {
        this.playSound('gameEnd');
    }

    playTick() {
        this.playSound('tick');
    }

    playAchievement() {
        this.playSound('achievement');
    }

    // Settings management
    toggle() {
        this.enabled = !this.enabled;
        localStorage.setItem('soundEnabled', this.enabled);
        
        // Play a sound to indicate the toggle
        if (this.enabled) {
            this.playSound('gameStart');
        }
        
        return this.enabled;
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        localStorage.setItem('soundVolume', this.volume);
    }

    isEnabled() {
        return this.enabled;
    }

    getVolume() {
        return this.volume;
    }
}

// Create global instance
const soundManager = new SoundManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SoundManager;
}