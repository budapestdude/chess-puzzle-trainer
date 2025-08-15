// Sound Manager for Chess Puzzle Trainer
// Only plays sounds during puzzle solving (move, capture, correct, incorrect)
class SoundManager {
    constructor() {
        this.enabled = localStorage.getItem('soundEnabled') !== 'false';
        this.volume = parseFloat(localStorage.getItem('soundVolume') || '0.3');
        this.audioContext = null;
        
        // Initialize sounds
        this.initializeSounds();
    }

    initializeSounds() {
        // Use Web Audio API to generate chess-themed sounds
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Chess-themed sound configurations
            this.soundConfigs = {
                // Piece movement sound - like wood on wood
                move: { 
                    frequency: 220, 
                    duration: 0.08, 
                    type: 'sine',
                    envelope: 'quick',
                    volume: 0.4
                },
                
                // Capture sound - slightly sharper than move
                capture: { 
                    frequency: 330, 
                    duration: 0.12, 
                    type: 'triangle',
                    envelope: 'sharp',
                    volume: 0.5,
                    secondFreq: 165
                },
                
                // Correct puzzle solution - pleasant chime
                correct: { 
                    frequencies: [523.25, 659.25, 783.99], // C, E, G major chord
                    duration: 0.4, 
                    type: 'sine',
                    envelope: 'smooth',
                    volume: 0.3
                },
                
                // Incorrect move - subtle warning
                incorrect: { 
                    frequencies: [233.08, 220], // Bb to A (minor second)
                    duration: 0.3, 
                    type: 'sine',
                    envelope: 'fade',
                    volume: 0.25
                }
            };
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
            this.enabled = false;
        }
    }

    playSound(soundName) {
        // Only allow puzzle-related sounds
        const allowedSounds = ['move', 'capture', 'correct', 'incorrect'];
        if (!allowedSounds.includes(soundName)) return;
        
        if (!this.enabled || !this.audioContext) return;
        
        const config = this.soundConfigs[soundName];
        if (!config) return;

        try {
            if (config.frequencies) {
                this.playChord(config);
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
        
        // Add a subtle filter for more realistic sound
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2000;
        
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = config.type;
        oscillator.frequency.value = config.frequency;
        
        const volume = (config.volume || 1) * this.volume;
        const now = this.audioContext.currentTime;
        
        // Apply envelope
        switch(config.envelope) {
            case 'quick':
                gainNode.gain.setValueAtTime(0, now);
                gainNode.gain.linearRampToValueAtTime(volume, now + 0.01);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + config.duration);
                break;
            case 'sharp':
                gainNode.gain.setValueAtTime(volume, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + config.duration);
                break;
            case 'smooth':
                gainNode.gain.setValueAtTime(0, now);
                gainNode.gain.linearRampToValueAtTime(volume, now + config.duration * 0.1);
                gainNode.gain.linearRampToValueAtTime(volume * 0.7, now + config.duration * 0.3);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + config.duration);
                break;
            case 'fade':
                gainNode.gain.setValueAtTime(volume, now);
                gainNode.gain.linearRampToValueAtTime(volume * 0.5, now + config.duration * 0.5);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + config.duration);
                break;
            default:
                gainNode.gain.setValueAtTime(volume, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + config.duration);
        }
        
        oscillator.start(now);
        oscillator.stop(now + config.duration);
    }

    playDoubleNote(config) {
        // For capture sound - play two quick notes
        this.playNote(config);
        setTimeout(() => {
            this.playNote({
                ...config,
                frequency: config.secondFreq,
                duration: config.duration * 0.7
            });
        }, config.duration * 200);
    }

    playChord(config) {
        // For correct/incorrect - play multiple frequencies
        const now = this.audioContext.currentTime;
        
        config.frequencies.forEach((freq, index) => {
            setTimeout(() => {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                const filter = this.audioContext.createBiquadFilter();
                
                filter.type = 'lowpass';
                filter.frequency.value = 3000;
                
                oscillator.connect(filter);
                filter.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.type = config.type;
                oscillator.frequency.value = freq;
                
                const volume = (config.volume || 1) * this.volume * (1 - index * 0.1);
                
                if (config.envelope === 'smooth') {
                    gainNode.gain.setValueAtTime(0, now);
                    gainNode.gain.linearRampToValueAtTime(volume, now + 0.05);
                    gainNode.gain.linearRampToValueAtTime(volume * 0.8, now + config.duration * 0.5);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, now + config.duration);
                } else {
                    gainNode.gain.setValueAtTime(volume, now);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, now + config.duration);
                }
                
                oscillator.start(now);
                oscillator.stop(now + config.duration);
            }, index * 50); // Slight delay between notes for arpeggio effect
        });
    }

    // Chess-specific sound methods for puzzle solving only
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

    // Settings management
    toggle() {
        this.enabled = !this.enabled;
        localStorage.setItem('soundEnabled', this.enabled);
        
        // Play a move sound to indicate the toggle
        if (this.enabled) {
            this.playSound('move');
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