import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '**',
    loadComponent: () => import('./three/three').then((c) => c.Three),
  },
];
