import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'entries', loadComponent: () => import('./pages/entries/entries.component').then(m => m.EntriesComponent) },
  { path: 'entries/new', loadComponent: () => import('./pages/entry-form/entry-form.component').then(m => m.EntryFormComponent) },
  { path: 'entries/:id/edit', loadComponent: () => import('./pages/entry-form/entry-form.component').then(m => m.EntryFormComponent) },
  { path: 'upload', loadComponent: () => import('./pages/upload/upload.component').then(m => m.UploadComponent) },
  { path: 'admin', loadComponent: () => import('./pages/admin/admin.component').then(m => m.AdminComponent) },
  { path: '**', redirectTo: 'dashboard' }
];
