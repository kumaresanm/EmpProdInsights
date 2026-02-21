import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthConfigService } from './core/auth-config.service';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  private authConfig = inject(AuthConfigService);
  private auth = inject(AuthService);
  private router = inject(Router);
  useAuth = signal(false);
  configLoaded = signal(false);
  navOpen = signal(false);

  closeNav() { this.navOpen.set(false); }
  toggleNav() { this.navOpen.update(v => !v); }

  ngOnInit() {
    this.authConfig.getConfig().then(c => {
      this.useAuth.set(c.useAuth);
      this.configLoaded.set(true);
    });
  }

  /** Use in template as isLoggedIn() to read current value */
  isLoggedIn = this.auth.isLoggedIn;

  async signOut() {
    await this.auth.signOut();
    this.router.navigate(['/login']);
  }
}
