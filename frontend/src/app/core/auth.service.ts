import { Injectable, signal, computed } from '@angular/core';
import { createClient, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { AuthConfigService } from './auth-config.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private supabase: ReturnType<typeof createClient> | null = null;
  private sessionSig = signal<Session | null>(null);
  session = this.sessionSig.asReadonly();
  user = computed(() => this.sessionSig()?.user ?? null);
  isLoggedIn = computed(() => !!this.sessionSig()?.user);

  constructor(private authConfig: AuthConfigService) {}

  async init(): Promise<void> {
    if (this.supabase) return;
    const config = await this.authConfig.getConfig();
    if (!config.useAuth || !config.supabaseUrl || !config.supabaseAnonKey) return;
    this.supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
    const { data: { session } } = await this.supabase.auth.getSession();
    this.sessionSig.set(session);
    this.supabase.auth.onAuthStateChange((_e: AuthChangeEvent, session: Session | null) => this.sessionSig.set(session));
  }

  async signIn(email: string, password: string): Promise<{ error?: string }> {
    if (!this.supabase) return { error: 'Auth not configured' };
    const { error } = await this.supabase.auth.signInWithPassword({ email, password });
    return error ? { error: error.message } : {};
  }

  async signUp(email: string, password: string): Promise<{ error?: string; needsConfirmation?: boolean }> {
    if (!this.supabase) return { error: 'Auth not configured' };
    const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: redirectTo ? { emailRedirectTo: redirectTo } : undefined
    });
    if (error) return { error: error.message };
    const needsConfirmation = !!data.user && !data.session;
    return needsConfirmation ? { needsConfirmation: true } : {};
  }

  async signOut(): Promise<void> {
    await this.supabase?.auth.signOut();
  }

  getAccessToken(): string | null {
    return this.sessionSig()?.access_token ?? null;
  }
}
