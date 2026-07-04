import { Component, effect, inject, ElementRef, viewChild } from '@angular/core';
import gsap from 'gsap';
import { Resources } from '../three/services/resources';
import { ThreeApplication } from '../three/services/three-application';

@Component({
  selector: 'app-loading',
  standalone: true,
  templateUrl: './loading.html',
  styleUrl: './loading.css',
})
export class Loading {
  private resources = inject(Resources);
  private threeApp = inject(ThreeApplication);

  private overlay = viewChild.required<ElementRef<HTMLDivElement>>('overlay');
  private bar = viewChild.required<ElementRef<HTMLDivElement>>('bar');
  private percentLabel = viewChild.required<ElementRef<HTMLSpanElement>>('percentLabel');

  private displayedProgress = { value: 0 };

  constructor() {
    effect(() => {
      const target = this.resources.progress();
      gsap.to(this.displayedProgress, {
        value: target,
        duration: 0.4,
        ease: 'power2.out',
        onUpdate: () => {
          gsap.set(this.bar().nativeElement, { scaleX: this.displayedProgress.value });
          this.percentLabel().nativeElement.textContent = `${Math.round(this.displayedProgress.value * 100)}%`;
        },
      });
    });

    effect(() => {
      if (this.threeApp.sceneReady()) {
        gsap
          .timeline()
          .to(this.overlay().nativeElement, { autoAlpha: 0, duration: 0.6, ease: 'power2.inOut', delay: 0.3 })
          .set(this.overlay().nativeElement, { display: 'none' });
      }
    });
  }
}