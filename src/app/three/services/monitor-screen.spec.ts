import { TestBed } from '@angular/core/testing';

import { MonitorScreen } from './monitor-screen';

describe('MonitorScreen', () => {
  let service: MonitorScreen;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MonitorScreen);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
