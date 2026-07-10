import { TestBed } from '@angular/core/testing';

import { Pc } from './pc';

describe('Pc', () => {
  let service: Pc;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Pc);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
