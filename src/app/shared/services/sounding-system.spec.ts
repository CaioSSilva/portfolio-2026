import { TestBed } from '@angular/core/testing';

import { SoundingSystem } from './sounding-system';

describe('SoundingSystem', () => {
  let service: SoundingSystem;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SoundingSystem);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
