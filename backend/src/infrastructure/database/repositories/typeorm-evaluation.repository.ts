import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Repository } from 'typeorm';
import { Evaluation } from '@infrastructure/database/typeorm/entities/evaluation.entity';
import { OrganizationId, EvaluationId, SchemaId } from '@shared/types';

@Injectable()
export class TypeormEvaluationRepository {
  constructor(@InjectRepository(Evaluation) private readonly repo: Repository<Evaluation>) {}

  private client(em?: EntityManager) {
    return em ? em.getRepository(Evaluation) : this.repo;
  }

  async findById(orgId: OrganizationId, id: EvaluationId, em?: EntityManager): Promise<Evaluation | null> {
    return this.client(em).findOne({ where: { id, organizationId: orgId, deletedAt: IsNull() } });
  }

  async listBySchema(orgId: OrganizationId, schemaId: SchemaId, em?: EntityManager): Promise<Evaluation[]> {
    return this.client(em).find({
      where: { organizationId: orgId, schemaId, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  async create(
    orgId: OrganizationId,
    data: { schemaId: SchemaId; name: string; description?: string | null },
    em: EntityManager,
  ): Promise<Evaluation> {
    const repo = this.client(em);
    const ev = repo.create({
      organizationId: orgId,
      schemaId: data.schemaId,
      name: data.name,
      description: data.description ?? null,
    });
    return repo.save(ev);
  }

  async update(
    orgId: OrganizationId,
    id: EvaluationId,
    data: { name?: string; description?: string | null },
    em: EntityManager,
  ): Promise<void> {
    await this.client(em).update({ id, organizationId: orgId }, data);
  }

  async softDelete(orgId: OrganizationId, id: EvaluationId, em: EntityManager): Promise<void> {
    await this.client(em).update({ id, organizationId: orgId }, { deletedAt: new Date() });
  }
}
