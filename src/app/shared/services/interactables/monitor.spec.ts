import { TestBed } from '@angular/core/testing';

import { Monitor } from './monitor';

describe('Monitor', () => {
  let service: Monitor;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Monitor);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
