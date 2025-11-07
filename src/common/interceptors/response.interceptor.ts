import { Injectable, type NestInterceptor, type ExecutionContext, type CallHandler } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { IResponseInterceptor } from '@/typings/interceptor';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
  // private readonly timestampFormat: string;

  // constructor() {
  //   this.timestampFormat = 'YYYY-MM-DDTHH:mm:ss.SSSZ';
  // }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() === 'http') {
      return next.handle().pipe(
        map((returns: IResponseInterceptor) => {
          const { message = 'Success', data = null, ...rest } = returns || {};

          return {
            message,
            data,
            ...rest,
            timestamp: Date.now(),
          };
        }),
      );
    }
    return next.handle();
  }
}
