import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
  { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard] },
  { path: 'entries', loadComponent: () => import('./pages/entries/entries.component').then(m => m.EntriesComponent), canActivate: [authGuard] },
  { path: 'entries/new', loadComponent: () => import('./pages/entry-form/entry-form.component').then(m => m.EntryFormComponent), canActivate: [authGuard] },
  { path: 'entries/:id/edit', loadComponent: () => import('./pages/entry-form/entry-form.component').then(m => m.EntryFormComponent), canActivate: [authGuard] },
  { path: 'upload', loadComponent: () => import('./pages/upload/upload.component').then(m => m.UploadComponent), canActivate: [authGuard] },
  { path: 'admin', loadComponent: () => import('./pages/admin/admin.component').then(m => m.AdminComponent), canActivate: [authGuard] },
  { path: '**', redirectTo: 'dashboard' }
];
