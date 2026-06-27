import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  DeleteDateColumn,
} from 'typeorm';

import { Evaluation } from './evaluation.entity';
import { Node } from './node.entity';
import { Edge } from './edge.entity';
import { Execution } from './execution.entity';

@Entity({ name: 'evaluation_versions' })
export class EvaluationVersion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'evaluation_id', type: 'uuid' })
  evaluationId!: string;

  @Column({ name: 'version_number', type: 'int' })
  versionNumber!: number;

  @Column()
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
  @JoinColumn({ name: 'evaluation_id' })
  evaluation!: Evaluation;

  @OneToMany(() => Node, (n) => n.version)
  nodes!: Node[];

  @OneToMany(() => Edge, (e) => e.version)
  edges!: Edge[];

  @OneToMany(() => Execution, (x) => x.version)
  executions!: Execution[];
}
