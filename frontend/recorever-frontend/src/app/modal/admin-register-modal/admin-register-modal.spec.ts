import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminRegisterModal } from './admin-register-modal';

describe('AdminRegisterModal', () => {
  let component: AdminRegisterModal;
  let fixture: ComponentFixture<AdminRegisterModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminRegisterModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminRegisterModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
