import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface AuthConfig {
  useAuth: boolean;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthConfigService {
  private config: AuthConfig | null = null;
  private fetchPromise: Promise<AuthConfig> | null = null;

  constructor(private http: HttpClient) {}

  getConfig(): Promise<AuthConfig> {
    if (this.config) return Promise.resolve(this.config);
    if (this.fetchPromise) return this.fetchPromise;
    this.fetchPromise = firstValueFrom(this.http.get<AuthConfig>('/api/config'))
      .then(c => { this.config = c ?? { useAuth: false }; return this.config; })
      .catch(() => { this.config = { useAuth: false }; return this.config; });
    return this.fetchPromise;
  }

  get useAuth(): boolean {
    return this.config?.useAuth ?? false;
  }
}
