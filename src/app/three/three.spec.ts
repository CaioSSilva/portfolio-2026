import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Three } from './three';

describe('Three', () => {
  let component: Three;
  let fixture: ComponentFixture<Three>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Three],
    }).compileComponents();

    fixture = TestBed.createComponent(Three);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
