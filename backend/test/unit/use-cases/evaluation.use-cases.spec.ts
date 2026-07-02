import { NotFoundException } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { Evaluation } from '../../../src/infrastructure/database/typeorm/entities/evaluation.entity';
import { EvaluationVersion } from '../../../src/infrastructure/database/typeorm/entities/evaluation-version.entity';
import { Execution } from '../../../src/infrastructure/database/typeorm/entities/execution.entity';
import { EvaluationUseCases } from '../../../src/modules/evaluation/use-cases/evaluation.use-cases';

const ORG_ID = '00000000-0000-0000-0000-000000000001' as unknown;
const EVAL_ID = 'eval-1' as unknown;
const VERSION_ID = 'version-1' as unknown;

const mockEvaluation: Evaluation = {
  id: EVAL_ID as string,
  organizationId: ORG_ID as string,
  schemaId: 'schema-1',
  name: 'Test Evaluation',
  description: 'Test',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  deletedAt: null,
} as Evaluation;

const mockVersion: EvaluationVersion = {
  id: VERSION_ID as string,
  evaluationId: EVAL_ID as string,
  versionNumber: 1,
  status: 'DRAFT',
  publishedAt: null,
  createdAt: new Date('2024-01-01'),
  deletedAt: null,
} as EvaluationVersion;

const mockExecution = {
  id: 'exec-1',
  organizationId: ORG_ID as string,
  evaluationVersionId: VERSION_ID as string,
  status: 'SUCCESS',
  inputValues: { followers: 1000 },
  finalResult: { score: 7.5 },
  startedAt: new Date('2024-01-01'),
  finishedAt: new Date('2024-01-01'),
};

describe('EvaluationUseCases', () => {
  let useCases: EvaluationUseCases;
  let mockEm: jest.Mocked<EntityManager>;
  let mockEvalRepo: jest.Mocked<Repository<Evaluation>>;
  let mockVersionRepo: jest.Mocked<Repository<EvaluationVersion>>;
  let mockExecRepo: jest.Mocked<Repository<Execution>>;

  beforeEach(() => {
    mockEvalRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<Repository<Evaluation>>;

    mockVersionRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<EvaluationVersion>>;

    mockExecRepo = {
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<Execution>>;

    mockEm = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === Evaluation) return mockEvalRepo;
        if (entity === EvaluationVersion) return mockVersionRepo;
        if (entity === Execution) return mockExecRepo;
        return {};
      }),
    } as unknown as jest.Mocked<EntityManager>;

    useCases = new EvaluationUseCases();
  });

  describe('getVersion', () => {
    it('should return version successfully', async () => {
      mockEvalRepo.findOne.mockResolvedValue(mockEvaluation);
      mockVersionRepo.findOne.mockResolvedValue(mockVersion);

      const result = await useCases.getVersion(ORG_ID as any, EVAL_ID as any, VERSION_ID as any, mockEm);

      expect(result).toEqual(expect.objectContaining({
        id: VERSION_ID,
        evaluationId: EVAL_ID,
        versionNumber: 1,
        status: 'DRAFT',
      }));
    });

    it('should throw NotFoundException if evaluation not found', async () => {
      mockEvalRepo.findOne.mockResolvedValue(null);

      await expect(
        useCases.getVersion(ORG_ID as any, EVAL_ID as any, VERSION_ID as any, mockEm),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if version not found', async () => {
      mockEvalRepo.findOne.mockResolvedValue(mockEvaluation);
      mockVersionRepo.findOne.mockResolvedValue(null);

      await expect(
        useCases.getVersion(ORG_ID as any, EVAL_ID as any, VERSION_ID as any, mockEm),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listVersions', () => {
    it('should return list of versions for evaluation', async () => {
      mockEvalRepo.findOne.mockResolvedValue(mockEvaluation);
      mockVersionRepo.find.mockResolvedValue([mockVersion]);

      const result = await useCases.listVersions(ORG_ID as any, EVAL_ID as any, mockEm);

      expect(mockVersionRepo.find).toHaveBeenCalledWith({
        where: { evaluationId: EVAL_ID, deletedAt: expect.anything() },
        order: { versionNumber: 'DESC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({
        id: VERSION_ID,
        versionNumber: 1,
      }));
    });

    it('should throw NotFoundException if evaluation not found', async () => {
      mockEvalRepo.findOne.mockResolvedValue(null);

      await expect(
        useCases.listVersions(ORG_ID as any, EVAL_ID as any, mockEm),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listExecutionsByEvaluation', () => {
    it('should return list of executions for evaluation', async () => {
      mockEvalRepo.findOne.mockResolvedValue(mockEvaluation);
      mockVersionRepo.find.mockResolvedValue([mockVersion]);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockExecution]),
      } as unknown as jest.Mocked<ReturnType<Repository<Execution>['createQueryBuilder']>>;
      mockExecRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await useCases.listExecutionsByEvaluation(ORG_ID as any, EVAL_ID as any, mockEm);

      expect(mockExecRepo.createQueryBuilder).toHaveBeenCalledWith('e');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({
        id: 'exec-1',
        status: 'SUCCESS',
      }));
    });

    it('should return empty array if no versions exist', async () => {
      mockEvalRepo.findOne.mockResolvedValue(mockEvaluation);
      mockVersionRepo.find.mockResolvedValue([]);

      const result = await useCases.listExecutionsByEvaluation(ORG_ID as any, EVAL_ID as any, mockEm);

      expect(result).toEqual([]);
    });

    it('should throw NotFoundException if evaluation not found', async () => {
      mockEvalRepo.findOne.mockResolvedValue(null);

      await expect(
        useCases.listExecutionsByEvaluation(ORG_ID as any, EVAL_ID as any, mockEm),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
