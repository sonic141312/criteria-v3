import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Node } from '@infrastructure/database/typeorm/entities/node.entity';
import { EvaluationVersionId, NodeId } from '@shared/types';

@Injectable()
export class TypeormNodeRepository {
  constructor(@InjectRepository(Node) private readonly repo: Repository<Node>) {}

  private client(em?: EntityManager) {
    return em ? em.getRepository(Node) : this.repo;
  }

  async findById(id: NodeId, em?: EntityManager): Promise<Node | null> {
    return this.client(em).findOne({ where: { id } });
  }

  async findByVersion(versionId: EvaluationVersionId, em?: EntityManager): Promise<Node[]> {
    return this.client(em).find({ where: { evaluationVersionId: versionId } });
  }

  async create(
    versionId: EvaluationVersionId,
    data: {
      nodeType: string;
      label: string;
      config: Record<string, unknown>;
      positionX: number;
      positionY: number;
    },
    em: EntityManager,
  ): Promise<Node> {
    const repo = this.client(em);
    const node = repo.create({ evaluationVersionId: versionId, ...data });
    return repo.save(node);
  }

  async update(id: NodeId, data: Partial<Node>, em: EntityManager): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.client(em).update({ id }, data as any);
  }

  async delete(id: NodeId, em: EntityManager): Promise<void> {
    await this.client(em).delete({ id });
  }

  async deleteByVersion(versionId: EvaluationVersionId, em: EntityManager): Promise<void> {
    await this.client(em).delete({ evaluationVersionId: versionId });
  }
}
