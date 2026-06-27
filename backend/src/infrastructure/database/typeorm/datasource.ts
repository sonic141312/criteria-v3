import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';

import { Organization } from './entities/organization.entity';
import { Schema } from './entities/schema.entity';
import { Field } from './entities/field.entity';
import { Evaluation } from './entities/evaluation.entity';
import { EvaluationVersion } from './entities/evaluation-version.entity';
import { Node } from './entities/node.entity';
import { Edge } from './entities/edge.entity';
import { Execution } from './entities/execution.entity';
import { ExecutionNodeResult } from './entities/execution-node-result.entity';

/**
 * Application DataSource.
 *
 * synchronize is ALWAYS false — schema changes go through migrations.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env['DATABASE_URL'] ?? '',
  entities: [
    Organization,
    Schema,
    Field,
    Evaluation,
    EvaluationVersion,
    Node,
    Edge,
    Execution,
    ExecutionNodeResult,
  ],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  synchronize: false,
  logging: process.env['NODE_ENV'] === 'development' ? (['error', 'warn', 'migration'] as const) : (['error'] as const),
  extra: { application_name: 'criteria-system-v3' },
});
