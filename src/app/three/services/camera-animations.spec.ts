import { TestBed } from '@angular/core/testing';
import * as THREE from 'three';
import { vi } from 'vitest';
import { CameraAnimations } from './camera-animations';
import { ThreeApplication } from './three-application';
import { InteractiveObjects } from './interactive-objects';

type TweenTarget = {
  x?: number;
  y?: number;
  z?: number;
  zoom?: number;
};

type TweenVars = {
  x?: number;
  y?: number;
  z?: number;
  zoom?: number;
  onUpdate?: () => void;
  onComplete?: () => void;
};

vi.mock('gsap', () => ({
  default: {
    to: vi.fn((target: TweenTarget, vars: TweenVars) => {
      if (typeof vars['x'] === 'number') target.x = vars['x'];
      if (typeof vars['y'] === 'number') target.y = vars['y'];
      if (typeof vars['z'] === 'number') target.z = vars['z'];
      if (typeof vars['zoom'] === 'number') target.zoom = vars['zoom'];
      if (typeof vars['onUpdate'] === 'function') vars['onUpdate']();
      if (typeof vars['onComplete'] === 'function') vars['onComplete']();
      return target;
    }),
  },
}));

describe('CameraAnimations', () => {
  let service: CameraAnimations;
  let camera: {
    position: THREE.Vector3;
    zoom: number;
    lookAt: ReturnType<typeof vi.fn>;
    updateProjectionMatrix: ReturnType<typeof vi.fn>;
  };
  let controls: {
    enabled: boolean;
    target: THREE.Vector3;
    update: ReturnType<typeof vi.fn>;
  };
  let interactiveStub: { enabled: boolean };

  beforeEach(() => {
    camera = {
      position: new THREE.Vector3(0, 0, 0),
      zoom: 1,
      lookAt: vi.fn(),
      updateProjectionMatrix: vi.fn(),
    };

    controls = {
      enabled: false,
      target: new THREE.Vector3(0, 0, 0),
      update: vi.fn(),
    };

    interactiveStub = { enabled: false };

    TestBed.configureTestingModule({
      providers: [
        CameraAnimations,
        {
          provide: ThreeApplication,
          useValue: {
            camera,
            controls,
            frustumSizeValue: () => 6,
          },
        },
        {
          provide: InteractiveObjects,
          useValue: interactiveStub,
        },
      ],
    });

    service = TestBed.inject(CameraAnimations);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize idle state and sync camera/target', () => {
    const basePos = new THREE.Vector3(5, 2, -5);
    const baseTarget = new THREE.Vector3(0, 0, 0);

    service.initIdle(basePos, baseTarget);

    expect(service.state).toBe('IDLE');
    expect(controls.enabled).toBe(false);
    expect(controls.target.equals(baseTarget)).toBe(true);
    expect(camera.position.equals(basePos)).toBe(true);
    expect(camera.lookAt).toHaveBeenCalled();
  });

  it('should focus on object and enable interaction with screen element', () => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    mesh.updateMatrixWorld(true);

    const onComplete = vi.fn();
    const screenElement = document.createElement('div');
    screenElement.style.pointerEvents = 'none';

    service.initIdle(new THREE.Vector3(3, 2, 1), new THREE.Vector3(0, 0, 0));
    service.focusOnObject(mesh, 0.6, onComplete, mesh, screenElement);

    expect(service.state).toBe('FOCUSED');
    expect(controls.enabled).toBe(true);
    expect(screenElement.style.pointerEvents).toBe('auto');
    expect(onComplete).toHaveBeenCalled();
  });

  it('should return from focused state to idle and re-enable interactive objects', () => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    mesh.updateMatrixWorld(true);

    const screenElement = document.createElement('div');
    screenElement.style.pointerEvents = 'none';

    service.initIdle(new THREE.Vector3(4, 3, 2), new THREE.Vector3(0, 0, 0));
    service.focusOnObject(mesh, 0.6, undefined, mesh, screenElement);

    expect(service.state).toBe('FOCUSED');

    service.returnToIdle();

    expect(service.state).toBe('IDLE');
    expect(controls.enabled).toBe(false);
    expect(screenElement.style.pointerEvents).toBe('none');
    expect(interactiveStub.enabled).toBe(true);
  });
});
