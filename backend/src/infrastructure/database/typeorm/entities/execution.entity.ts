import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';

import { Organization } from './organization.entity';
import { EvaluationVersion } from './evaluation-version.entity';
import { ExecutionNodeResult } from './execution-node-result.entity';

@Entity({ name: 'executions' })
export class Execution {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'evaluation_version_id', type: 'uuid' })
  evaluationVersionId!: string;

  @Column()
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
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @ManyToOne(() => EvaluationVersion, (v) => v.executions, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'evaluation_version_id' })
  version!: EvaluationVersion;

  @OneToMany(() => ExecutionNodeResult, (r) => r.execution)
  nodeResults!: ExecutionNodeResult[];
}
