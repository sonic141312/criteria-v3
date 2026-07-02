import { NotFoundException } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { Schema } from '../../../src/infrastructure/database/typeorm/entities/schema.entity';
import { Field } from '../../../src/infrastructure/database/typeorm/entities/field.entity';
import { SchemaUseCases } from '../../../src/modules/schema/use-cases/schema.use-cases';

const ORG_ID = '00000000-0000-0000-0000-000000000001' as unknown;
const SCHEMA_ID = 'schema-1' as unknown;
const FIELD_ID = 'field-1' as unknown;

const mockSchema: Schema = {
  id: SCHEMA_ID as string,
  organizationId: ORG_ID as string,
  name: 'Test Schema',
  description: 'Test',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  deletedAt: null,
} as Schema;

const mockField: Field = {
  id: FIELD_ID as string,
  schemaId: SCHEMA_ID as string,
  key: 'followers',
  displayName: 'Followers',
  description: 'Number of followers',
  dataType: 'number',
  validation: null,
  metadata: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
} as Field;

describe('SchemaUseCases', () => {
  let useCases: SchemaUseCases;
  let mockSchemaRepo: jest.Mocked<Repository<Schema>>;
  let mockFieldRepo: jest.Mocked<Repository<Field>>;
  let mockEm: jest.Mocked<EntityManager>;

  beforeEach(() => {
    mockSchemaRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<Repository<Schema>>;

    mockFieldRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<Field>>;

    mockEm = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === Schema) return mockSchemaRepo;
        if (entity === Field) return mockFieldRepo;
        return {};
      }),
    } as unknown as jest.Mocked<EntityManager>;

    useCases = new SchemaUseCases(mockSchemaRepo, mockFieldRepo);
  });

  describe('deleteField', () => {
    it('should delete field successfully', async () => {
      mockSchemaRepo.findOne.mockResolvedValue(mockSchema);
      mockFieldRepo.delete.mockResolvedValue({ affected: 1, raw: {} });

      await useCases.deleteField(ORG_ID as any, SCHEMA_ID as any, FIELD_ID as any, mockEm);

      expect(mockFieldRepo.delete).toHaveBeenCalledWith({ id: FIELD_ID, schemaId: SCHEMA_ID });
    });

    it('should throw NotFoundException if schema not found', async () => {
      mockSchemaRepo.findOne.mockResolvedValue(null);

      await expect(
        useCases.deleteField(ORG_ID as any, SCHEMA_ID as any, FIELD_ID as any, mockEm),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateField', () => {
    it('should update field displayName successfully', async () => {
      mockSchemaRepo.findOne.mockResolvedValue(mockSchema);
      mockFieldRepo.findOne.mockResolvedValue(mockField);
      mockFieldRepo.update.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });

      const updatedField = { ...mockField, displayName: 'Updated Display Name' };
      mockFieldRepo.findOne.mockResolvedValue(updatedField);

      const result = await useCases.updateField(
        ORG_ID as any,
        SCHEMA_ID as any,
        FIELD_ID as any,
        { displayName: 'Updated Display Name' },
        mockEm,
      );

      expect(mockFieldRepo.update).toHaveBeenCalledWith(
        { id: FIELD_ID },
        expect.objectContaining({ displayName: 'Updated Display Name' }),
      );
      expect(result).toEqual(expect.objectContaining({ displayName: 'Updated Display Name' }));
    });

    it('should update field description successfully', async () => {
      mockSchemaRepo.findOne.mockResolvedValue(mockSchema);
      mockFieldRepo.findOne.mockResolvedValue(mockField);
      mockFieldRepo.update.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });

      const updatedField = { ...mockField, description: 'New description' };
      mockFieldRepo.findOne.mockResolvedValue(updatedField);

      const result = await useCases.updateField(
        ORG_ID as any,
        SCHEMA_ID as any,
        FIELD_ID as any,
        { description: 'New description' },
        mockEm,
      );

      expect(result).toEqual(expect.objectContaining({ description: 'New description' }));
    });

    it('should throw NotFoundException if schema not found', async () => {
      mockSchemaRepo.findOne.mockResolvedValue(null);

      await expect(
        useCases.updateField(ORG_ID as any, SCHEMA_ID as any, FIELD_ID as any, { displayName: 'Test' }, mockEm),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if field not found', async () => {
      mockSchemaRepo.findOne.mockResolvedValue(mockSchema);
      mockFieldRepo.findOne.mockResolvedValue(null);

      await expect(
        useCases.updateField(ORG_ID as any, SCHEMA_ID as any, FIELD_ID as any, { displayName: 'Test' }, mockEm),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listFields', () => {
    it('should return list of fields for schema', async () => {
      mockSchemaRepo.findOne.mockResolvedValue(mockSchema);
      mockFieldRepo.find.mockResolvedValue([mockField]);

      const result = await useCases.listFields(ORG_ID as any, SCHEMA_ID as any);

      expect(mockFieldRepo.find).toHaveBeenCalledWith({
        where: { schemaId: SCHEMA_ID },
        order: { createdAt: 'ASC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({
        id: FIELD_ID,
        key: 'followers',
        displayName: 'Followers',
      }));
    });

    it('should throw NotFoundException if schema not found', async () => {
      mockSchemaRepo.findOne.mockResolvedValue(null);

      await expect(useCases.listFields(ORG_ID as any, SCHEMA_ID as any)).rejects.toThrow(NotFoundException);
    });
  });
});
