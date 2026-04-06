import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { ApiService, ProductionEntry } from '../../core/api.service';

/** Parse HH:mm (or HH:mm:ss) to decimal hours duration; if end ≤ start, treat end as next day. */
function hoursBetween(from: string, to: string): number {
  const parse = (t: string): number | null => {
    const parts = String(t || '').trim().split(':');
    if (!parts[0]) return null;
    const h = Number(parts[0]);
    const m = Number(parts[1] != null ? parts[1] : 0);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return h * 60 + m;
  };
  const a = parse(from);
  const b = parse(to);
  if (a == null || b == null) return NaN;
  let end = b;
  if (end <= a) end += 24 * 60;
  return (end - a) / 60;
}

@Component({
  selector: 'app-entry-form',
  standalone: true,
  imports: [RouterLink, FormsModule, DecimalPipe],
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
    actual_working_hours: null,
    pdn_req: null,
    producted_qty: null,
    payment: null,
    notes: ''
  });
  saving = signal(false);
  error = signal<string | null>(null);
  employees = signal<string[]>([]);
  shifts = signal<string[]>([]);
  machines = signal<string[]>([]);
  /** From / To; when both set, hours_worked is updated (can still override in Hours field). */
  timeFrom = signal('');
  timeTo = signal('');
  /** UI split of cycle_time_sec (still stored as total seconds in API). */
  cycleMins = signal(0);
  cycleSecs = signal(0);

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

  /** PDN Req (target): (3600 ÷ cycle seconds) × actual working hours, rounded. */
  expectedProduction = computed(() => {
    const m = this.model();
    const ct = Number(m.cycle_time_sec);
    const awh = Number(m.actual_working_hours ?? m.actual_hours);
    if (!ct || ct <= 0 || !Number.isFinite(awh) || awh <= 0) return null;
    const piecesPerHour = 3600 / ct;
    return Math.round(piecesPerHour * awh);
  });

  /** Legacy hint: 11/12 of login hours when breaks are excluded. */
  suggestedActualWorkingHours = computed(() => {
    const hw = Number(this.model().hours_worked);
    if (!Number.isFinite(hw) || hw <= 0) return null;
    return Math.round((hw * 11) / 12 * 100) / 100;
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
        next: (e) => {
          const awh = e.actual_working_hours != null ? e.actual_working_hours : e.actual_hours;
          this.model.set({ ...e, actual_working_hours: awh != null ? Number(awh) : null });
          this.hydrateCycleFromModel();
          this.timeFrom.set((e.time_from && String(e.time_from).trim()) || '');
          this.timeTo.set((e.time_to && String(e.time_to).trim()) || '');
        },
        error: (err) => this.error.set(err?.error?.error || 'Not found')
      });
    } else {
      this.hydrateCycleFromModel();
      this.timeFrom.set('08:00');
      this.timeTo.set('20:00');
      this.syncHoursFromTimes();
      const hw = Number(this.model().hours_worked);
      if (Number.isFinite(hw) && hw > 0) {
        const sug = Math.round((hw * 11) / 12 * 100) / 100;
        this.model.update(m => ({ ...m, actual_working_hours: sug }));
      }
    }
  }

  updateField(key: keyof ProductionEntry, value: unknown) {
    if (key === 'hours_worked') {
      const n = value === '' || value == null ? NaN : Number(value);
      this.model.update(m => ({
        ...m,
        hours_worked: Number.isFinite(n) ? Math.round(n * 100) / 100 : m.hours_worked
      }));
      return;
    }
    if (key === 'payment') {
      if (value === '' || value == null) {
        this.model.update(m => ({ ...m, payment: null }));
        return;
      }
      const n = Number(value);
      this.model.update(m => ({
        ...m,
        payment: Number.isFinite(n) ? Math.round(n * 100) / 100 : null
      }));
      return;
    }
    if (key === 'actual_working_hours') {
      if (value === '' || value == null) {
        this.model.update(m => ({ ...m, actual_working_hours: null }));
        return;
      }
      const n = Number(value);
      this.model.update(m => ({
        ...m,
        actual_working_hours: Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null
      }));
      return;
    }
    this.model.update(m => ({ ...m, [key]: value }));
  }

  setCycleMins(v: unknown) {
    const n = v === '' || v == null ? 0 : Number(v);
    this.cycleMins.set(Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0);
    this.applyCycleToModel();
  }

  setCycleSecs(v: unknown) {
    const n = v === '' || v == null ? 0 : Number(v);
    this.cycleSecs.set(Number.isFinite(n) && n >= 0 ? n : 0);
    this.applyCycleToModel();
  }

  private applyCycleToModel() {
    const total = this.cycleMins() * 60 + this.cycleSecs();
    const rounded = Math.round(total * 100) / 100;
    this.model.update(m => ({ ...m, cycle_time_sec: rounded }));
  }

  private hydrateCycleFromModel() {
    const ct = Number(this.model().cycle_time_sec);
    if (!Number.isFinite(ct) || ct < 0) {
      this.cycleMins.set(0);
      this.cycleSecs.set(0);
      return;
    }
    const mins = Math.floor(ct / 60);
    const secs = Math.round((ct - mins * 60) * 100) / 100;
    this.cycleMins.set(mins);
    this.cycleSecs.set(secs);
  }

  setTimeFrom(v: string) {
    this.timeFrom.set(v || '');
    this.syncHoursFromTimes();
  }

  setTimeTo(v: string) {
    this.timeTo.set(v || '');
    this.syncHoursFromTimes();
  }

  /** When both From and To are set, updates hours_worked; otherwise leaves hours unchanged (e.g. loaded entry). */
  syncHoursFromTimes(): void {
    const from = this.timeFrom().trim();
    const to = this.timeTo().trim();
    if (!from || !to) return;
    const hw = hoursBetween(from, to);
    if (!Number.isFinite(hw) || hw <= 0) return;
    this.model.update(m => ({ ...m, hours_worked: Math.round(hw * 100) / 100 }));
  }

  submit() {
    const m = this.model();
    const hw = Number(m.hours_worked);
    const ct = Number(m.cycle_time_sec);
    const awh = Number(m.actual_working_hours);
    if (!m.date || !m.employee_name || !Number.isFinite(ct) || ct <= 0 || !Number.isFinite(hw) || hw <= 0) {
      this.error.set('Fill date, employee name, cycle time (min + sec), and login hours.');
      return;
    }
    if (!Number.isFinite(awh) || awh <= 0) {
      this.error.set('Enter actual working hours (time spent producing).');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const pdnReq = (typeof m.pdn_req === 'number' && !Number.isNaN(m.pdn_req)) ? m.pdn_req : (this.expectedProduction() ?? null);
    const tf = this.timeFrom().trim();
    const tt = this.timeTo().trim();
    const payload = {
      date: m.date,
      employee_name: m.employee_name,
      shift: m.shift || '',
      machine: m.machine || '',
      program_no: m.program_no || '',
      cycle_time_sec: ct,
      hours_worked: hw,
      actual_working_hours: awh,
      pdn_req: pdnReq,
      producted_qty: m.producted_qty ?? null,
      payment: m.payment != null && Number.isFinite(Number(m.payment)) ? Number(m.payment) : null,
      notes: m.notes || '',
      time_from: tf || null,
      time_to: tt || null
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
