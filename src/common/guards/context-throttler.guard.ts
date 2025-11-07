import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ThrottlerGuard, ThrottlerRequest } from '@nestjs/throttler';

@Injectable()
export class ContextThrottlerGuard extends ThrottlerGuard {
  override getRequestResponse(context: ExecutionContext) {
    const contextType = context.getType<'http' | 'graphql' | 'ws' | 'necord'>();

    if (contextType === 'graphql') {
      const gqlContext = GqlExecutionContext.create(context).getContext();
      return { req: gqlContext.req, res: {} };
    }

    if (contextType === 'ws') {
      const wsClient = context.switchToWs().getClient();
      const req = wsClient?.handshake || {};
      return { req, res: {} };
    }

    const httpContext = context.switchToHttp();
    return {
      req: httpContext.getRequest(),
      res: httpContext.getResponse(),
    };
  }

  protected getTracker(req: Record<string, any>): Promise<string> {
    const ip = req?.ip || req?.headers?.['x-forwarded-for'] || req?.connection?.remoteAddress;
    return Promise.resolve(ip ? String(ip) : 'unknown');
  }

  async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    const { context, limit, ttl, throttler, blockDuration, generateKey } = requestProps;
    const contextType = context.getType<'http' | 'graphql' | 'ws' | 'necord'>();

    if (contextType === 'http') {
      // Only HTTP context should call super.handleRequest (which sets headers)
      return super.handleRequest(requestProps);
    }

    // For GraphQL and ws, handle throttling logic without setting headers
    let tracker = 'unknown';
    if (contextType === 'ws') {
      const client = context.switchToWs().getClient();
      if (client && typeof client._socket?.remoteAddress === 'string') {
        tracker = client._socket.remoteAddress;
      }
    } else if (contextType === 'graphql') {
      const gqlContext = GqlExecutionContext.create(context).getContext();
      tracker =
        gqlContext.req?.ip ||
        gqlContext.req?.headers?.['x-forwarded-for'] ||
        gqlContext.req?.connection?.remoteAddress ||
        'unknown';
      tracker = String(tracker);
    }
    const throttlerName = typeof throttler.name === 'string' ? throttler.name : 'default';
    const key = generateKey(context, tracker, throttlerName);
    const { totalHits, timeToExpire, isBlocked, timeToBlockExpire } = await this.storageService.increment(
      key,
      ttl,
      limit,
      blockDuration,
      throttlerName,
    );
    if (isBlocked) {
      await this.throwThrottlingException(context, {
        limit,
        ttl,
        key,
        tracker,
        totalHits,
        timeToExpire,
        isBlocked,
        timeToBlockExpire,
      });
    }
    return true;
  }
}
