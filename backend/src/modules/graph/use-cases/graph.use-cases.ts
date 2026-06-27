import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Node } from '../../../infrastructure/database/typeorm/entities/node.entity';
import { Edge } from '../../../infrastructure/database/typeorm/entities/edge.entity';
import { EvaluationVersion } from '../../../infrastructure/database/typeorm/entities/evaluation-version.entity';
import { OrganizationId, EvaluationVersionId, NodeId, EdgeId } from '../../../shared/types';
import { GraphValidator } from '../../../engine/validator';
import { DagBuilder } from '../../../engine/graph';
import { NodeRegistry } from '../../../shared/plugins';
import { CreateNodeDto, UpdateNodeDto, CreateEdgeDto } from '../dto/graph.dto';

@Injectable()
export class GraphUseCases {
  constructor(
    private readonly validator: GraphValidator,
    private readonly registry: NodeRegistry,
  ) {}

  async getGraph(
    orgId: OrganizationId,
    versionId: EvaluationVersionId,
    em: EntityManager,
  ): Promise<{ nodes: unknown[]; edges: unknown[] }> {
    const version = await this.loadVersion(orgId, versionId, em);
    if (!version) throw new NotFoundException(`Version ${versionId} not found`);

    const nodes = await em.getRepository(Node).find({ where: { evaluationVersionId: versionId } });
    const edges = await em.getRepository(Edge).find({
      where: { evaluationVersionId: versionId },
      order: { executionOrder: 'ASC' },
    });

    return {
      nodes: nodes.map(n => this.nodeToResponse(n)),
      edges: edges.map(e => this.edgeToResponse(e)),
    };
  }

  async createNode(
    orgId: OrganizationId,
    versionId: EvaluationVersionId,
    dto: CreateNodeDto,
    em: EntityManager,
  ): Promise<unknown> {
    const version = await this.loadVersion(orgId, versionId, em);
    if (!version) throw new NotFoundException(`Version ${versionId} not found`);
    if (version.status !== 'DRAFT') {
      throw new BadRequestException(`Cannot modify nodes of ${version.status} version`);
    }

    // Validate plugin exists
    try {
      this.registry.get(dto.nodeType);
    } catch {
      throw new BadRequestException(`Unknown node type: ${dto.nodeType}`);
    }

    // Validate config against plugin
    const def = this.registry.get(dto.nodeType);
    const validation = def.validate(dto.config);
    if (!validation.valid) {
      throw new BadRequestException(`Invalid config: ${validation.errors.map((e: { message: string }) => e.message).join(', ')}`);
    }

    const node = em.getRepository(Node).create({
      evaluationVersionId: versionId,
      nodeType: dto.nodeType,
      label: dto.label,
      config: dto.config,
      positionX: dto.positionX,
      positionY: dto.positionY,
    });
    const saved = await em.getRepository(Node).save(node);
    return this.nodeToResponse(saved);
  }

  async updateNode(
    orgId: OrganizationId,
    versionId: EvaluationVersionId,
    nodeId: NodeId,
    dto: UpdateNodeDto,
    em: EntityManager,
  ): Promise<void> {
    const version = await this.loadVersion(orgId, versionId, em);
    if (!version) throw new NotFoundException(`Version ${versionId} not found`);
    if (version.status !== 'DRAFT') {
      throw new BadRequestException(`Cannot modify nodes of ${version.status} version`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await em.getRepository(Node).update({ id: nodeId, evaluationVersionId: versionId }, dto as any);
  }

  async deleteNode(
    orgId: OrganizationId,
    versionId: EvaluationVersionId,
    nodeId: NodeId,
    em: EntityManager,
  ): Promise<void> {
    const version = await this.loadVersion(orgId, versionId, em);
    if (!version) throw new NotFoundException(`Version ${versionId} not found`);
    if (version.status !== 'DRAFT') {
      throw new BadRequestException(`Cannot modify nodes of ${version.status} version`);
    }

    await em.getRepository(Node).delete({ id: nodeId, evaluationVersionId: versionId });
  }

  async createEdge(
    orgId: OrganizationId,
    versionId: EvaluationVersionId,
    dto: CreateEdgeDto,
    em: EntityManager,
  ): Promise<unknown> {
    const version = await this.loadVersion(orgId, versionId, em);
    if (!version) throw new NotFoundException(`Version ${versionId} not found`);
    if (version.status !== 'DRAFT') {
      throw new BadRequestException(`Cannot modify edges of ${version.status} version`);
    }

    // Verify both nodes exist and belong to this version
    const [fromNode, toNode] = await Promise.all([
      em.getRepository(Node).findOne({ where: { id: dto.fromNodeId, evaluationVersionId: versionId } }),
      em.getRepository(Node).findOne({ where: { id: dto.toNodeId, evaluationVersionId: versionId } }),
    ]);
    if (!fromNode) throw new NotFoundException(`From node ${dto.fromNodeId} not found`);
    if (!toNode) throw new NotFoundException(`To node ${dto.toNodeId} not found`);

    // Get max execution order
    const maxOrder = await em.getRepository(Edge)
      .createQueryBuilder('e')
      .select('MAX(e.executionOrder)', 'max')
      .where('e.evaluationVersionId = :versionId', { versionId })
      .getRawOne();

    const edge = em.getRepository(Edge).create({
      evaluationVersionId: versionId,
      fromNodeId: dto.fromNodeId,
      fromPort: dto.fromPort,
      toNodeId: dto.toNodeId,
      toPort: dto.toPort,
      executionOrder: (maxOrder?.max ?? 0) + 1,
    });
    const saved = await em.getRepository(Edge).save(edge);
    return this.edgeToResponse(saved);
  }

  async deleteEdge(
    orgId: OrganizationId,
    versionId: EvaluationVersionId,
    edgeId: EdgeId,
    em: EntityManager,
  ): Promise<void> {
    const version = await this.loadVersion(orgId, versionId, em);
    if (!version) throw new NotFoundException(`Version ${versionId} not found`);
    if (version.status !== 'DRAFT') {
      throw new BadRequestException(`Cannot modify edges of ${version.status} version`);
    }

    await em.getRepository(Edge).delete({ id: edgeId, evaluationVersionId: versionId });
  }

  async validateGraph(
    orgId: OrganizationId,
    versionId: EvaluationVersionId,
    em: EntityManager,
  ): Promise<{ valid: boolean; errors: unknown[] }> {
    const version = await this.loadVersion(orgId, versionId, em);
    if (!version) throw new NotFoundException(`Version ${versionId} not found`);

    const nodeRows = await em.getRepository(Node).find({ where: { evaluationVersionId: versionId } });
    const edgeRows = await em.getRepository(Edge).find({ where: { evaluationVersionId: versionId } });

    const graph = new DagBuilder(this.registry).build(versionId, nodeRows, edgeRows);
    const result = this.validator.validate(graph);

    return {
      valid: result.valid,
      errors: result.errors,
    };
  }

  private async loadVersion(
    orgId: OrganizationId,
    versionId: EvaluationVersionId,
    em: EntityManager,
  ): Promise<EvaluationVersion | null> {
    return em.getRepository(EvaluationVersion)
      .createQueryBuilder('v')
      .innerJoin('v.evaluation', 'e')
      .where('v.id = :versionId', { versionId })
      .andWhere('e.organizationId = :orgId', { orgId })
      .andWhere('v.deletedAt IS NULL')
      .getOne();
  }

  private nodeToResponse(n: Node) {
    return {
      id: n.id,
      evaluationVersionId: n.evaluationVersionId,
      nodeType: n.nodeType,
      label: n.label,
      config: n.config,
      positionX: n.positionX,
      positionY: n.positionY,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    };
  }

  private edgeToResponse(e: Edge) {
    return {
      id: e.id,
      evaluationVersionId: e.evaluationVersionId,
      fromNodeId: e.fromNodeId,
      fromPort: e.fromPort,
      toNodeId: e.toNodeId,
      toPort: e.toPort,
      executionOrder: e.executionOrder,
      createdAt: e.createdAt.toISOString(),
    };
  }
}
