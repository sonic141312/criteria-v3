import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';

import { EvaluationVersion } from './evaluation-version.entity';
import { Edge } from './edge.entity';
import { ExecutionNodeResult } from './execution-node-result.entity';

@Entity({ name: 'nodes' })
export class Node {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'evaluation_version_id', type: 'uuid' })
  evaluationVersionId!: string;

  @Column({ name: 'node_type' })
  nodeType!: string;

  @Column()
  label!: string;

  @Column({ type: 'jsonb' })
  config!: Record<string, unknown>;

  @Column({ name: 'position_x', type: 'double precision' })
  positionX!: number;

  @Column({ name: 'position_y', type: 'double precision' })
  positionY!: number;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt!: Date;

  @ManyToOne(() => EvaluationVersion, (v) => v.nodes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'evaluation_version_id' })
  version!: EvaluationVersion;

  @OneToMany(() => Edge, (e) => e.fromNode)
  outgoingEdges!: Edge[];

  @OneToMany(() => Edge, (e) => e.toNode)
  incomingEdges!: Edge[];

  @OneToMany(() => ExecutionNodeResult, (r) => r.node)
  nodeResults!: ExecutionNodeResult[];
}
