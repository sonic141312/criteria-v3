import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { EvaluationVersion } from './evaluation-version.entity';
import { Node } from './node.entity';

@Entity({ name: 'edges' })
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
  @JoinColumn({ name: 'evaluation_version_id' })
  version!: EvaluationVersion;

  @ManyToOne(() => Node, (n) => n.outgoingEdges, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'from_node_id' })
  fromNode!: Node;

  @ManyToOne(() => Node, (n) => n.incomingEdges, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'to_node_id' })
  toNode!: Node;
}
