import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Repository } from 'typeorm';
import { EvaluationVersion } from '@infrastructure/database/typeorm/entities/evaluation-version.entity';
import { OrganizationId, EvaluationId, EvaluationVersionId } from '@shared/types';

@Injectable()
export class TypeormEvaluationVersionRepository {
  constructor(@InjectRepository(EvaluationVersion) private readonly repo: Repository<EvaluationVersion>) {}

  private client(em?: EntityManager) {
    return em ? em.getRepository(EvaluationVersion) : this.repo;
  }

  async findById(orgId: OrganizationId, id: EvaluationVersionId, em?: EntityManager): Promise<EvaluationVersion | null> {
    return this.client(em)
      .createQueryBuilder('v')
      .innerJoin('v.evaluation', 'e')
      .where('v.id = :id', { id })
      .andWhere('e.organizationId = :orgId', { orgId })
      .andWhere('v.deletedAt IS NULL')
      .getOne();
  }

  async findPublishedByEvaluation(orgId: OrganizationId, evaluationId: EvaluationId, em?: EntityManager): Promise<EvaluationVersion | null> {
    return this.client(em)
      .createQueryBuilder('v')
      .innerJoin('v.evaluation', 'e')
      .where('e.id = :evaluationId', { evaluationId })
      .andWhere('e.organizationId = :orgId', { orgId })
      .andWhere('v.status = :status', { status: 'PUBLISHED' })
      .andWhere('v.deletedAt IS NULL')
      .getOne();
  }

  async listByEvaluation(evaluationId: EvaluationId, em?: EntityManager): Promise<EvaluationVersion[]> {
    return this.client(em).find({
      where: { evaluationId, deletedAt: IsNull() },
      order: { versionNumber: 'DESC' },
    });
  }

  async getNextVersionNumber(evaluationId: EvaluationId, em: EntityManager): Promise<number> {
    const max = await this.client(em)
      .createQueryBuilder('v')
      .select('MAX(v.versionNumber)', 'max')
      .where('v.evaluationId = :evaluationId', { evaluationId })
      .getRawOne();
    return (max?.max ?? 0) + 1;
  }

  async create(
    evaluationId: EvaluationId,
    data: { versionNumber: number; status: string },
    em: EntityManager,
  ): Promise<EvaluationVersion> {
    const repo = this.client(em);
    const version = repo.create({ evaluationId, ...data });
    return repo.save(version);
  }

  async updateStatus(
    id: EvaluationVersionId,
    status: string,
    em: EntityManager,
    extra?: { publishedAt?: Date },
  ): Promise<void> {
    await this.client(em).update({ id }, { status, ...extra });
  }

  async softDelete(id: EvaluationVersionId, em: EntityManager): Promise<void> {
    await this.client(em).update({ id }, { deletedAt: new Date() });
  }
}
