import { Service } from '@angular/core';
import { ThemeEnum } from '../shared/interfaces/theme';

@Service()
export class Light {
  private readonly storageKey = 'app-light';

  public getLight(): ThemeEnum {
    const savedTheme = localStorage.getItem(this.storageKey);
    return savedTheme === ThemeEnum.dark ? ThemeEnum.dark : ThemeEnum.light;
  }

  public toggleLight(): void {
    
  }
}
