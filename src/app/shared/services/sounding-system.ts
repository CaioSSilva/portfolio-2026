import { Service, signal } from '@angular/core';

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

@Service()
export class SoundingSystem {
  private audioContext?: AudioContext;
  private windowObj = window;
  private bgIntervalId?: number;

  audioEnabled = signal(true);

  public async initAudio(): Promise<void> {
    this.bgIntervalId = undefined;

    if (!this.audioContext) {
      const AudioContextClass = this.windowObj.AudioContext || this.windowObj.webkitAudioContext;
      this.audioContext = new AudioContextClass();
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  public playUIStart(frequency: number = 440): void {
    if (this.audioContext && this.audioEnabled()) {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;

      gainNode.gain.setValueAtTime(1, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.5);

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + 0.5);

      this.startClickMonitoring();
      this.bgMusicLoop();
    }
  }

  public playUIClick() {
    if (this.audioContext && this.audioEnabled()) {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.type = 'sine';

      oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.05);

      gainNode.gain.setValueAtTime(1, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.05);

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + 0.05);
    }
  }

  public bgMusicLoop(): void {
    if (!this.audioContext || !this.audioEnabled() || this.bgIntervalId) {
      return;
    }

    const scale = [196.0, 293.66, 349.23, 392.0, 440.0, 466.16, 523.25, 587.33];
    const coreNotes = [196.0, 293.66, 392.0];

    let step = 0;
    const stepDuration = 0.2;

    this.bgIntervalId = setInterval(() => {
      if (!this.audioContext || !this.audioEnabled()) return;

      let freq = 0;

      if (step % 4 === 0) {
        freq = coreNotes[Math.floor(Math.random() * coreNotes.length)];
      } else if (Math.random() < 0.25) {
        freq = 0;
      } else {
        freq = scale[Math.floor(Math.random() * scale.length)];
      }

      if (freq > 0) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);

        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);

        gainNode.gain.linearRampToValueAtTime(
          0.15,
          this.audioContext.currentTime + stepDuration * 0.8,
        );

        gainNode.gain.exponentialRampToValueAtTime(
          0.001,
          this.audioContext.currentTime + stepDuration * 4.0,
        );

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + stepDuration * 4.0);
      }

      step++;
    }, stepDuration * 1000);
  }

  private startClickMonitoring() {
    this.windowObj.addEventListener('click', () => this.playUIClick());
  }
}
