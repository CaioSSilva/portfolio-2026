import { Service, signal } from '@angular/core';
import { ThemeEnum } from '../interfaces/theme';

@Service()
export class Light {
  lightState = signal<ThemeEnum>(ThemeEnum.light);

  toggleLight() {
    this.lightState.update((state) =>
      state === ThemeEnum.light ? ThemeEnum.dark : ThemeEnum.light,
    );
  }
}
