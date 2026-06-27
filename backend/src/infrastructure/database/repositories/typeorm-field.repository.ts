import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Field } from '@infrastructure/database/typeorm/entities/field.entity';
import { SchemaId, FieldId } from '@shared/types';

@Injectable()
export class TypeormFieldRepository {
  constructor(@InjectRepository(Field) private readonly repo: Repository<Field>) {}

  private client(em?: EntityManager) {
    return em ? em.getRepository(Field) : this.repo;
  }

  async findById(id: FieldId, em?: EntityManager): Promise<Field | null> {
    return this.client(em).findOne({ where: { id } });
  }

  async findBySchema(schemaId: SchemaId, em?: EntityManager): Promise<Field[]> {
    return this.client(em).find({ where: { schemaId }, order: { createdAt: 'ASC' } });
  }

  async findByKey(schemaId: SchemaId, key: string, em?: EntityManager): Promise<Field | null> {
    return this.client(em).findOne({ where: { schemaId, key } });
  }

  async create(
    schemaId: SchemaId,
    data: {
      key: string;
      displayName: string;
      dataType: string;
      description?: string | null;
      validation?: Record<string, unknown> | null;
      metadata?: Record<string, unknown> | null;
    },
    em: EntityManager,
  ): Promise<Field> {
    const repo = this.client(em);
    const field = repo.create({
      schemaId,
      key: data.key,
      displayName: data.displayName,
      dataType: data.dataType,
      description: data.description ?? null,
      validation: data.validation ?? null,
      metadata: data.metadata ?? null,
    });
    return repo.save(field);
  }

  async update(id: FieldId, data: Partial<Field>, em: EntityManager): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.client(em).update({ id }, data as any);
  }

  async delete(id: FieldId, em: EntityManager): Promise<void> {
    await this.client(em).delete({ id });
  }
}
