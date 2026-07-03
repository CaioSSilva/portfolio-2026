import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { Three } from './three';
import { ThreeApplication } from './services/three-application';
import { RenderLoop } from './services/render-loop';
import { Resources } from './services/resources';
import { MonitorScreen } from './services/monitor-screen';
import { InteractiveObjects } from './services/interactive-objects';
import { CameraAnimations } from './services/camera-animations';

describe('Three', () => {
  let component: Three;
  let fixture: ComponentFixture<Three>;

  beforeEach(async () => {
    vi.spyOn(Three.prototype, 'ngAfterViewInit').mockResolvedValue();

    await TestBed.configureTestingModule({
      imports: [Three],
      providers: [
        {
          provide: ThreeApplication,
          useValue: {},
        },
        {
          provide: RenderLoop,
          useValue: {},
        },
        {
          provide: Resources,
          useValue: {},
        },
        {
          provide: MonitorScreen,
          useValue: {},
        },
        {
          provide: InteractiveObjects,
          useValue: {},
        },
        {
          provide: CameraAnimations,
          useValue: {},
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Three);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
