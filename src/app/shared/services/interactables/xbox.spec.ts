import { TestBed } from '@angular/core/testing';

import { Xbox } from './xbox';

describe('Xbox', () => {
  let service: Xbox;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Xbox);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
