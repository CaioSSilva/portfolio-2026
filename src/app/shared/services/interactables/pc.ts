import { Service, signal, OnDestroy } from '@angular/core';
import { Object3D } from 'three';
import gsap from 'gsap';

@Service()
export class Pc implements OnDestroy {
  private model: Object3D | null = null;
  private fanTweens: gsap.core.Tween[] = [];
  private readonly fanNames = ['Fan_Gpu_1', 'Fan_Gpu_2', 'Fan_Gpu_3'];

  isTurnedOn = signal(true);

  public init(pcModel: Object3D): void {
    this.model = pcModel;
    this.setupFans();
  }

  public togglePower(): void {
    const newState = !this.isTurnedOn();
    this.isTurnedOn.set(newState);

    if (newState) {
      this.fanTweens.forEach(tween => tween.play());
    } else {
      this.fanTweens.forEach(tween => tween.pause());
    }
  }

  private setupFans(): void {
    if (!this.model) return;

    this.clearTweens();

    this.fanNames.forEach(fanName => {
      const fanMesh = this.model!.getObjectByName(fanName);

      if (fanMesh) {
        const tween = gsap.to(fanMesh.rotation, {
          z: '+=6.28319', 
          duration: 0.5,  
          repeat: -1,     
          ease: 'none',
          paused: !this.isTurnedOn()
        });

        this.fanTweens.push(tween);
      }
    });
  }

  private clearTweens(): void {
    this.fanTweens.forEach(tween => tween.kill());
    this.fanTweens = [];
  }

  public ngOnDestroy(): void {
    this.clearTweens();
  }
}