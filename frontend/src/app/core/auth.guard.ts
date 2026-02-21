import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthConfigService } from './auth-config.service';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async () => {
  const authConfig = inject(AuthConfigService);
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.init();
  const config = await authConfig.getConfig();
  if (!config.useAuth) return true;
  if (auth.isLoggedIn()) return true;
  router.navigate(['/login']);
  return false;
};
