import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository, IsNull } from 'typeorm';
import { Schema } from '../../../infrastructure/database/typeorm/entities/schema.entity';
import { Field } from '../../../infrastructure/database/typeorm/entities/field.entity';
import { OrganizationId, SchemaId } from '../../../shared/types';
import { CreateSchemaDto, UpdateSchemaDto } from '../dto/schema.dto';

const notDeleted = { deletedAt: IsNull() };

@Injectable()
export class SchemaUseCases {
  constructor(
    @InjectRepository(Schema) private readonly schemaRepo: Repository<Schema>,
    @InjectRepository(Field) private readonly fieldRepo: Repository<Field>,
  ) {}

  async list(orgId: OrganizationId): Promise<unknown[]> {
    const schemas = await this.schemaRepo.find({
      where: { organizationId: orgId, ...notDeleted },
      order: { createdAt: 'DESC' },
    });
    return schemas.map((s) => this.toResponse(s));
  }

  async findById(orgId: OrganizationId, id: SchemaId): Promise<unknown> {
    const schema = await this.schemaRepo.findOne({
      where: { id, organizationId: orgId, ...notDeleted },
    });
    if (!schema) throw new NotFoundException(`Schema ${id} not found`);
    return this.toResponse(schema);
  }

  async create(orgId: OrganizationId, dto: CreateSchemaDto, em: EntityManager): Promise<unknown> {
    const schema = em.getRepository(Schema).create({
      organizationId: orgId,
      name: dto.name,
      description: dto.description ?? null,
    });
    const saved = await em.getRepository(Schema).save(schema);
    return this.toResponse(saved);
  }

  async update(orgId: OrganizationId, id: SchemaId, dto: UpdateSchemaDto, em: EntityManager): Promise<void> {
    const existing = await this.schemaRepo.findOne({
      where: { id, organizationId: orgId, ...notDeleted },
    });
    if (!existing) throw new NotFoundException(`Schema ${id} not found`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await em.getRepository(Schema).update({ id }, dto as any);
  }

  async delete(orgId: OrganizationId, id: SchemaId, em: EntityManager): Promise<void> {
    const existing = await this.schemaRepo.findOne({
      where: { id, organizationId: orgId, ...notDeleted },
    });
    if (!existing) throw new NotFoundException(`Schema ${id} not found`);
    await em.getRepository(Schema).update({ id }, { deletedAt: new Date() });
  }

  async listFields(orgId: OrganizationId, schemaId: SchemaId): Promise<unknown[]> {
    const schema = await this.schemaRepo.findOne({
      where: { id: schemaId, organizationId: orgId, ...notDeleted },
    });
    if (!schema) throw new NotFoundException(`Schema ${schemaId} not found`);

    const fields = await this.fieldRepo.find({ where: { schemaId }, order: { createdAt: 'ASC' } });
    return fields.map((f) => this.fieldToResponse(f));
  }

  async createField(
    orgId: OrganizationId,
    schemaId: SchemaId,
    dto: { key: string; displayName: string; dataType: string; description?: string; validation?: Record<string, unknown>; metadata?: Record<string, unknown> },
    em: EntityManager,
  ): Promise<unknown> {
    const schema = await this.schemaRepo.findOne({
      where: { id: schemaId, organizationId: orgId, ...notDeleted },
    });
    if (!schema) throw new NotFoundException(`Schema ${schemaId} not found`);

    const field = em.getRepository(Field).create({
      schemaId,
      key: dto.key,
      displayName: dto.displayName,
      dataType: dto.dataType,
      description: dto.description ?? null,
      validation: dto.validation ?? null,
      metadata: dto.metadata ?? null,
    });
    const saved = await em.getRepository(Field).save(field);
    return this.fieldToResponse(saved);
  }

  async deleteField(orgId: OrganizationId, schemaId: SchemaId, fieldId: string, em: EntityManager): Promise<void> {
    const schema = await this.schemaRepo.findOne({
      where: { id: schemaId, organizationId: orgId, ...notDeleted },
    });
    if (!schema) throw new NotFoundException(`Schema ${schemaId} not found`);

    await em.getRepository(Field).delete({ id: fieldId, schemaId });
  }

  private toResponse(s: Schema) {
    return {
      id: s.id,
      organizationId: s.organizationId,
      name: s.name,
      description: s.description,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    };
  }

  private fieldToResponse(f: Field) {
    return {
      id: f.id,
      schemaId: f.schemaId,
      key: f.key,
      displayName: f.displayName,
      description: f.description,
      dataType: f.dataType,
      validation: f.validation,
      metadata: f.metadata,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    };
  }
}
