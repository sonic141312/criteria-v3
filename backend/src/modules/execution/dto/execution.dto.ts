import { IsObject, IsString } from 'class-validator';

export class RunExecutionDto {
  @IsString()
  evaluationVersionId!: string;

  @IsObject()
  inputValues!: Record<string, unknown>;
}

export class ExecutionResponseDto {
  id!: string;
  organizationId!: string;
  evaluationVersionId!: string;
  status!: string;
  inputValues!: Record<string, unknown>;
  finalResult!: Record<string, unknown> | null;
  startedAt!: string;
  finishedAt!: string | null;
}

export class ExecutionNodeResultDto {
  nodeId!: string;
  status!: string;
  value!: unknown;
  inputsReceived!: Record<string, unknown>;
  explanation!: string | null;
  warnings!: string[];
  error!: string | null;
  durationMs!: number | null;
}

export class ExecutionTraceDto {
  executionId!: string;
  status!: string;
  finalResult!: Record<string, unknown> | null;
  nodes!: ExecutionNodeResultDto[];
}
