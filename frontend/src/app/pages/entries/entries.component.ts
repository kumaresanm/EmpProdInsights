import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService, ProductionEntry, DayEvent } from '../../core/api.service';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-entries',
  standalone: true,
  imports: [RouterLink, DecimalPipe, FormsModule],
  templateUrl: './entries.component.html',
  styleUrl: './entries.component.css'
})
export class EntriesComponent implements OnInit {
  private api = inject(ApiService);
  entries = signal<ProductionEntry[]>([]);
  employees = signal<string[]>([]);
  shifts = signal<string[]>([]);
  machines = signal<string[]>([]);
  programNos = signal<string[]>([]);
  dayEvents = signal<DayEvent[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  filters = signal({ dateFrom: '', dateTo: '', employee: '', shift: '', machine: '', program_no: '' });

  /** date YYYY-MM-DD -> { summary, detail } for table + title */
  dayEventByDate = computed(() => {
    const m = new Map<string, { summary: string; detail: string }>();
    for (const ev of this.dayEvents()) {
      const d = (ev.date || '').slice(0, 10);
      if (!d) continue;
      m.set(d, { summary: ev.summary || '', detail: (ev.detail || '').trim() });
    }
    return m;
  });

  ngOnInit() {
    this.api.getFilterOptions().subscribe({
      next: (opts) => {
        this.employees.set(opts.employees);
        this.shifts.set(opts.shifts);
        this.machines.set(opts.machines);
        this.programNos.set(opts.program_nos || []);
      },
      error: () => {}
    });
    this.api.getDayEvents().subscribe({
      next: (list) => this.dayEvents.set(list || []),
      error: () => this.dayEvents.set([])
    });
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api.getEntries(this.filters()).subscribe({
      next: (list) => { this.entries.set(list); this.loading.set(false); },
      error: (e) => { this.error.set(e?.error?.error || 'Failed'); this.loading.set(false); }
    });
  }

  setFilter(key: 'dateFrom' | 'dateTo' | 'employee' | 'shift' | 'machine' | 'program_no', value: string) {
    this.filters.update(f => ({ ...f, [key]: value }));
    this.load();
  }

  onFilterChange() {
    this.load();
  }

  delete(id: number) {
    if (!confirm('Delete this entry?')) return;
    this.api.deleteEntry(id).subscribe({
      next: () => this.load(),
      error: (e) => this.error.set(e?.error?.error || 'Delete failed')
    });
  }

  exportExcel() {
    const f = this.filters();
    this.api.getEntriesExport({
      dateFrom: f.dateFrom || undefined,
      dateTo: f.dateTo || undefined,
      employee: f.employee || undefined,
      shift: f.shift || undefined,
      machine: f.machine || undefined,
      program_no: f.program_no || undefined
    }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `production-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (e) => this.error.set(e?.error?.error || e?.message || 'Export failed')
    });
  }

  dayEventForRow(entryDate: string | undefined): { summary: string; detail: string } | null {
    if (!entryDate) return null;
    const d = entryDate.slice(0, 10);
    return this.dayEventByDate().get(d) ?? null;
  }

  /** Display stored seconds as minutes + seconds for the table. */
  formatCycleDisplay(sec: unknown): string {
    const s = Number(sec);
    if (!Number.isFinite(s) || s <= 0) return '—';
    const m = Math.floor(s / 60);
    const rem = Math.round((s - m * 60) * 100) / 100;
    const remStr = String(rem);
    if (m <= 0) return `${remStr}s`;
    return `${m}m ${remStr}s`;
  }
}
