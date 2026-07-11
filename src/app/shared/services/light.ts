import { inject, Service, signal } from '@angular/core';
import { ThemeEnum } from '../interfaces/theme';
import { SoundingSystem } from './sounding-system';

@Service()
export class Light {
  lightState = signal<ThemeEnum>(ThemeEnum.light);

  sound = inject(SoundingSystem)

  toggleLight() {
    this.lightState.update((state) =>
      state === ThemeEnum.light ? ThemeEnum.dark : ThemeEnum.light,
    );
    this.sound.playLightsPower(this.lightState() === ThemeEnum.light ? 'on' : 'off')
  }
}
