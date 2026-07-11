import { Component, inject, input, output, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { TranslatePipe } from '@ngx-translate/core';
import { 
  heroXMark, 
  heroBugAnt, 
  heroChevronLeft, 
  heroChevronRight,
  heroVideoCamera,
  heroBolt,
  heroSpeakerWave
} from '@ng-icons/heroicons/outline';
import { CameraAnimations } from '../../shared/services/camera-animations';

@Component({
  selector: 'app-helper',
  standalone: true,
  templateUrl: './helper.html',
  styleUrls: ['./helper.css'],
  imports: [NgIcon, TranslatePipe],
  providers: [
    provideIcons({
      heroXMark,
      heroBugAnt,
      heroChevronLeft,
      heroChevronRight,
      heroVideoCamera,
      heroBolt,
      heroSpeakerWave
    }),
  ],
})
export class Helper {
  public isOpen = input<boolean>(false);
  public close = output<void>();

  public readonly cameraInteraction = inject(CameraAnimations)

  public currentStep = signal(0);
  public totalSteps = 4;

  public nextStep() {
    if (this.currentStep() < this.totalSteps - 1) {
      this.currentStep.update((s) => s + 1);
    }
  }

  public prevStep() {
    if (this.currentStep() > 0) {
      this.currentStep.update((s) => s - 1);
    }
  }

  public setStep(index: number) {
    this.currentStep.set(index);
  }

  public closeHelper() {
    this.currentStep.set(0);
    this.close.emit();
  }
}