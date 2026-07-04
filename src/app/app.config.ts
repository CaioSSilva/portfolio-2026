import { ApplicationConfig, provideAppInitializer, inject } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

const SUPPORTED_LANGS = ['pt', 'en'];
const DEFAULT_LANG = 'en';

function resolveBrowserLang(): string {
  const browserLang = navigator.language?.split('-')[0];
  return SUPPORTED_LANGS.includes(browserLang) ? browserLang : DEFAULT_LANG;
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideTranslateService({
      loader: provideTranslateHttpLoader({
        prefix: '/i18n/',
        suffix: '.json',
      }),
      fallbackLang: DEFAULT_LANG,
    }),
    provideAppInitializer(() => {
      const translate = inject(TranslateService);
      const lang = resolveBrowserLang();
      return translate.use(lang);
    }),
    provideRouter(routes)
  ],
};