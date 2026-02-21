import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { from, catchError, switchMap } from 'rxjs';
import { AuthConfigService } from './auth-config.service';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authConfig = inject(AuthConfigService);
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!req.url.startsWith('/api') || req.url.includes('/api/config')) return next(req);

  return from(authConfig.getConfig()).pipe(
    switchMap(() => from(auth.init())),
    switchMap(() => {
      const token = auth.getAccessToken();
      const newReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
      return next(newReq);
    }),
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) router.navigate(['/login']);
      throw err;
    })
  );
}
