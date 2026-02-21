import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService, ProductionEntry } from '../../core/api.service';

@Component({
  selector: 'app-entry-form',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './entry-form.component.html',
  styleUrl: './entry-form.component.css'
})
export class EntryFormComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  id = signal<number | null>(null);
  model = signal<Partial<ProductionEntry>>({
    date: new Date().toISOString().slice(0, 10),
    employee_name: '',
    shift: '',
    machine: '',
    program_no: '',
    cycle_time_sec: 0,
    hours_worked: 12,
    pdn_req: null,
    producted_qty: null,
    notes: ''
  });
  saving = signal(false);
  error = signal<string | null>(null);
  employees = signal<string[]>([]);
  shifts = signal<string[]>([]);
  machines = signal<string[]>([]);

  employeeOptions = computed(() => {
    const list = this.employees();
    const cur = this.model().employee_name;
    if (cur && !list.includes(cur)) return [...list, cur];
    return list;
  });
  machineOptions = computed(() => {
    const list = this.machines();
    const cur = this.model().machine;
    if (cur && !list.includes(cur)) return [...list, cur];
    return list;
  });

  /** PDN Req (target): 3600 ÷ cycle time × actual hours, rounded to whole number. */
  expectedProduction = computed(() => {
    const m = this.model();
    const ct = Number(m.cycle_time_sec);
    const hw = Number(m.hours_worked);
    if (!ct || ct <= 0 || !hw || hw <= 0) return null;
    const actualHours = (hw * 11) / 12;
    const piecesPerHour = 3600 / ct;
    return Math.round(piecesPerHour * actualHours);
  });

  ngOnInit() {
    this.api.getFilterOptions().subscribe({
      next: (opts) => {
        this.employees.set(opts.employees || []);
        this.shifts.set(opts.shifts || ['1st', '2nd']);
        this.machines.set(opts.machines || []);
      },
      error: () => {}
    });
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = +idParam;
      this.id.set(id);
      this.api.getEntry(id).subscribe({
        next: (e) => this.model.set({ ...e }),
        error: (err) => this.error.set(err?.error?.error || 'Not found')
      });
    }
  }

  updateField(key: keyof ProductionEntry, value: unknown) {
    this.model.update(m => ({ ...m, [key]: value }));
  }

  submit() {
    const m = this.model();
    if (!m.date || !m.employee_name || !m.cycle_time_sec || m.cycle_time_sec <= 0 || !m.hours_worked) {
      this.error.set('Fill date, employee name, cycle time and hours worked.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const pdnReq = (typeof m.pdn_req === 'number' && !Number.isNaN(m.pdn_req)) ? m.pdn_req : (this.expectedProduction() ?? null);
    const payload = {
      date: m.date,
      employee_name: m.employee_name,
      shift: m.shift || '',
      machine: m.machine || '',
      program_no: m.program_no || '',
      cycle_time_sec: m.cycle_time_sec,
      hours_worked: m.hours_worked,
      pdn_req: pdnReq,
      producted_qty: m.producted_qty ?? null,
      notes: m.notes || ''
    };
    const id = this.id();
    (id
      ? this.api.updateEntry(id, payload)
      : this.api.createEntry(payload)
    ).subscribe({
      next: () => this.router.navigate(['/entries']),
      error: (e) => { this.error.set(e?.error?.error || 'Save failed'); this.saving.set(false); }
    });
  }
}
