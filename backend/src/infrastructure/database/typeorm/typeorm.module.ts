import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppDataSource } from './datasource';

/**
 * Global TypeORM module. Imports entities via AppDataSource so all repositories
 * are available application-wide without re-importing.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        ...AppDataSource.options,
        autoLoadEntities: true,
      }),
    }),
  ],
})
export class TypeOrmDatabaseModule {}
