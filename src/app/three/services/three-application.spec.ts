import { TestBed } from '@angular/core/testing';

import { ThreeApplication } from './three-application';

describe('ThreeApplication', () => {
  const threeAppStub = {
    frustumSizeValue: () => 6,
    initRenderers: () => undefined,
    resize: () => undefined,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ThreeApplication,
          useValue: threeAppStub,
        },
      ],
    });
  });

  it('should be injectable', () => {
    const service = TestBed.inject(ThreeApplication);
    expect(service).toBeTruthy();
  });

  it('should expose expected public API on test double', () => {
    const service = TestBed.inject(ThreeApplication);

    expect(service.frustumSizeValue()).toBe(6);
    expect(typeof service.initRenderers).toBe('function');
    expect(typeof service.resize).toBe('function');
  });
});
