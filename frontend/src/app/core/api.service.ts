import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

/** Relative path: same origin in production (Render). In dev, proxy forwards /api to backend. */
const API = '/api';

export interface ProductionEntry {
  id?: number;
  date: string;
  employee_name: string;
  shift: string;
  machine: string;
  program_no: string;
  cycle_time_sec: number;
  hours_worked: number;
  actual_hours?: number;
  pieces_per_hour?: number;
  actual_pdn?: number;
  pdn_req?: number | null;
  producted_qty?: number | null;
  short?: number | null;
  notes?: string;
}

export interface DashboardData {
  dateFrom: string;
  dateTo: string;
  summary: { total_actual_hours: number; total_pdn_req: number; total_producted_qty: number; total_short: number; entry_count: number };
  by_employee: { employee_name: string; program_no: string; actual_hours: number; pdn_req: number; producted_qty: number; short: number }[];
}

export interface FilterOptions {
  employees: string[];
  shifts: string[];
  machines: string[];
  program_nos: string[];
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  getEntries(filters?: { dateFrom?: string; dateTo?: string; employee?: string; shift?: string; machine?: string; program_no?: string }) {
    let params = new HttpParams();
    if (filters) {
      if (filters.dateFrom) params = params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params = params.set('dateTo', filters.dateTo);
      if (filters.employee) params = params.set('employee', filters.employee);
      if (filters.shift) params = params.set('shift', filters.shift);
      if (filters.machine) params = params.set('machine', filters.machine);
      if (filters.program_no) params = params.set('program_no', filters.program_no);
    }
    return this.http.get<ProductionEntry[]>(`${API}/entries`, { params });
  }

  getEntry(id: number) {
    return this.http.get<ProductionEntry>(`${API}/entries/${id}`);
  }

  createEntry(entry: Partial<ProductionEntry>) {
    return this.http.post<ProductionEntry>(`${API}/entries`, entry);
  }

  updateEntry(id: number, entry: Partial<ProductionEntry>) {
    return this.http.put<ProductionEntry>(`${API}/entries/${id}`, entry);
  }

  deleteEntry(id: number) {
    return this.http.delete<{ deleted: boolean }>(`${API}/entries/${id}`);
  }

  /** Export Excel for the same filters as the entries list (no default date range) */
  getEntriesExport(filters?: { dateFrom?: string; dateTo?: string; employee?: string; shift?: string; machine?: string; program_no?: string }) {
    let params = new HttpParams();
    if (filters) {
      if (filters.dateFrom) params = params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params = params.set('dateTo', filters.dateTo);
      if (filters.employee) params = params.set('employee', filters.employee);
      if (filters.shift) params = params.set('shift', filters.shift);
      if (filters.machine) params = params.set('machine', filters.machine);
      if (filters.program_no) params = params.set('program_no', filters.program_no);
    }
    return this.http.get(`${API}/entries/export`, { params, responseType: 'blob' });
  }

  getDashboard(filters?: { dateFrom?: string; dateTo?: string; employee?: string; shift?: string; machine?: string; program_no?: string }) {
    let params = new HttpParams();
    if (filters) {
      if (filters.dateFrom) params = params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params = params.set('dateTo', filters.dateTo);
      if (filters.employee) params = params.set('employee', filters.employee);
      if (filters.shift) params = params.set('shift', filters.shift);
      if (filters.machine) params = params.set('machine', filters.machine);
      if (filters.program_no) params = params.set('program_no', filters.program_no);
    }
    return this.http.get<DashboardData>(`${API}/dashboard`, { params });
  }

  getFilterOptions() {
    return this.http.get<FilterOptions>(`${API}/dashboard/filters`);
  }

  getDashboardExport(filters?: { dateFrom?: string; dateTo?: string; employee?: string; shift?: string; machine?: string; program_no?: string }) {
    let params = new HttpParams();
    if (filters) {
      if (filters.dateFrom) params = params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params = params.set('dateTo', filters.dateTo);
      if (filters.employee) params = params.set('employee', filters.employee);
      if (filters.shift) params = params.set('shift', filters.shift);
      if (filters.machine) params = params.set('machine', filters.machine);
      if (filters.program_no) params = params.set('program_no', filters.program_no);
    }
    return this.http.get(`${API}/dashboard/export`, { params, responseType: 'blob' });
  }

  getUploadSchemas() {
    return this.http.get<{ id: string; label: string; description: string }[]>(`${API}/upload/schemas`);
  }

  uploadExcel(file: File, type = 'production') {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ imported: number; message: string; type?: string; mappedColumns?: Record<string, string> }>(
      `${API}/upload?type=${encodeURIComponent(type)}`,
      form
    );
  }

  getMachines() {
    return this.http.get<string[]>(`${API}/admin/machines`);
  }

  addMachine(name: string) {
    return this.http.post<string[]>(`${API}/admin/machines`, { name });
  }

  removeMachine(name: string) {
    return this.http.delete<string[]>(`${API}/admin/machines/${encodeURIComponent(name)}`);
  }

  getEmployees() {
    return this.http.get<string[]>(`${API}/admin/employees`);
  }

  addEmployee(name: string) {
    return this.http.post<string[]>(`${API}/admin/employees`, { name });
  }

  removeEmployee(name: string) {
    return this.http.delete<string[]>(`${API}/admin/employees/${encodeURIComponent(name)}`);
  }

  getPrograms() {
    return this.http.get<string[]>(`${API}/admin/programs`);
  }

  addProgram(name: string) {
    return this.http.post<string[]>(`${API}/admin/programs`, { name });
  }

  removeProgram(name: string) {
    return this.http.delete<string[]>(`${API}/admin/programs/${encodeURIComponent(name)}`);
  }
}
