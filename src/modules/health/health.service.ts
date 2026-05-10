import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  getHealth() {
    return {
      data: {
        name: 'be-keuangan',
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
      error: null,
      meta: {},
    };
  }
}
