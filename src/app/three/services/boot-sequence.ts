import { Service, signal } from '@angular/core';

export type BootTaskStatus = 'pending' | 'running' | 'done';

export interface BootTask {
  id: string;
  label: string;
  status: BootTaskStatus;
}

const INITIAL_TASKS: BootTask[] = [
  { id: 'renderers', label: 'inicializando renderers webgl + css3d', status: 'pending' },
  { id: 'model', label: 'carregando geometria do quarto', status: 'pending' },
  { id: 'texture', label: 'aplicando textura baked', status: 'pending' },
  { id: 'bounds', label: 'calculando bounding box da cena', status: 'pending' },
  { id: 'camera', label: 'posicionando camera inicial', status: 'pending' },
  { id: 'monitor', label: 'montando tela do monitor', status: 'pending' },
  { id: 'interactive', label: 'registrando objetos interativos', status: 'pending' },
  { id: 'render-loop', label: 'iniciando render loop', status: 'pending' },
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