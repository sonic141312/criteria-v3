# TypeORM Entities & Migration Plan

> The full TypeORM entity definitions for criteria-system-v3, with rationale per table.
> These are the Phase 0 spec — actual code is written in Phase 1 (DB) and Phase 2 (entities).

---

## File Layout

```
src/infrastructure/database/typeorm/
  datasource.ts                                 # DataSource configuration
  entities/
    organization.entity.ts
    schema.entity.ts
    field.entity.ts
    evaluation.entity.ts
    evaluation-version.entity.ts
    node.entity.ts
    edge.entity.ts
    execution.entity.ts
    execution-node-result.entity.ts
  migrations/
    1700000000000-InitialSchema.ts              # generated from entities
  seeds/
    tiktok-creator.seed.ts                      # idempotent seed for reference use case
```

---

## Datasource Configuration

```typescript
// src/infrastructure/database/typeorm/datasource.ts
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

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [
    Organization, Schema, Field, Evaluation, EvaluationVersion,
    Node, Edge, Execution, ExecutionNodeResult,
  ],
  migrations: ['src/infrastructure/database/typeorm/migrations/*.ts'],
  synchronize: false,                                  // ALWAYS false — use migrations
  logging: process.env.NODE_ENV === 'development' ? ['error', 'warn', 'migration'] : ['error'],
  extra: { application_name: 'criteria-system-v3' },
});
```

---

## Entity: Organization

```typescript
// src/infrastructure/database/typeorm/entities/organization.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column, OneToMany, Index,
} from 'typeorm';
import { Schema } from './schema.entity';
import { Evaluation } from './evaluation.entity';
import { Execution } from './execution.entity';

@Entity({ name: 'organizations' })
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Index()
  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt!: Date;

  @OneToMany(() => Schema, (s) => s.organization)
  schemas!: Schema[];

  @OneToMany(() => Evaluation, (e) => e.organization)
  evaluations!: Evaluation[];

  @OneToMany(() => Execution, (x) => x.organization)
  executions!: Execution[];
}
```

---

## Entity: Schema

```typescript
// src/infrastructure/database/typeorm/entities/schema.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany,
  Index, DeleteDateColumn,
} from 'typeorm';
import { Organization } from './organization.entity';
import { Field } from './field.entity';
import { Evaluation } from './evaluation.entity';

@Entity({ name: 'schemas' })
@Index(['organizationId'])
@Index(['organizationId', 'deletedAt'])
export class Schema {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column()
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  @ManyToOne(() => Organization, (o) => o.schemas, { onDelete: 'RESTRICT' })
  organization!: Organization;

  @OneToMany(() => Field, (f) => f.schema, { cascade: true })
  fields!: Field[];

  @OneToMany(() => Evaluation, (e) => e.schema)
  evaluations!: Evaluation[];
}
```

---

## Entity: Field

```typescript
// src/infrastructure/database/typeorm/entities/field.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index, Unique,
} from 'typeorm';
import { Schema } from './schema.entity';

@Entity({ name: 'fields' })
@Unique(['schemaId', 'key'])
@Index(['schemaId'])
export class Field {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'schema_id', type: 'uuid' })
  schemaId!: string;

  @Column()
  key!: string;                                       // machine-readable, e.g. 'engagement_rate'

  @Column({ name: 'display_name' })
  displayName!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'data_type' })
  dataType!: string;                                  // union: number|string|boolean|datetime|percentage|array|object

  @Column({ type: 'jsonb', nullable: true })
  validation!: Record<string, unknown> | null;        // { min, max, regex, required }

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;          // { unit, tags }

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt!: Date;

  @ManyToOne(() => Schema, (s) => s.fields, { onDelete: 'CASCADE' })
  schema!: Schema;
}
```

---

## Entity: Evaluation

```typescript
// src/infrastructure/database/typeorm/entities/evaluation.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany,
  Index, DeleteDateColumn,
} from 'typeorm';
import { Organization } from './organization.entity';
import { Schema } from './schema.entity';
import { EvaluationVersion } from './evaluation-version.entity';

@Entity({ name: 'evaluations' })
@Index(['organizationId'])
@Index(['organizationId', 'deletedAt'])
@Index(['schemaId'])
export class Evaluation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'schema_id', type: 'uuid' })
  schemaId!: string;

  @Column()
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  @ManyToOne(() => Organization, (o) => o.evaluations, { onDelete: 'RESTRICT' })
  organization!: Organization;

  @ManyToOne(() => Schema, (s) => s.evaluations, { onDelete: 'RESTRICT' })
  schema!: Schema;

  @OneToMany(() => EvaluationVersion, (v) => v.evaluation)
  versions!: EvaluationVersion[];
}
```

---

## Entity: EvaluationVersion

```typescript
// src/infrastructure/database/typeorm/entities/evaluation-version.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany,
  Index, Unique, DeleteDateColumn,
} from 'typeorm';
import { Evaluation } from './evaluation.entity';
import { Node } from './node.entity';
import { Edge } from './edge.entity';
import { Execution } from './execution.entity';

@Entity({ name: 'evaluation_versions' })
@Unique(['evaluationId', 'versionNumber'])
@Index(['evaluationId'])
@Index(['evaluationId', 'status'])
export class EvaluationVersion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'evaluation_id', type: 'uuid' })
  evaluationId!: string;

  @Column({ name: 'version_number', type: 'int' })
  versionNumber!: number;

  @Column()                                              // DRAFT | PUBLISHED | ARCHIVED
  status!: string;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  @ManyToOne(() => Evaluation, (e) => e.versions, { onDelete: 'CASCADE' })
  evaluation!: Evaluation;

  @OneToMany(() => Node, (n) => n.version)
  nodes!: Node[];

  @OneToMany(() => Edge, (e) => e.version)
  edges!: Edge[];

  @OneToMany(() => Execution, (x) => x.version)
  executions!: Execution[];
}
```

---

## Entity: Node

```typescript
// src/infrastructure/database/typeorm/entities/node.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, Index,
} from 'typeorm';
import { EvaluationVersion } from './evaluation-version.entity';
import { Edge } from './edge.entity';
import { ExecutionNodeResult } from './execution-node-result.entity';

@Entity({ name: 'nodes' })
@Index(['evaluationVersionId'])
export class Node {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'evaluation_version_id', type: 'uuid' })
  evaluationVersionId!: string;

  @Column({ name: 'node_type' })
  nodeType!: string;                                    // e.g. 'weighted_average'

  @Column()
  label!: string;

  @Column({ type: 'jsonb' })
  config!: Record<string, unknown>;                    // validated by NodeDefinition.configSchema at app layer

  @Column({ name: 'position_x', type: 'double precision' })
  positionX!: number;

  @Column({ name: 'position_y', type: 'double precision' })
  positionY!: number;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt!: Date;

  @ManyToOne(() => EvaluationVersion, (v) => v.nodes, { onDelete: 'CASCADE' })
  version!: EvaluationVersion;

  @OneToMany(() => Edge, (e) => e.fromNode)
  outgoingEdges!: Edge[];

  @OneToMany(() => Edge, (e) => e.toNode)
  incomingEdges!: Edge[];

  @OneToMany(() => ExecutionNodeResult, (r) => r.node)
  nodeResults!: ExecutionNodeResult[];
}
```

---

## Entity: Edge

```typescript
// src/infrastructure/database/typeorm/entities/edge.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index,
} from 'typeorm';
import { EvaluationVersion } from './evaluation-version.entity';
import { Node } from './node.entity';

@Entity({ name: 'edges' })
@Index(['evaluationVersionId'])
@Index(['fromNodeId'])
@Index(['toNodeId'])
export class Edge {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'evaluation_version_id', type: 'uuid' })
  evaluationVersionId!: string;

  @Column({ name: 'from_node_id', type: 'uuid' })
  fromNodeId!: string;

  @Column({ name: 'from_port' })
  fromPort!: string;

  @Column({ name: 'to_node_id', type: 'uuid' })
  toNodeId!: string;

  @Column({ name: 'to_port' })
  toPort!: string;

  @Column({ name: 'execution_order', type: 'int' })
  executionOrder!: number;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date;

  @ManyToOne(() => EvaluationVersion, (v) => v.edges, { onDelete: 'CASCADE' })
  version!: EvaluationVersion;

  @ManyToOne(() => Node, (n) => n.outgoingEdges, { onDelete: 'CASCADE' })
  fromNode!: Node;

  @ManyToOne(() => Node, (n) => n.incomingEdges, { onDelete: 'CASCADE' })
  toNode!: Node;
}
```

---

## Entity: Execution

```typescript
// src/infrastructure/database/typeorm/entities/execution.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, Index,
} from 'typeorm';
import { Organization } from './organization.entity';
import { EvaluationVersion } from './evaluation-version.entity';
import { ExecutionNodeResult } from './execution-node-result.entity';

@Entity({ name: 'executions' })
@Index(['organizationId'])
@Index(['evaluationVersionId'])
@Index(['organizationId', 'status'])
export class Execution {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;                              // denormalized — see ERD rationale

  @Column({ name: 'evaluation_version_id', type: 'uuid' })
  evaluationVersionId!: string;

  @Column()                                              // PENDING | RUNNING | SUCCESS | PARTIAL | FAILED
  status!: string;

  @Column({ name: 'input_values', type: 'jsonb' })
  inputValues!: Record<string, unknown>;

  @Column({ name: 'final_result', type: 'jsonb', nullable: true })
  finalResult!: Record<string, unknown> | null;

  @Column({ name: 'started_at', type: 'timestamptz', default: () => 'NOW()' })
  startedAt!: Date;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt!: Date | null;

  @ManyToOne(() => Organization, (o) => o.executions, { onDelete: 'RESTRICT' })
  organization!: Organization;

  @ManyToOne(() => EvaluationVersion, (v) => v.executions, { onDelete: 'RESTRICT' })
  version!: EvaluationVersion;

  @OneToMany(() => ExecutionNodeResult, (r) => r.execution)
  nodeResults!: ExecutionNodeResult[];
}
```

---

## Entity: ExecutionNodeResult

```typescript
// src/infrastructure/database/typeorm/entities/execution-node-result.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index,
} from 'typeorm';
import { Execution } from './execution.entity';
import { Node } from './node.entity';

@Entity({ name: 'execution_node_results' })
@Index(['executionId'])
@Index(['nodeId', 'status'])
@Index(['nodeId'])
export class ExecutionNodeResult {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'execution_id', type: 'uuid' })
  executionId!: string;

  @Column({ name: 'node_id', type: 'uuid' })
  nodeId!: string;

  @Column()                                              // SUCCESS | ERROR | SKIPPED
  status!: string;

  @Column({ type: 'jsonb', nullable: true })
  value!: Record<string, unknown> | null;

  @Column({ name: 'inputs_received', type: 'jsonb', nullable: true })
  inputsReceived!: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  explanation!: string | null;

  @Column({ type: 'text', array: true, default: () => "ARRAY[]::text[]" })
  warnings!: string[];

  @Column({ type: 'text', nullable: true })
  error!: string | null;

  @Column({ name: 'duration_ms', type: 'int', nullable: true })
  durationMs!: number | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date;

  @ManyToOne(() => Execution, (x) => x.nodeResults, { onDelete: 'CASCADE' })
  execution!: Execution;

  @ManyToOne(() => Node, (n) => n.nodeResults, { onDelete: 'RESTRICT' })
  node!: Node;
}
```

---

## Migration Strategy

### Migration 001 — Initial Schema

Generated by `typeorm migration:generate` from the entities above. Order matters:

1. `organizations`
2. `schemas`
3. `fields`
4. `evaluations`
5. `evaluation_versions`
6. `nodes`
7. `edges`
8. `executions`
9. `execution_node_results`

Each table is created in dependency order so FKs always reference existing tables.

### Migration 002 — Seed Data

A separate TypeORM migration that uses `INSERT ... ON CONFLICT DO NOTHING` for idempotency. Runs the TikTok Creator reference use case:

```typescript
// src/infrastructure/database/typeorm/migrations/1700000010000-SeedTiktokCreator.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedTiktokCreator1700000010000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Idempotent seed via ON CONFLICT (key) DO NOTHING.
    // Fixed UUIDs for stable test fixtures.
    const orgId = '00000000-0000-0000-0000-000000000001';
    const schemaId = '00000000-0000-0000-0000-000000000010';
    const evaluationId = '00000000-0000-0000-0000-000000000020';
    const versionId = '00000000-0000-0000-0000-000000000021';

    await queryRunner.query(`
      INSERT INTO organizations (id, name)
      VALUES ($1, 'Acme Creators')
      ON CONFLICT (id) DO NOTHING;
    `, [orgId]);

    // ... schemas, fields, evaluation, version, nodes, edges
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No-op: seed data is meant to be re-runnable.
  }
}
```

Run order:

```bash
pnpm run migration:run     # applies 001 + 002
pnpm run seed              # alias for migration:run in dev
```

---

## NestJS Module Wiring

```typescript
// src/infrastructure/database/typeorm/typeorm.module.ts
import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppDataSource } from './datasource';

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
```

---

## Repository Pattern (preview)

All tenant-scoped repos follow this signature. The full code is in Phase 2+; this is the contract.

```typescript
// src/infrastructure/database/repositories/typeorm-schema.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Repository } from 'typeorm';
import { Schema } from '../typeorm/entities/schema.entity';
import { OrganizationId } from '@shared/types/branded-id';

@Injectable()
export class TypeormSchemaRepository {
  constructor(@InjectRepository(Schema) private readonly repo: Repository<Schema>) {}

  private client(em?: EntityManager) {
    return em ? em.getRepository(Schema) : this.repo;
  }

  async findById(orgId: OrganizationId, id: string, em?: EntityManager): Promise<Schema | null> {
    return this.client(em).findOne({ where: { id, organizationId: orgId, deletedAt: IsNull() } });
  }

  async list(orgId: OrganizationId, em?: EntityManager): Promise<Schema[]> {
    return this.client(em).find({
      where: { organizationId: orgId, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  async softDelete(orgId: OrganizationId, id: string, em: EntityManager): Promise<void> {
    await this.client(em).update({ id, organizationId: orgId }, { deletedAt: new Date() });
  }
}
```

Key invariants:
- Every method takes `organizationId` as first argument.
- Every method includes `organizationId` in its `where`.
- Mutation methods accept a required `EntityManager` (no implicit transactions).
- Soft-delete is explicit and uses `@DeleteDateColumn`.

---

## Verification Plan (Phase 1)

After migration + seed:

```sql
-- 1. Confirm 9 tables exist
\dt

-- 2. Confirm seed counts
SELECT COUNT(*) FROM organizations;        -- expect 1
SELECT COUNT(*) FROM fields;               -- expect 4
SELECT COUNT(*) FROM nodes WHERE evaluation_version_id = $1;  -- expect 7
SELECT COUNT(*) FROM edges WHERE evaluation_version_id = $1;  -- expect 7

-- 3. Confirm indexes
\d+ schemas
\d+ evaluation_versions

-- 4. Confirm FKs
SELECT conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint
WHERE contype = 'f'
ORDER BY conname;

-- 5. Confirm unique constraints
SELECT conname FROM pg_constraint WHERE contype = 'u';
```

If any check fails, the migration is rejected; do not proceed to Phase 2.

---

## What's NOT in v1

- ❌ No partitioning on `executions` (purge via retention is out of scope per the doc).
- ❌ No partial indexes (over-engineering for v1).
- ❌ No CHECK constraints on enum-like status columns. Application-layer + repository-level enforcement is sufficient. Could be added in v2 via Postgres enums.
- ❌ No `users` table (RBAC is out of scope).
- ❌ No audit log table (audit is implemented as subscribers on domain events).
