import { Service, NgZone, inject } from '@angular/core';
import { ThreeApplication } from './three-application';
import { InteractiveObjects } from './interactive-objects';
import { CameraAnimations } from './camera-animations';
import { ViolinFocus } from './interactables/violin-focus';

@Service()
export class RenderLoop {
  private frameId: number | null = null;

  ngZone = inject(NgZone);
  threeApp = inject(ThreeApplication);
  interactiveObjects = inject(InteractiveObjects);
  cameraAnimations = inject(CameraAnimations);
  violinFocus = inject(ViolinFocus);

  start(): void {
    if (this.frameId !== null) return;

    this.ngZone.runOutsideAngular(() => {
      const loop = () => {
        this.frameId = requestAnimationFrame(loop);

        if (this.threeApp.controls && this.threeApp.controls.enabled) {
          this.threeApp.controls.update();
        }

        if (this.interactiveObjects) {
          this.interactiveObjects.update();
        }

        if (this.cameraAnimations) this.cameraAnimations.update();

        this.violinFocus.update();

        this.threeApp.webGLRenderer.render(this.threeApp.scene, this.threeApp.camera);
        this.threeApp.cssRenderer.render(this.threeApp.cssScene, this.threeApp.camera);
      };
      loop();
    });
  }

  stop(): void {
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }
}
