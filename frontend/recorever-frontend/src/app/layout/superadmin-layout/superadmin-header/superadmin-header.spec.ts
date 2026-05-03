import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuperadminHeader } from './superadmin-header';

describe('SuperadminHeader', () => {
  let component: SuperadminHeader;
  let fixture: ComponentFixture<SuperadminHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuperadminHeader]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SuperadminHeader);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
