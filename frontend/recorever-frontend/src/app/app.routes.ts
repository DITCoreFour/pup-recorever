import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth-guard';
import { publicGuard } from './core/auth/public-guard';
import { adminGuard } from './core/auth/admin-guard';

import { HeaderNFooterOnly
  } from './layout/header-nfooter-only/header-nfooter-only';
import { HeaderOnly } from './layout/header-only/header-only';
import { UserLayout } from './layout/user-layout/user-layout';
import { AdminLayout } from './layout/admin-layout/admin-layout';
import { SuperadminLayout } from './layout/superadmin-layout/superadmin-layout';

export const AppRoutePaths = {
  REPORT_LOST: '/app/report-lost',
  REPORT_FOUND: '/app/report-found',
  BROWSE: '/app/browse',
  PROFILE: '/app/profile',
  MY_REPORTS: '/app/my-reports',
  USER_PROFILE: (id: number | string) => `/app/profile/${id}`,
  ABOUT_US: '/app/about-us',

  REPORT_STATUS_MANAGEMENT: '/admin/report-status',
  FOUND_ITEM_MANAGEMENT: '/admin/claim-status',
  ADMIN_MY_REPORTS: '/admin/my-reports',
  ADMIN_REPORT_LOST: '/admin/report-lost',
  ADMIN_REPORT_FOUND: '/admin/report-found',
  HELP_PAGE: '/help-page',
};

export const routes: Routes = [
  {
    path: '',
    component: HeaderNFooterOnly,
    canActivate: [publicGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./page/public/homepage/homepage')
          .then(m => m.Homepage)
      },
      {
        path: 'about-us',
        loadComponent: () => import('./page/public/about-us-page/about-us-page')
          .then(m => m.AboutUsPage)
      },
      {
        path: 'help-page',
        loadComponent: () => import('./page/public/help-page/help-page')
          .then(m => m.HelpPage)
      }
    ],
  },
  {
    path: '',
    component: HeaderOnly,
    canActivate: [publicGuard],
    children: [
      { path: 'login',
        loadComponent: () => import('./page/public/login-page/login-page')
          .then(m => m.LoginPage) },
      { path: 'register',
        loadComponent: () => import('./page/public/register-page/register-page')
          .then(m => m.RegisterPage) },
      { path: 'forgot-password',
        loadComponent: () =>
          import('./page/public/forgot-pass-page/forgot-pass-page')
            .then(m => m.ForgotPassPage) },
      { path: 'reset-password',
        loadComponent: () =>
          import('./page/public/reset-pass-page/reset-pass-page')
            .then(m => m.ResetPassPage) },
    ],
  },
  {
    path: 'app',
    component: UserLayout,
    children: [
      {
        path: 'browse',
        loadComponent: () =>
          import('./page/user/user-item-list-page/user-item-list-page')
              .then((m) => m.UserItemListPage),
        title: 'Browse Items - Recorever',
        data: { itemType: 'lost' } 
      },
      { path: 'report-lost',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./page/shared-page/report-lost-page/report-lost-page')
            .then(m => m.ReportLostPage)
      },
      { path: 'report-found',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./page/shared-page/report-found-page/report-found-page')
            .then(m => m.ReportFoundPage)
      },
      { path: 'profile',
        canActivate: [authGuard],
        loadComponent: () => import('./page/user/profile-page/profile-page')
          .then(m => m.ProfilePage)
      },
      {
        path: 'my-reports',
        loadComponent: () => 
            import('./page/shared-page/my-reports-page/my-reports-page')
          .then(m => m.MyReportsPage)
      },
      { path: 'profile/:id',
        canActivate: [authGuard],
        loadComponent: () => import('./page/user/profile-page/profile-page')
          .then(m => m.ProfilePage)
      },
      { path: 'notifications',
        canActivate: [authGuard],
        loadComponent: () => import(
          './page/shared-page/notification-page/notification-page'
        ).then(m => m.NotificationPage)
      },
      { path: 'about-us',
        loadComponent: () => import('./page/public/about-us-page/about-us-page')
          .then(m => m.AboutUsPage)
      },
      {
        path: 'help-page',
        loadComponent: () => import('./page/public/help-page/help-page')
          .then(m => m.HelpPage)
      },
      { path: '', redirectTo: 'lost-items', pathMatch: 'full' },
    ],
  },
  {
    path: 'admin',
    component: AdminLayout,
    canActivate: [authGuard, adminGuard],
    children: [
      { path: 'dashboard',
        loadComponent: () =>
          import('./page/admin/admin-dashboard-page/admin-dashboard-page')
            .then(m => m.AdminDashboardPage)
      },
      { path: 'lost-items',
        loadComponent: () =>
          import('./page/admin/admin-item-list-page/admin-item-list-page')
            .then(m => m.AdminItemListPage),
        data: { itemType: 'lost', status: 'approved' }
      },
      { path: 'found-items',
        loadComponent: () =>
          import('./page/admin/admin-item-list-page/admin-item-list-page')
            .then(m => m.AdminItemListPage),
        data: { itemType: 'found', status: 'approved' }
      },
      { path: 'report-status',
        loadComponent: () =>
          import('./page/admin/lost-status-page/lost-status-page')
            .then(m => m.LostStatusPage)
      },
      { path: 'archive/resolved',
        loadComponent: () =>
          import('./page/admin/admin-item-list-page/admin-item-list-page')
            .then(m => m.AdminItemListPage),
        data: { type: 'lost', status: 'resolved' }
      },
      { path: 'archive/claimed',
        loadComponent: () =>
          import('./page/admin/admin-item-list-page/admin-item-list-page')
            .then(m => m.AdminItemListPage),
        data: { type: 'found', status: 'claimed' }
      },
      { path: 'claim-status',
        loadComponent: () =>
          import('./page/admin/found-status-page/claim-status-page')
            .then(m => m.ClaimStatusPage)
      },
      { path: 'my-reports',
        loadComponent: () =>
            import('./page/shared-page/my-reports-page/my-reports-page')
          .then(m => m.MyReportsPage)
      },
      {
        path: 'report-lost',
        loadComponent: () => import('./page/shared-page/report-lost-page/report-lost-page')
          .then(m => m.ReportLostPage)
      },
      {
        path: 'report-found',
        loadComponent: () => import('./page/shared-page/report-found-page/report-found-page')
          .then(m => m.ReportFoundPage)
      },
      { path: 'notifications',
        loadComponent: () => import(
          './page/shared-page/notification-page/notification-page'
        ).then(m => m.NotificationPage)
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  {
    path: 'superadmin',
    component: SuperadminLayout,
    canActivate: [authGuard, adminGuard],
    children: [
      { path: 'dashboard',
        loadComponent: () =>
          import('./page/admin/admin-dashboard-page/admin-dashboard-page')
            .then(m => m.AdminDashboardPage)
      },
      { 
        path: 'master-data',
        loadComponent: () =>
          import('./page/admin/master-data-page/master-data-page')
            .then(m => m.MasterDataPage),
        title: 'Master Data Management'
      },
      { path: 'notifications',
        loadComponent: () => import(
          './page/shared-page/notification-page/notification-page'
        ).then(m => m.NotificationPage)
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
];