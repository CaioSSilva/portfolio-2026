import { TestBed } from '@angular/core/testing';

import { ThreeApplication } from './three-application';

describe('ThreeApplication', () => {
  let service: ThreeApplication;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThreeApplication);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
