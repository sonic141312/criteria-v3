import { IsString, IsOptional, MaxLength, IsUUID } from 'class-validator';

export class CreateEvaluationDto {
  @IsUUID()
  schemaId!: string;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateEvaluationDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class EvaluationResponseDto {
  id!: string;
  organizationId!: string;
  schemaId!: string;
  name!: string;
  description!: string | null;
  createdAt!: string;
  updatedAt!: string;
}

export class EvaluationVersionResponseDto {
  id!: string;
  evaluationId!: string;
  versionNumber!: number;
  status!: string;
  publishedAt!: string | null;
  createdAt!: string;
}
