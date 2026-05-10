import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { AuthenticatedRequest } from './access-token.guard';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
