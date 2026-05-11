import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { UserManagementService } from '../../../core/services/user-management-service';
import { AdminResponse } from '../../../models/user-management-model';
import { AdminRegisterModal } from '../../../modal/admin-register-modal/admin-register-modal';
import { ConfirmationModal } from '../../../modal/confirmation-modal/confirmation-modal';

@Component({
  selector: 'app-user-management-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './user-management-page.html',
  styleUrls: ['./user-management-page.scss']
})
export class UserManagementPage implements OnInit {
  private userManagementService = inject(UserManagementService);
  private dialog = inject(MatDialog);

  searchControl = new FormControl('');

  users = signal<AdminResponse[]>([]);

  ngOnInit(): void {
    this.loadAdmins();
  }

  loadAdmins(): void {
    this.userManagementService.getAdminAccounts().subscribe({
      next: (data) => {
        this.users.set(data);
      },
      error: (err) => {
        console.error('Failed to load admin accounts:', err);
      }
    });
  }

  openAddUserModal() {
    const dialogRef = this.dialog.open(AdminRegisterModal, {
      width: '550px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadAdmins();
    });
  }

  toggleSort(column: string) {
    console.log('Sorting by:', column);
  }

  editUser(user: AdminResponse) {
    const dialogRef = this.dialog.open(AdminRegisterModal, {
      width: '550px',
      data: { admin: user }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadAdmins();
    });
  }

  deleteUser(user: AdminResponse) {
    // 1. Open your existing ConfirmationModal using MatDialog
    const dialogRef = this.dialog.open(ConfirmationModal, {
      width: '400px',
      data: {
      }
    });

    const instance = dialogRef.componentInstance;
    instance.title = 'Delete Admin Account';
    instance.message = `Are you sure you want to delete ${user.name}?`;
    instance.subMessage = 'This action will deactivate their access to the system.';
    instance.confirmLabel = 'Delete';
    instance.variant = 'danger';

    instance.confirm.subscribe(() => {
      this.userManagementService.deleteAdmin(user.id).subscribe({
        next: () => {
          this.users.update(current => current.filter(u => u.id !== user.id));
          dialogRef.close();
        },
        error: (err) => console.error('Delete failed:', err)
      });
    });

    instance.cancel.subscribe(() => {
      dialogRef.close();
    });
  }
}