import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Edge } from '@infrastructure/database/typeorm/entities/edge.entity';
import { EvaluationVersionId, EdgeId, NodeId } from '@shared/types';

@Injectable()
export class TypeormEdgeRepository {
  constructor(@InjectRepository(Edge) private readonly repo: Repository<Edge>) {}

  private client(em?: EntityManager) {
    return em ? em.getRepository(Edge) : this.repo;
  }

  async findById(id: EdgeId, em?: EntityManager): Promise<Edge | null> {
    return this.client(em).findOne({ where: { id } });
  }

  async findByVersion(versionId: EvaluationVersionId, em?: EntityManager): Promise<Edge[]> {
    return this.client(em).find({ where: { evaluationVersionId: versionId }, order: { executionOrder: 'ASC' } });
  }

  async findByNode(nodeId: NodeId, em?: EntityManager): Promise<Edge[]> {
    return this.client(em).find({
      where: [{ fromNodeId: nodeId }, { toNodeId: nodeId }],
      order: { executionOrder: 'ASC' },
    });
  }

  async create(
    versionId: EvaluationVersionId,
    data: {
      fromNodeId: NodeId;
      fromPort: string;
      toNodeId: NodeId;
      toPort: string;
      executionOrder: number;
    },
    em: EntityManager,
  ): Promise<Edge> {
    const repo = this.client(em);
    const edge = repo.create({ evaluationVersionId: versionId, ...data });
    return repo.save(edge);
  }

  async delete(id: EdgeId, em: EntityManager): Promise<void> {
    await this.client(em).delete({ id });
  }

  async deleteByVersion(versionId: EvaluationVersionId, em: EntityManager): Promise<void> {
    await this.client(em).delete({ evaluationVersionId: versionId });
  }
}
