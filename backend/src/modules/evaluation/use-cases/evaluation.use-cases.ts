import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EntityManager, IsNull } from 'typeorm';
import { Evaluation } from '../../../infrastructure/database/typeorm/entities/evaluation.entity';
import { EvaluationVersion } from '../../../infrastructure/database/typeorm/entities/evaluation-version.entity';
import { Schema } from '../../../infrastructure/database/typeorm/entities/schema.entity';
import { Node } from '../../../infrastructure/database/typeorm/entities/node.entity';
import { Edge } from '../../../infrastructure/database/typeorm/entities/edge.entity';
import { Execution } from '../../../infrastructure/database/typeorm/entities/execution.entity';
import { OrganizationId, EvaluationId, EvaluationVersionId } from '../../../shared/types';
import { CreateEvaluationDto, UpdateEvaluationDto } from '../dto/evaluation.dto';

/** Helper: soft-delete filter for find queries */
const notDeleted = { deletedAt: IsNull() };

@Injectable()
export class EvaluationUseCases {
  async list(orgId: OrganizationId, em: EntityManager): Promise<unknown[]> {
    const evals = await em.getRepository(Evaluation).find({
      where: { organizationId: orgId, ...notDeleted },
      order: { createdAt: 'DESC' },
      relations: ['schema'],
    });
    return evals.map(e => this.toResponse(e));
  }

  async findById(orgId: OrganizationId, id: EvaluationId, em: EntityManager): Promise<unknown> {
    const evaluation = await em.getRepository(Evaluation).findOne({
      where: { id, organizationId: orgId, ...notDeleted },
      relations: ['schema'],
    });
    if (!evaluation) throw new NotFoundException(`Evaluation ${id} not found`);
    return this.toResponse(evaluation);
  }

  async create(orgId: OrganizationId, dto: CreateEvaluationDto, em: EntityManager): Promise<unknown> {
    const schema = await em.getRepository(Schema).findOne({
      where: { id: dto.schemaId, organizationId: orgId, ...notDeleted },
    });
    if (!schema) throw new NotFoundException(`Schema ${dto.schemaId} not found`);

    const evaluation = em.getRepository(Evaluation).create({
      organizationId: orgId,
      schemaId: dto.schemaId,
      name: dto.name,
      description: dto.description ?? null,
    });
    const saved = await em.getRepository(Evaluation).save(evaluation);

    const version = em.getRepository(EvaluationVersion).create({
      evaluationId: saved.id,
      versionNumber: 1,
      status: 'DRAFT',
    });
    await em.getRepository(EvaluationVersion).save(version);

    return this.toResponse(saved);
  }

  async update(
    orgId: OrganizationId,
    id: EvaluationId,
    dto: UpdateEvaluationDto,
    em: EntityManager,
  ): Promise<void> {
    const existing = await em.getRepository(Evaluation).findOne({
      where: { id, organizationId: orgId, ...notDeleted },
    });
    if (!existing) throw new NotFoundException(`Evaluation ${id} not found`);
    const updates: Record<string, unknown> = {};
    if (dto.name !== undefined) updates['name'] = dto.name;
    if (dto.description !== undefined) updates['description'] = dto.description;
    if (Object.keys(updates).length > 0) {
      await em.getRepository(Evaluation).update({ id }, updates);
    }
  }

  async softDelete(orgId: OrganizationId, id: EvaluationId, em: EntityManager): Promise<void> {
    const existing = await em.getRepository(Evaluation).findOne({
      where: { id, organizationId: orgId, ...notDeleted },
    });
    if (!existing) throw new NotFoundException(`Evaluation ${id} not found`);
    await em.getRepository(Evaluation).update({ id }, { deletedAt: new Date() });
  }

  async listVersions(orgId: OrganizationId, evaluationId: EvaluationId, em: EntityManager): Promise<unknown[]> {
    const evaluation = await em.getRepository(Evaluation).findOne({
      where: { id: evaluationId, organizationId: orgId, ...notDeleted },
    });
    if (!evaluation) throw new NotFoundException(`Evaluation ${evaluationId} not found`);

    const versions = await em.getRepository(EvaluationVersion).find({
      where: { evaluationId, ...notDeleted },
      order: { versionNumber: 'DESC' },
    });
    return versions.map(v => this.versionToResponse(v));
  }

  async getVersion(
    orgId: OrganizationId,
    evaluationId: EvaluationId,
    versionId: EvaluationVersionId,
    em: EntityManager,
  ): Promise<unknown> {
    const evaluation = await em.getRepository(Evaluation).findOne({
      where: { id: evaluationId, organizationId: orgId, ...notDeleted },
    });
    if (!evaluation) throw new NotFoundException(`Evaluation ${evaluationId} not found`);

    const version = await em.getRepository(EvaluationVersion).findOne({
      where: { id: versionId, evaluationId, ...notDeleted },
    });
    if (!version) throw new NotFoundException(`Version ${versionId} not found`);

    return this.versionToResponse(version);
  }

  async createVersion(
    orgId: OrganizationId,
    evaluationId: EvaluationId,
    em: EntityManager,
  ): Promise<unknown> {
    const evaluation = await em.getRepository(Evaluation).findOne({
      where: { id: evaluationId, organizationId: orgId, ...notDeleted },
      relations: ['versions'],
    });
    if (!evaluation) throw new NotFoundException(`Evaluation ${evaluationId} not found`);

    const latest = await em.getRepository(EvaluationVersion)
      .createQueryBuilder('v')
      .select('MAX(v.versionNumber)', 'max')
      .where('v.evaluationId = :evaluationId', { evaluationId })
      .getRawOne();
    const nextNumber = (latest?.max ?? 0) + 1;

    const newVersion = em.getRepository(EvaluationVersion).create({
      evaluationId,
      versionNumber: nextNumber,
      status: 'DRAFT',
    });
    const savedVersion = await em.getRepository(EvaluationVersion).save(newVersion);

    // Clone from latest PUBLISHED if exists
    const publishedVersion = await em.getRepository(EvaluationVersion).findOne({
      where: { evaluationId, status: 'PUBLISHED' },
      relations: ['nodes', 'edges'],
    });
    if (publishedVersion) {
      const nodeIdMap = new Map<string, string>();
      for (const node of publishedVersion.nodes) {
        const cloned = em.getRepository(Node).create({
          evaluationVersionId: savedVersion.id,
          nodeType: node.nodeType,
          label: node.label,
          config: node.config,
          positionX: node.positionX,
          positionY: node.positionY,
        });
        const savedNode = await em.getRepository(Node).save(cloned);
        nodeIdMap.set(node.id, savedNode.id);
      }
      for (const edge of publishedVersion.edges) {
        const newFromId = nodeIdMap.get(edge.fromNodeId);
        const newToId = nodeIdMap.get(edge.toNodeId);
        if (newFromId && newToId) {
          const cloned = em.getRepository(Edge).create({
            evaluationVersionId: savedVersion.id,
            fromNodeId: newFromId,
            fromPort: edge.fromPort,
            toNodeId: newToId,
            toPort: edge.toPort,
            executionOrder: edge.executionOrder,
          });
          await em.getRepository(Edge).save(cloned);
        }
      }
    }

    return this.versionToResponse(savedVersion);
  }

  async listExecutionsByEvaluation(
    orgId: OrganizationId,
    evaluationId: EvaluationId,
    em: EntityManager,
  ): Promise<unknown[]> {
    const evaluation = await em.getRepository(Evaluation).findOne({
      where: { id: evaluationId, organizationId: orgId, ...notDeleted },
    });
    if (!evaluation) throw new NotFoundException(`Evaluation ${evaluationId} not found`);

    const versions = await em.getRepository(EvaluationVersion).find({
      where: { evaluationId, ...notDeleted },
      select: ['id'],
    });
    const versionIds = versions.map(v => v.id);

    if (versionIds.length === 0) return [];

    const executions = await em.getRepository(Execution)
      .createQueryBuilder('e')
      .where('e.evaluationVersionId IN (:...versionIds)', { versionIds })
      .andWhere('e.organizationId = :orgId', { orgId })
      .orderBy('e.startedAt', 'DESC')
      .getMany();

    return executions.map(e => this.executionToResponse(e));
  }

  async publish(
    orgId: OrganizationId,
    evaluationId: EvaluationId,
    versionId: EvaluationVersionId,
    em: EntityManager,
  ): Promise<unknown> {
    const version = await em.getRepository(EvaluationVersion)
      .createQueryBuilder('v')
      .innerJoin('v.evaluation', 'e')
      .where('v.id = :versionId', { versionId })
      .andWhere('e.id = :evaluationId', { evaluationId })
      .andWhere('e.organizationId = :orgId', { orgId })
      .andWhere('v.status = :status', { status: 'DRAFT' })
      .getOne();

    if (!version) {
      throw new BadRequestException('Version not found or not in DRAFT status');
    }

    const nodes = await em.getRepository(Node).find({
      where: { evaluationVersionId: versionId },
    });
    if (!nodes.some(n => n.nodeType === 'output')) {
      throw new BadRequestException('Cannot publish a version without an Output node');
    }

    await em.getRepository(EvaluationVersion).update(
      { evaluationId, status: 'PUBLISHED' },
      { status: 'ARCHIVED' },
    );

    await em.getRepository(EvaluationVersion).update(
      { id: versionId },
      { status: 'PUBLISHED', publishedAt: new Date() },
    );

    const updated = await em.getRepository(EvaluationVersion).findOne({ where: { id: versionId } });
    return this.versionToResponse(updated!);
  }

  private toResponse(e: Evaluation) {
    return {
      id: e.id,
      organizationId: e.organizationId,
      schemaId: e.schemaId,
      name: e.name,
      description: e.description,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    };
  }

  private versionToResponse(v: EvaluationVersion) {
    return {
      id: v.id,
      evaluationId: v.evaluationId,
      versionNumber: v.versionNumber,
      status: v.status,
      publishedAt: v.publishedAt?.toISOString() ?? null,
      createdAt: v.createdAt.toISOString(),
    };
  }

  private executionToResponse(e: Execution) {
    return {
      id: e.id,
      organizationId: e.organizationId,
      evaluationVersionId: e.evaluationVersionId,
      status: e.status,
      inputValues: e.inputValues,
      finalResult: e.finalResult,
      startedAt: e.startedAt.toISOString(),
      finishedAt: e.finishedAt?.toISOString() ?? null,
    };
  }
}
