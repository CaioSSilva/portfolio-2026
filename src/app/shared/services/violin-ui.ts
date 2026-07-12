import { Service, signal } from '@angular/core';

@Service()
export class ViolinUi {
  isVisible = signal(false);

  public show() {
    this.isVisible.set(true);
  }

  public hide() {
    this.isVisible.set(false);
  }
}
