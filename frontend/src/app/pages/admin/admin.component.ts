import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit {
  private api = inject(ApiService);
  machines = signal<string[]>([]);
  employees = signal<string[]>([]);
  programs = signal<string[]>([]);
  newMachine = signal('');
  newEmployee = signal('');
  newProgram = signal('');
  error = signal<string | null>(null);
  message = signal<string | null>(null);
  deletingAll = signal(false);

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.getMachines().subscribe({ next: (m) => this.machines.set(m), error: () => this.machines.set([]) });
    this.api.getEmployees().subscribe({ next: (e) => this.employees.set(e), error: () => this.employees.set([]) });
    this.api.getPrograms().subscribe({ next: (p) => this.programs.set(p), error: () => this.programs.set([]) });
  }

  addMachine() {
    const name = this.newMachine().trim();
    if (!name) return;
    this.error.set(null);
    this.api.addMachine(name).subscribe({
      next: (list) => { this.machines.set(list); this.newMachine.set(''); this.message.set('Machine added'); setTimeout(() => this.message.set(null), 2000); },
      error: (e) => this.error.set(this.getErrorMessage(e))
    });
  }

  removeMachine(name: string) {
    if (!confirm(`Remove machine "${name}"?`)) return;
    this.error.set(null);
    this.api.removeMachine(name).subscribe({
      next: (list) => this.machines.set(list),
      error: (e) => this.error.set(this.getErrorMessage(e))
    });
  }

  addEmployee() {
    const name = this.newEmployee().trim();
    if (!name) return;
    this.error.set(null);
    this.api.addEmployee(name).subscribe({
      next: (list) => { this.employees.set(list); this.newEmployee.set(''); this.message.set('Employee added'); setTimeout(() => this.message.set(null), 2000); },
      error: (e) => this.error.set(this.getErrorMessage(e))
    });
  }

  removeEmployee(name: string) {
    if (!confirm(`Remove employee "${name}"?`)) return;
    this.error.set(null);
    this.api.removeEmployee(name).subscribe({
      next: (list) => this.employees.set(list),
      error: (e) => this.error.set(this.getErrorMessage(e))
    });
  }

  addProgram() {
    const name = this.newProgram().trim();
    if (!name) return;
    this.error.set(null);
    this.api.addProgram(name).subscribe({
      next: (list) => { this.programs.set(list); this.newProgram.set(''); this.message.set('Program added'); setTimeout(() => this.message.set(null), 2000); },
      error: (e) => this.error.set(this.getErrorMessage(e))
    });
  }

  removeProgram(name: string) {
    if (!confirm(`Remove program "${name}"?`)) return;
    this.error.set(null);
    this.api.removeProgram(name).subscribe({
      next: (list) => this.programs.set(list),
      error: (e) => this.error.set(this.getErrorMessage(e))
    });
  }

  deleteAllData() {
    if (!confirm('Delete ALL data? This will remove every production entry and clear Machines, Employees, and Programs. This cannot be undone.')) return;
    this.error.set(null);
    this.deletingAll.set(true);
    this.api.deleteAllData().subscribe({
      next: () => {
        this.deletingAll.set(false);
        this.load();
        this.message.set('All data deleted');
        setTimeout(() => this.message.set(null), 3000);
      },
      error: (e) => {
        this.deletingAll.set(false);
        this.error.set(this.getErrorMessage(e));
      }
    });
  }

  private getErrorMessage(e: { error?: { error?: string; message?: string }; message?: string; status?: number }): string {
    const err = e?.error;
    if (err && typeof err === 'object' && (err.error || err.message)) return (err as { error?: string; message?: string }).error || (err as { message?: string }).message || 'Failed';
    if (err && typeof err === 'string') return err;
    if (e?.message) return e.message;
    if (e?.status === 0) return 'Cannot reach server. Is the backend running on port 3001?';
    if (e?.status) return `Error ${e.status}`;
    return 'Failed';
  }
}
