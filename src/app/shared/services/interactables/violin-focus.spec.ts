import { TestBed } from '@angular/core/testing';

import { Violin } from './violin';

describe('Violin', () => {
  let service: Violin;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Violin);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
