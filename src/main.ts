import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { inject as injectAnalytics } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights'; // Removed '/next' and updated the function name

injectAnalytics();
injectSpeedInsights();


bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
