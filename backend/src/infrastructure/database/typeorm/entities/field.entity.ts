import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';

import { Schema } from './schema.entity';

@Entity({ name: 'fields' })
@Unique(['schemaId', 'key'])
export class Field {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'schema_id', type: 'uuid' })
  schemaId!: string;

  @Column()
  key!: string;

  @Column({ name: 'display_name' })
  displayName!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'data_type' })
  dataType!: string;

  @Column({ type: 'jsonb', nullable: true })
  validation!: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt!: Date;

  @ManyToOne(() => Schema, (s) => s.fields, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schema_id' })
  schema!: Schema;
}
