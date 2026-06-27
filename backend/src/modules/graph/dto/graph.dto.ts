import { IsString, IsNumber, IsOptional, IsObject, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateNodeDto {
  @IsString()
  nodeType!: string;

  @IsString()
  label!: string;

  @IsObject()
  config!: Record<string, unknown>;

  @IsNumber()
  positionX!: number;

  @IsNumber()
  positionY!: number;
}

export class UpdateNodeDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @IsOptional()
  @IsNumber()
  positionX?: number;

  @IsOptional()
  @IsNumber()
  positionY?: number;
}

export class CreateEdgeDto {
  @IsUUID()
  fromNodeId!: string;

  @IsString()
  fromPort!: string;

  @IsUUID()
  toNodeId!: string;

  @IsString()
  toPort!: string;
}

export class GraphResponseDto {
  nodes!: unknown[];
  edges!: unknown[];
}
