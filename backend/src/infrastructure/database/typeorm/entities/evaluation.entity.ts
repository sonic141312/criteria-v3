import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  DeleteDateColumn,
} from 'typeorm';

import { Organization } from './organization.entity';
import { Schema } from './schema.entity';
import { EvaluationVersion } from './evaluation-version.entity';

@Entity({ name: 'evaluations' })
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
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @ManyToOne(() => Schema, (s) => s.evaluations, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'schema_id' })
  schema!: Schema;

  @OneToMany(() => EvaluationVersion, (v) => v.evaluation)
  versions!: EvaluationVersion[];
}
