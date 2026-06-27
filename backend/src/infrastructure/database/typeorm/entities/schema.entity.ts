import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  Index,
  JoinColumn,
  DeleteDateColumn,
} from 'typeorm';

import { Organization } from './organization.entity';
import { Field } from './field.entity';
import { Evaluation } from './evaluation.entity';

/**
 * Defines the structure of input data for one domain (e.g. "TikTok Creator").
 * Aggregate root that owns Fields. Soft-deletable.
 */
@Entity({ name: 'schemas' })
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
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @OneToMany(() => Field, (f) => f.schema)
  fields!: Field[];

  @OneToMany(() => Evaluation, (e) => e.schema)
  evaluations!: Evaluation[];
}
