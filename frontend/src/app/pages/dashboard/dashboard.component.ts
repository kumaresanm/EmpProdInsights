import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { ApiService, DashboardData } from '../../core/api.service';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface ChartBar {
  label: string;
  sublabel?: string;
  value: number;
  max: number;
  pct: number;
  isShort?: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DecimalPipe, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  data = signal<DashboardData | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  employees = signal<string[]>([]);
  shifts = signal<string[]>([]);
  machines = signal<string[]>([]);
  programNos = signal<string[]>([]);

  filters = signal({
    dateFrom: '',
    dateTo: '',
    month: '',
    employee: '',
    machine: '',
    shift: '',
    program_no: ''
  });

  achievementPct = computed(() => {
    const d = this.data();
    if (!d?.summary?.total_pdn_req || d.summary.total_pdn_req <= 0) return null;
    return Math.min(100, Math.round((d.summary.total_producted_qty / d.summary.total_pdn_req) * 100));
  });

  productionVsTargetBar = computed(() => {
    const d = this.data();
    if (!d?.summary) return null;
    const target = d.summary.total_pdn_req || 0;
    const produced = d.summary.total_producted_qty || 0;
    const pct = target > 0 ? Math.min(100, (produced / target) * 100) : 0;
    return { produced, target, pct };
  });

  byEmployeeBars = computed((): ChartBar[] => {
    const d = this.data();
    if (!d?.by_employee?.length) return [];
    return d.by_employee.map(row => {
      const max = row.pdn_req && row.pdn_req > 0 ? row.pdn_req : 1;
      const value = row.producted_qty ?? 0;
      const pct = Math.min(100, Math.round((value / max) * 100));
      return {
        label: row.employee_name,
        sublabel: row.program_no,
        value,
        max,
        pct,
        isShort: (row.short ?? 0) > 0
      };
    }).slice(0, 12);
  });

  ngOnInit() {
    const today = new Date().toISOString().slice(0, 10);
    this.filters.update(f => ({ ...f, dateFrom: today, dateTo: today }));
    this.api.getFilterOptions().subscribe({
      next: (opts) => {
        this.employees.set(opts.employees || []);
        this.shifts.set(opts.shifts || []);
        this.machines.set(opts.machines || []);
        this.programNos.set(opts.program_nos || []);
      },
      error: () => {}
    });
    this.load();
  }

  setFilter(key: string, value: string) {
    const next: Record<string, string> = { [key]: value };
    if (key === 'month' && value) {
      const [y, m] = value.split('-').map(Number);
      next['dateFrom'] = `${y}-${String(m).padStart(2, '0')}-01`;
      next['dateTo'] = `${y}-${String(m).padStart(2, '0')}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
    }
    this.filters.update(f => ({ ...f, ...next }));
    this.load();
  }

  load() {
    const f = this.filters();
    const dateFrom = f.dateFrom || new Date().toISOString().slice(0, 10);
    const dateTo = f.dateTo || new Date().toISOString().slice(0, 10);
    this.loading.set(true);
    this.api.getDashboard({
      dateFrom,
      dateTo,
      employee: f.employee || undefined,
      machine: f.machine || undefined,
      shift: f.shift || undefined,
      program_no: f.program_no || undefined
    }).subscribe({
      next: (d) => { this.data.set(d); this.loading.set(false); },
      error: (e) => { this.error.set(e?.error?.error || e?.message || 'Failed to load'); this.loading.set(false); }
    });
  }

}
