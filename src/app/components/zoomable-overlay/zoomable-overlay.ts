import { Component, inject, HostListener } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroXMark } from '@ng-icons/heroicons/outline';
import { TranslatePipe } from '@ngx-translate/core';
import { CameraAnimations } from '../../shared/services/camera-animations';
import { CameraStates } from '../../shared/interfaces/camera';
import { Zoomable } from '../../shared/services/interactables/zoomable';

@Component({
  selector: 'app-zoomable-overlay',
  standalone: true,
  imports: [NgIcon, TranslatePipe],
  templateUrl: './zoomable-overlay.html',
  styleUrls: ['./zoomable-overlay.css'],
  providers: [provideIcons({ heroXMark })],
})
export class ZoomableOverlay {
  public zoomable = inject(Zoomable);
  public cameraAnimations = inject(CameraAnimations);
  public cameraStates = CameraStates;

  private isDragging = false;
  private previousMousePosition = { x: 0, y: 0 };

  onPointerDown(event: PointerEvent): void {
    this.isDragging = true;
    this.previousMousePosition = { x: event.clientX, y: event.clientY };
  }

  @HostListener('window:pointermove', ['$event'])
  onPointerMove(event: PointerEvent): void {
    if (!this.isDragging) return;

    const deltaX = event.clientX - this.previousMousePosition.x;
    const deltaY = event.clientY - this.previousMousePosition.y;

    const activeObj = this.zoomable.activeObject();
    if (activeObj) {
      const pivot = activeObj.userData['pivotContainer'];
      if (pivot) {
        pivot.rotation.y += deltaX * 0.01;
        pivot.rotation.x += deltaY * 0.01;
      }
    }

    this.previousMousePosition = { x: event.clientX, y: event.clientY };
  }

  @HostListener('window:pointerup')
  onPointerUp(): void {
    this.isDragging = false;
  }

  resetFocus(): void {
    this.zoomable.returnToIdle(this.cameraAnimations);
  }
}
