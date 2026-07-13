import { Component, effect, inject } from '@angular/core';
import { Violin } from '../../shared/services/violin';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { 
  heroDocumentArrowDown, 
  heroStop, 
  heroXMark,
  heroExclamationCircle,
  heroQuestionMarkCircle,
  heroInformationCircle
} from '@ng-icons/heroicons/outline';
import { ViolinFocus } from '../../shared/services/interactables/violin-focus';
import { CameraAnimations } from '../../shared/services/camera-animations';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-violin-ui',
  standalone: true,
  imports: [NgIcon, TranslatePipe],
  providers: [
    provideIcons({
      heroXMark,
      heroStop,
      heroDocumentArrowDown,
      heroExclamationCircle,
      heroQuestionMarkCircle,
      heroInformationCircle
    }),
  ],
  templateUrl: './violin-ui.html',
  styleUrl: './violin-ui.css',
})
export class ViolinUi {
  public violin = inject(Violin);
  public violinFocus = inject(ViolinFocus);
  public cameraAnim = inject(CameraAnimations);
  
  public showMidiHelp = false;

  constructor() {
    effect(() => {
      if (this.violin.isVisible()) {
        this.showMidiHelp = false;
      }
    });
  }

  public toggleMidiHelp() {
    this.showMidiHelp = !this.showMidiHelp;
  }
}