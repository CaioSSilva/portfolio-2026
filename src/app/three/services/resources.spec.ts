import { TestBed } from '@angular/core/testing';

import { Resources } from './resources';

describe('Resources', () => {
  let service: Resources;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Resources);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
