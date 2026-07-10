import { inject, Service, signal, OnDestroy } from '@angular/core';
import * as THREE from 'three';
import gsap from 'gsap';
import { InteractableFeature } from '../../interfaces/interactable';
import { CameraAnimations } from '../camera-animations';
import { InteractiveObjects } from '../interactive-objects';
import { SoundingSystem } from '../sounding-system';

@Service()
export class Pc extends InteractableFeature implements OnDestroy {
  private interactiveService = inject(InteractiveObjects);
  private sound = inject(SoundingSystem);
  private model: THREE.Scene | null = null;
  private fanTweens: gsap.core.Tween[] = [];
  private readonly fanNames = ['Fan_Gpu_1', 'Fan_Gpu_2', 'Fan_Gpu_3'];
  private readonly PC_NAME = 'PC';

  isTurnedOn = signal(true);

  matches(objectName: string): boolean {
    return objectName === this.PC_NAME;
  }

  setup(scene: THREE.Scene, cameraAnimations: CameraAnimations, cssScene?: THREE.Scene): void {
    this.model = scene;

    const pcMesh = scene.getObjectByName(this.PC_NAME);

    if (pcMesh) {
      this.interactiveService.addObject(pcMesh);
      this.setupFans();
    }
  }

  onClick(object: THREE.Object3D, cameraAnimations: CameraAnimations): void {
    this.togglePower();
  }

  returnToIdle(cameraAnimations: CameraAnimations): void {
    cameraAnimations.returnToIdle();
  }

  public togglePower(): void {
    const newState = !this.isTurnedOn();
    this.isTurnedOn.set(newState);

    if (newState) {
      this.sound.playMonitorPower(newState ? 'on' : 'off');
      this.fanTweens.forEach((tween) => tween.play());
    } else {
      this.fanTweens.forEach((tween) => tween.pause());
    }
  }

  private setupFans(): void {
    if (!this.model) return;

    this.clearTweens();

    this.fanNames.forEach((fanName) => {
      const fanMesh = this.model!.getObjectByName(fanName);

      if (fanMesh) {
        const tween = gsap.to(fanMesh.rotation, {
          z: '+=6.28319',
          duration: 0.5,
          repeat: -1,
          ease: 'none',
          paused: !this.isTurnedOn(),
        });

        this.fanTweens.push(tween);
      }
    });
  }

  private clearTweens(): void {
    this.fanTweens.forEach((tween) => tween.kill());
    this.fanTweens = [];
  }

  public ngOnDestroy(): void {
    this.clearTweens();
  }
}
