import { Component, inject } from '@angular/core';
import { ViolinUi as violin } from '../../shared/services/violin-ui';
@Component({
  selector: 'app-violin-ui',
  imports: [],
  templateUrl: './violin-ui.html',
  styleUrl: './violin-ui.css',
})
export class ViolinUi {
  violinUi = inject(violin);
}
