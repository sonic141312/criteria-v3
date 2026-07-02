import { EntityManager, Repository } from 'typeorm';
import { Execution } from '../../../src/infrastructure/database/typeorm/entities/execution.entity';
import { ExecutionUseCases } from '../../../src/modules/execution/use-cases/execution.use-cases';
import { Executor } from '../../../src/engine/executor';

const ORG_ID = '00000000-0000-0000-0000-000000000001';

const mockExecution = {
  id: 'exec-1',
  organizationId: ORG_ID,
  evaluationVersionId: 'version-1',
  status: 'SUCCESS',
  inputValues: { followers: 1000 },
  finalResult: { score: 7.5 },
  startedAt: new Date('2024-01-01'),
  finishedAt: new Date('2024-01-01'),
} as unknown as Execution;

describe('ExecutionUseCases', () => {
  let useCases: ExecutionUseCases;
  let mockEm: jest.Mocked<EntityManager>;
  let mockExecRepo: jest.Mocked<Repository<Execution>>;
  let mockExecutor: jest.Mocked<Executor>;

  beforeEach(() => {
    mockExecRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<Execution>>;

    mockEm = {
      getRepository: jest.fn(() => mockExecRepo),
    } as unknown as jest.Mocked<EntityManager>;

    mockExecutor = {
      execute: jest.fn(),
      getRegistry: jest.fn(),
    } as unknown as jest.Mocked<Executor>;

    useCases = new ExecutionUseCases(mockExecutor);
  });

  describe('list', () => {
    it('should return list of executions for org', async () => {
      mockExecRepo.find.mockResolvedValue([mockExecution]);

      const result = await useCases.list(ORG_ID as any, mockEm);

      expect(mockExecRepo.find).toHaveBeenCalledWith({
        where: { organizationId: ORG_ID },
        order: { startedAt: 'DESC' },
        take: 100,
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({
        id: 'exec-1',
        status: 'SUCCESS',
      }));
    });

    it('should return empty array if no executions exist', async () => {
      mockExecRepo.find.mockResolvedValue([]);

      const result = await useCases.list(ORG_ID as any, mockEm);

      expect(result).toEqual([]);
    });

    it('should limit results to 100', async () => {
      mockExecRepo.find.mockResolvedValue([mockExecution]);

      await useCases.list(ORG_ID as any, mockEm);

      expect(mockExecRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });
  });

  describe('getById', () => {
    it('should return execution by id', async () => {
      mockExecRepo.findOne.mockResolvedValue(mockExecution);

      const result = await useCases.getById(ORG_ID as any, 'exec-1' as any, mockEm);

      expect(mockExecRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'exec-1', organizationId: ORG_ID },
      });
      expect(result).toEqual(expect.objectContaining({
        id: 'exec-1',
        status: 'SUCCESS',
      }));
    });
  });
});
