import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { Execution } from './execution.entity';
import { Node } from './node.entity';

@Entity({ name: 'execution_node_results' })
export class ExecutionNodeResult {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'execution_id', type: 'uuid' })
  executionId!: string;

  @Column({ name: 'node_id', type: 'uuid' })
  nodeId!: string;

  @Column()
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
  @JoinColumn({ name: 'execution_id' })
  execution!: Execution;

  @ManyToOne(() => Node, (n) => n.nodeResults, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'node_id' })
  node!: Node;
}
