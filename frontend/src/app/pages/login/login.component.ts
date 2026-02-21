import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthConfigService } from '../../core/auth-config.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  private authConfig = inject(AuthConfigService);
  private auth = inject(AuthService);
  private router = inject(Router);
  email = signal('');
  password = signal('');
  isSignUp = signal(false);
  error = signal<string | null>(null);
  loading = signal(false);
  useAuth = signal(false);

  async ngOnInit() {
    const config = await this.authConfig.getConfig();
    this.useAuth.set(config.useAuth);
    if (!config.useAuth) this.router.navigate(['/dashboard']);
    if (config.useAuth) await this.auth.init();
  }

  async submit() {
    const email = this.email().trim();
    const password = this.password();
    if (!email || !password) {
      this.error.set('Email and password required');
      return;
    }
    this.error.set(null);
    this.loading.set(true);
    try {
      const result = this.isSignUp()
        ? await this.auth.signUp(email, password)
        : await this.auth.signIn(email, password);
      if (result.error) {
        this.error.set(result.error);
        return;
      }
      this.router.navigate(['/dashboard']);
    } finally {
      this.loading.set(false);
    }
  }

  toggleMode() {
    this.isSignUp.update(v => !v);
    this.error.set(null);
  }
}
