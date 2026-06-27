import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Execution } from '@infrastructure/database/typeorm/entities/execution.entity';
import { ExecutionNodeResult } from '@infrastructure/database/typeorm/entities/execution-node-result.entity';
import { OrganizationId, EvaluationVersionId, ExecutionId } from '@shared/types';

@Injectable()
export class TypeormExecutionRepository {
  constructor(
    @InjectRepository(Execution) private readonly execRepo: Repository<Execution>,
    @InjectRepository(ExecutionNodeResult) private readonly resultRepo: Repository<ExecutionNodeResult>,
  ) {}

  private exec(em?: EntityManager) {
    return em ? em.getRepository(Execution) : this.execRepo;
  }

  private result(em?: EntityManager) {
    return em ? em.getRepository(ExecutionNodeResult) : this.resultRepo;
  }

  async findById(id: ExecutionId, em?: EntityManager): Promise<Execution | null> {
    return this.exec(em).findOne({ where: { id } });
  }

  async listByOrg(orgId: OrganizationId, em?: EntityManager): Promise<Execution[]> {
    return this.exec(em).find({
      where: { organizationId: orgId },
      order: { startedAt: 'DESC' },
    });
  }

  async listByVersion(versionId: EvaluationVersionId, em?: EntityManager): Promise<Execution[]> {
    return this.exec(em).find({
      where: { evaluationVersionId: versionId },
      order: { startedAt: 'DESC' },
    });
  }

  async create(
    data: {
      organizationId: OrganizationId;
      evaluationVersionId: EvaluationVersionId;
      inputValues: Record<string, unknown>;
    },
    em: EntityManager,
  ): Promise<Execution> {
    const exec = this.exec(em).create({
      organizationId: data.organizationId,
      evaluationVersionId: data.evaluationVersionId,
      inputValues: data.inputValues,
      status: 'PENDING',
    });
    return this.exec(em).save(exec);
  }

  async update(
    id: ExecutionId,
    data: {
      status?: string;
      finalResult?: Record<string, unknown> | null;
      finishedAt?: Date;
    },
    em: EntityManager,
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.exec(em).update({ id }, data as any);
  }

  async saveResults(
    executionId: ExecutionId,
    results: Array<{
      nodeId: string;
      status: string;
      value: unknown;
      inputsReceived: unknown;
      explanation: string;
      warnings: string[];
      error: string | null;
      durationMs: number;
    }>,
    em: EntityManager,
  ): Promise<void> {
    await this.result(em).insert(
      results.map(r => ({
        executionId,
        nodeId: r.nodeId,
        status: r.status,
        value: r.value ?? null,
        inputsReceived: r.inputsReceived ?? null,
        explanation: r.explanation,
        warnings: r.warnings,
        error: r.error,
        durationMs: r.durationMs,
      })),
    );
  }

  async getResults(executionId: ExecutionId, em?: EntityManager): Promise<ExecutionNodeResult[]> {
    return this.result(em).find({
      where: { executionId },
      order: { createdAt: 'ASC' },
    });
  }
}
