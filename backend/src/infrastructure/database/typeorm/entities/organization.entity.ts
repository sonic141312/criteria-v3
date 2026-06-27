import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  Index,
} from 'typeorm';

import { Schema } from './schema.entity';
import { Evaluation } from './evaluation.entity';
import { Execution } from './execution.entity';

/**
 * Tenant boundary. Every other entity either belongs to an Organization
 * directly or is reachable through an aggregate root.
 */
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
