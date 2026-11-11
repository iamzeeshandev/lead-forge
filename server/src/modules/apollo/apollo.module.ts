import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.schema.js';
import { ApolloClient } from './apollo.client.js';
import { ApolloController } from './apollo.controller.js';
import { ApolloService } from './apollo.service.js';

@Module({
  imports: [
    // Registered here, not globally: only this module's HttpService carries the key.
    HttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        baseURL: config.get('APOLLO_BASE_URL', { infer: true }),
        timeout: config.get('APOLLO_TIMEOUT_MS', { infer: true }),
        headers: {
          'x-api-key': config.get('APOLLO_API_KEY', { infer: true }),
          Accept: 'application/json',
          'Cache-Control': 'no-cache',
        },
        // A redirect would resend x-api-key to wherever it points: on cross-host
        // redirects axios drops only Authorization, Proxy-Authorization and Cookie.
        maxRedirects: 0,
      }),
    }),
  ],
  controllers: [ApolloController],
  providers: [ApolloClient, ApolloService],
  exports: [ApolloService],
})
export class ApolloModule {}
