import { NgZone } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { RenderLoop } from './render-loop';
import { ThreeApplication } from './three-application';
import { InteractiveObjects } from './interactive-objects';
import { CameraAnimations } from './camera-animations';

describe('RenderLoop', () => {
  let service: RenderLoop;
  const runOutsideAngular = vi.fn((fn: () => void) => fn());
  const controls = {
    enabled: true,
    update: vi.fn(),
  };
  const threeAppStub = {
    controls,
    webGLRenderer: { render: vi.fn() },
    cssRenderer: { render: vi.fn() },
    scene: {},
    camera: {},
    cssScene: {},
  };
  const interactiveStub = { update: vi.fn() };
  const cameraAnimationsStub = { update: vi.fn() };

  beforeEach(() => {
    runOutsideAngular.mockClear();
    controls.update.mockClear();
    threeAppStub.webGLRenderer.render.mockClear();
    threeAppStub.cssRenderer.render.mockClear();
    interactiveStub.update.mockClear();
    cameraAnimationsStub.update.mockClear();

    TestBed.configureTestingModule({
      providers: [
        RenderLoop,
        {
          provide: NgZone,
          useValue: { runOutsideAngular },
        },
        {
          provide: ThreeApplication,
          useValue: threeAppStub,
        },
        {
          provide: InteractiveObjects,
          useValue: interactiveStub,
        },
        {
          provide: CameraAnimations,
          useValue: cameraAnimationsStub,
        },
      ],
    });

    service = TestBed.inject(RenderLoop);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should execute one frame and call updates/renders', () => {
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1),
    );

    service.start();

    expect(runOutsideAngular).toHaveBeenCalled();
    expect(controls.update).toHaveBeenCalled();
    expect(interactiveStub.update).toHaveBeenCalled();
    expect(cameraAnimationsStub.update).toHaveBeenCalled();
    expect(threeAppStub.webGLRenderer.render).toHaveBeenCalled();
    expect(threeAppStub.cssRenderer.render).toHaveBeenCalled();
  });

  it('should cancel animation frame on stop', () => {
    const raf = vi.fn(() => 42);
    const caf = vi.fn();

    vi.stubGlobal('requestAnimationFrame', raf);
    vi.stubGlobal('cancelAnimationFrame', caf);

    service.start();
    service.stop();

    expect(caf).toHaveBeenCalledWith(42);
  });
});
