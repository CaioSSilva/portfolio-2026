import { Service } from '@angular/core';
import { ThemeEnum } from '../shared/interfaces/theme';

@Service()
export class Theme {
  private readonly storageKey = 'app-theme';
  private readonly wrapperSelector = '.scene-wrapper';

  constructor() {
    this.initializeTheme();
  }

  public getTheme(): ThemeEnum {
    const savedTheme = localStorage.getItem(this.storageKey);
    return savedTheme === ThemeEnum.dark ? ThemeEnum.dark : ThemeEnum.light;
  }

  public toggleTheme(): void {
    const wrapper = this.getWrapperElement();
    if (!wrapper) return;

    if (wrapper.classList.contains(ThemeEnum.dark)) {
      this.setTheme(wrapper, ThemeEnum.light);
    } else {
      this.setTheme(wrapper, ThemeEnum.dark);
    }
  }

  private initializeTheme(): void {
    const wrapper = this.getWrapperElement();
    if (!wrapper) return;

    const currentTheme = this.getTheme();
    this.setTheme(wrapper, currentTheme);
  }

  private setTheme(element: HTMLElement, theme: ThemeEnum): void {
    if (theme === ThemeEnum.dark) {
      element.classList.add(ThemeEnum.dark);
      element.classList.remove(ThemeEnum.light);
    } else {
      element.classList.add(ThemeEnum.light);
      element.classList.remove(ThemeEnum.dark);
    }

    localStorage.setItem(this.storageKey, theme);
  }

  private getWrapperElement(): HTMLElement | null {
    return document.querySelector(this.wrapperSelector);
  }
}
