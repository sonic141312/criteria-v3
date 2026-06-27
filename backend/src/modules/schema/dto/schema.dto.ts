import { IsString, IsOptional, MaxLength, IsUUID } from 'class-validator';

export class CreateSchemaDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateSchemaDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class SchemaResponseDto {
  id!: string;
  organizationId!: string;
  name!: string;
  description!: string | null;
  createdAt!: string;
  updatedAt!: string;
}

export class CreateFieldDto {
  @IsString()
  @MaxLength(255)
  key!: string;

  @IsString()
  @MaxLength(255)
  displayName!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  dataType!: string;

  @IsOptional()
  validation?: Record<string, unknown>;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class UpdateFieldDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  validation?: Record<string, unknown>;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class FieldResponseDto {
  id!: string;
  schemaId!: string;
  key!: string;
  displayName!: string;
  description!: string | null;
  dataType!: string;
  validation!: Record<string, unknown> | null;
  metadata!: Record<string, unknown> | null;
  createdAt!: string;
  updatedAt!: string;
}
