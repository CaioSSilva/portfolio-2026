import { Service, signal } from '@angular/core';

export type BootTaskStatus = 'pending' | 'running' | 'done';

export interface BootTask {
  id: string;
  labelKey: string;
  status: BootTaskStatus;
}

const INITIAL_TASKS: BootTask[] = [
  { id: 'renderers', labelKey: 'loading.tasks.renderers', status: 'pending' },
  { id: 'model', labelKey: 'loading.tasks.model', status: 'pending' },
  { id: 'texture', labelKey: 'loading.tasks.texture', status: 'pending' },
  { id: 'bounds', labelKey: 'loading.tasks.bounds', status: 'pending' },
  { id: 'camera', labelKey: 'loading.tasks.camera', status: 'pending' },
  { id: 'monitor', labelKey: 'loading.tasks.monitor', status: 'pending' },
  { id: 'interactive', labelKey: 'loading.tasks.interactive', status: 'pending' },
  { id: 'render-loop', labelKey: 'loading.tasks.render-loop', status: 'pending' },
];

@Service()
export class BootSequence {
  public tasks = signal<BootTask[]>(INITIAL_TASKS.map((t) => ({ ...t })));

  public start(id: string): void {
    this.tasks.update((tasks) =>
      tasks.map((t) => (t.id === id ? { ...t, status: 'running' } : t)),
    );
  }

  public complete(id: string): void {
    this.tasks.update((tasks) =>
      tasks.map((t) => (t.id === id ? { ...t, status: 'done' } : t)),
    );
  }
}