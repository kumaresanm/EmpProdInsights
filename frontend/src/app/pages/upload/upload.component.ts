import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './upload.component.html',
  styleUrl: './upload.component.css'
})
export class UploadComponent implements OnInit {
  private api = inject(ApiService);
  file = signal<File | null>(null);
  uploading = signal(false);
  importType = signal('production');
  schemas = signal<{ id: string; label: string; description: string }[]>([]);
  result = signal<{ imported: number; message: string; type?: string; mappedColumns?: Record<string, string> } | null>(null);
  error = signal<string | null>(null);
  errorDetail = signal<{ missing?: string[]; hint?: string; detected?: Record<string, string> } | null>(null);

  currentSchemaDescription = computed(() => {
    const type = this.importType();
    const s = this.schemas().find(x => x.id === type);
    return s?.description ?? '';
  });

  mappedColumnsList = computed(() => {
    const r = this.result()?.mappedColumns;
    if (!r) return [];
    return Object.keys(r).map(key => ({ key, value: r[key] }));
  });

  detectedColumnsList = computed(() => {
    const d = this.errorDetail()?.detected;
    if (!d) return [];
    return Object.keys(d).map(key => ({ key, value: d[key] }));
  });

  missingColumns = computed(() => this.errorDetail()?.missing ?? []);
  errorHint = computed(() => this.errorDetail()?.hint ?? '');
  resultMessage = computed(() => this.result()?.message ?? '');

  ngOnInit() {
    this.api.getUploadSchemas().subscribe({
      next: (list) => this.schemas.set(list),
      error: () => this.schemas.set([{ id: 'production', label: 'Production entries', description: '' }])
    });
  }

  onFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    const f = input.files?.[0];
    this.file.set(f || null);
    this.result.set(null);
    this.error.set(null);
    this.errorDetail.set(null);
  }

  upload() {
    const f = this.file();
    if (!f) { this.error.set('Choose a file'); return; }
    this.uploading.set(true);
    this.error.set(null);
    this.errorDetail.set(null);
    this.result.set(null);
    this.api.uploadExcel(f, this.importType()).subscribe({
      next: (r) => {
        this.result.set(r);
        this.uploading.set(false);
      },
      error: (e) => {
        this.error.set(e?.error?.error || 'Upload failed');
        this.errorDetail.set({
          missing: e?.error?.missing,
          hint: e?.error?.hint,
          detected: e?.error?.detected
        });
        this.uploading.set(false);
      }
    });
  }
}
