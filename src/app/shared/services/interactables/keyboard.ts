import { OnDestroy, Service, inject } from '@angular/core';
import { Object3D } from 'three';
import gsap from 'gsap';
import { SoundingSystem } from '../sounding-system';

@Service()
export class Keyboard implements OnDestroy {
  private soundingSystem = inject(SoundingSystem);

  private model: Object3D | null = null;
  private pressDepth: number = 0.005;
  private pressedKeys = new Set<string>();
  private originalPositions = new Map<string, number>();

  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
  }

  public init(keyboard3DModel: Object3D, pressDepth: number = this.pressDepth): void {
    this.model = keyboard3DModel;
    this.pressDepth = pressDepth;

    this.cleanupListeners();

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  public restart(){
    this.init(this.model!, this.pressDepth)
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.repeat || this.pressedKeys.has(event.code)) return;

    event.preventDefault();

    this.pressedKeys.add(event.code);
    this.animateKey(event.code, true);
  }

  private handleKeyUp(event: KeyboardEvent): void {
    if (!this.pressedKeys.has(event.code)) return;

    this.pressedKeys.delete(event.code);
    this.animateKey(event.code, false);
  }

  private animateKey(keyCode: string, isDown: boolean): void {
    if (!this.model) return;

    const keyMesh = this.model.getObjectByName(keyCode);

    if (keyMesh) {
      if (!this.originalPositions.has(keyCode)) {
        this.originalPositions.set(keyCode, keyMesh.position.y);
      }

      const baseY = this.originalPositions.get(keyCode)!;
      const targetY = isDown ? baseY - this.pressDepth : baseY;

      gsap.to(keyMesh.position, {
        y: targetY,
        duration: 0.05,
        ease: 'power2.out',
        overwrite: 'auto',
      });

      this.soundingSystem.playTypingSound()
    }
  }

  private cleanupListeners(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  public ngOnDestroy(): void {
    this.cleanupListeners();
    this.pressedKeys.clear();
    this.originalPositions.clear();
  }
}
