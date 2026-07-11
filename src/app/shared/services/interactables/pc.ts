import { inject, Service, OnDestroy } from '@angular/core';
import * as THREE from 'three';
import gsap from 'gsap';

import { InteractableFeature } from '../../interfaces/interactable';
import { CameraAnimations } from '../camera-animations';
import { InteractiveObjects } from '../interactive-objects';
import { SoundingSystem } from '../sounding-system';
import { MonitorScreen } from '../monitor-screen';

@Service()
export class Pc extends InteractableFeature implements OnDestroy {
  private interactiveService = inject(InteractiveObjects);
  private sound = inject(SoundingSystem);
  private monitorScreen = inject(MonitorScreen);

  private model: THREE.Scene | null = null;
  private fanTweens: gsap.core.Tween[] = [];

  private readonly fanNames = ['Fan_Gpu_1', 'Fan_Gpu_2', 'Fan_Gpu_3'];

  private readonly PC_NAME = 'PC';

  public isTurnedOn = this.monitorScreen.pcIsOn;

  matches(objectName: string): boolean {
    return objectName === this.PC_NAME;
  }

  setup(scene: THREE.Scene, _cameraAnimations: CameraAnimations, _cssScene?: THREE.Scene): void {
    this.model = scene;

    const pcMesh = scene.getObjectByName(this.PC_NAME);

    if (pcMesh) {
      this.interactiveService.addObject(pcMesh);
      this.setupFans();
    }
  }

  onClick(_object: THREE.Object3D, _cameraAnimations: CameraAnimations): void {
    const isOn = this.isTurnedOn();
    const isShowingPc = this.monitorScreen.activeSource() === 'pc';

    if (isOn) {
      if (!isShowingPc) {
        this.monitorScreen.activeSource.set('pc');
      } else {
        this.togglePower();
      }
    } else {
      this.togglePower();
      this.monitorScreen.activeSource.set('pc');
    }
  }

  returnToIdle(cameraAnimations: CameraAnimations): void {
    cameraAnimations.returnToIdle();
  }

  public togglePower(): void {
    const newState = !this.isTurnedOn();

    this.isTurnedOn.set(newState);

    this.sound.playMonitorPower(newState ? 'on' : 'off');

    if (newState) {
      this.fanTweens.forEach((t) => t.play());
    } else {
      this.fanTweens.forEach((t) => t.pause());
    }
  }

  private setupFans(): void {
    if (!this.model) return;

    this.clearTweens();

    this.fanNames.forEach((name) => {
      const fan = this.model!.getObjectByName(name);

      if (!fan) return;

      const tween = gsap.to(fan.rotation, {
        z: '+=6.28319',
        duration: 0.5,
        ease: 'none',
        repeat: -1,
        paused: !this.isTurnedOn(),
      });

      this.fanTweens.push(tween);
    });
  }

  private clearTweens(): void {
    this.fanTweens.forEach((t) => t.kill());
    this.fanTweens = [];
  }

  ngOnDestroy(): void {
    this.clearTweens();
  }
}
