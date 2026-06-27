import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Repository } from 'typeorm';
import { Schema } from '@infrastructure/database/typeorm/entities/schema.entity';
import { OrganizationId, SchemaId } from '@shared/types';

@Injectable()
export class TypeormSchemaRepository {
  constructor(@InjectRepository(Schema) private readonly repo: Repository<Schema>) {}

  private client(em?: EntityManager) {
    return em ? em.getRepository(Schema) : this.repo;
  }

  async findById(orgId: OrganizationId, id: SchemaId, em?: EntityManager): Promise<Schema | null> {
    return this.client(em).findOne({ where: { id, organizationId: orgId, deletedAt: IsNull() } });
  }

  async list(orgId: OrganizationId, em?: EntityManager): Promise<Schema[]> {
    return this.client(em).find({
      where: { organizationId: orgId, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  async create(
    orgId: OrganizationId,
    data: { name: string; description?: string | null },
    em: EntityManager,
  ): Promise<Schema> {
    const repo = this.client(em);
    const schema = repo.create({ organizationId: orgId, name: data.name, description: data.description ?? null });
    return repo.save(schema);
  }

  async update(
    orgId: OrganizationId,
    id: SchemaId,
    data: { name?: string; description?: string | null },
    em: EntityManager,
  ): Promise<void> {
    await this.client(em).update({ id, organizationId: orgId }, data);
  }

  async softDelete(orgId: OrganizationId, id: SchemaId, em: EntityManager): Promise<void> {
    await this.client(em).update({ id, organizationId: orgId }, { deletedAt: new Date() });
  }
}
