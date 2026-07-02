import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Execution } from '../../../infrastructure/database/typeorm/entities/execution.entity';
import { ExecutionNodeResult as ExecutionNodeResultEntity } from '../../../infrastructure/database/typeorm/entities/execution-node-result.entity';
import { EvaluationVersion } from '../../../infrastructure/database/typeorm/entities/evaluation-version.entity';
import { Node } from '../../../infrastructure/database/typeorm/entities/node.entity';
import { Edge } from '../../../infrastructure/database/typeorm/entities/edge.entity';
import { OrganizationId, ExecutionId } from '../../../shared/types';
import { Executor } from '../../../engine/executor';
import { DagBuilder } from '../../../engine/graph';
import { RunExecutionDto } from '../dto/execution.dto';

/**
 * Runs an evaluation against a PUBLISHED version.
 * Reads the graph, executes it, persists results.
 * Domain events are emitted AFTER the transaction commits (ADR-0003).
 */
@Injectable()
export class ExecutionUseCases {
  constructor(private readonly executor: Executor) {}

  async list(orgId: OrganizationId, em: EntityManager): Promise<unknown[]> {
    const executions = await em.getRepository(Execution).find({
      where: { organizationId: orgId },
      order: { startedAt: 'DESC' },
      take: 100,
    });
    return executions.map(e => this.toResponse(e));
  }

  async run(
    orgId: OrganizationId,
    dto: RunExecutionDto,
    em: EntityManager,
  ): Promise<unknown> {
    const versionId = dto.evaluationVersionId;

    // Load PUBLISHED version and verify org access
    const version = await em.getRepository(EvaluationVersion)
      .createQueryBuilder('v')
      .innerJoin('v.evaluation', 'e')
      .where('v.id = :versionId', { versionId })
      .andWhere('e.organizationId = :orgId', { orgId })
      .andWhere('v.status = :status', { status: 'PUBLISHED' })
      .andWhere('v.deletedAt IS NULL')
      .getOne();

    if (!version) {
      throw new NotFoundException(`Published version ${versionId} not found`);
    }

    // Load graph (nodes + edges)
    const [nodes, edges] = await Promise.all([
      em.getRepository(Node).find({ where: { evaluationVersionId: versionId } }),
      em.getRepository(Edge).find({ where: { evaluationVersionId: versionId } }),
    ]);

    // Build graph — use the executor's private registry via its instance
    const graph = new DagBuilder(this.executor.getRegistry()).build(versionId, nodes, edges);

    // Execute
    const startTime = Date.now();
    const execResult = this.executor.execute(graph, dto.inputValues);

    // Persist execution + node results
    const execution = em.getRepository(Execution).create({
      organizationId: orgId,
      evaluationVersionId: versionId,
      inputValues: dto.inputValues,
      status: execResult.status,
      finalResult: execResult.finalResult,
      startedAt: new Date(startTime),
      finishedAt: new Date(),
    });
    const savedExec = await em.getRepository(Execution).save(execution);

    // Persist node results
    const nodeResults = execResult.nodeResults.map(r => ({
      executionId: savedExec.id,
      nodeId: r.nodeId,
      status: r.status,
      value: r.value as Record<string, unknown> | null,
      inputsReceived: r.inputsReceived,
      explanation: r.explanation,
      warnings: r.warnings,
      error: r.error,
      durationMs: r.durationMs,
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await em.getRepository(ExecutionNodeResultEntity).insert(nodeResults as any[]);

    return this.toResponse(savedExec);
  }

  async getById(
    orgId: OrganizationId,
    executionId: ExecutionId,
    em: EntityManager,
  ): Promise<unknown> {
    const exec = await em.getRepository(Execution).findOne({
      where: { id: executionId, organizationId: orgId },
    });
    if (!exec) throw new NotFoundException(`Execution ${executionId} not found`);
    return this.toResponse(exec);
  }

  async getTrace(
    orgId: OrganizationId,
    executionId: ExecutionId,
    em: EntityManager,
  ): Promise<unknown> {
    const exec = await em.getRepository(Execution).findOne({
      where: { id: executionId, organizationId: orgId },
    });
    if (!exec) throw new NotFoundException(`Execution ${executionId} not found`);

    const results = await em.getRepository(ExecutionNodeResultEntity).find({
      where: { executionId },
      order: { createdAt: 'ASC' },
    });

    return {
      executionId: exec.id,
      status: exec.status,
      finalResult: exec.finalResult,
      nodes: results.map(r => ({
        nodeId: r.nodeId,
        status: r.status,
        value: r.value,
        inputsReceived: r.inputsReceived,
        explanation: r.explanation,
        warnings: r.warnings,
        error: r.error,
        durationMs: r.durationMs,
      })),
    };
  }

  private toResponse(exec: Execution) {
    return {
      id: exec.id,
      organizationId: exec.organizationId,
      evaluationVersionId: exec.evaluationVersionId,
      status: exec.status,
      inputValues: exec.inputValues,
      finalResult: exec.finalResult,
      startedAt: exec.startedAt.toISOString(),
      finishedAt: exec.finishedAt?.toISOString() ?? null,
    };
  }
}
