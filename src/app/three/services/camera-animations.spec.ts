import { TestBed } from '@angular/core/testing';

import { CameraAnimations } from './camera-animations';

describe('CameraAnimations', () => {
  let service: CameraAnimations;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CameraAnimations);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
