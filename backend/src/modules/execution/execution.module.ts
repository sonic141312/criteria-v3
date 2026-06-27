import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Execution } from '../../infrastructure/database/typeorm/entities/execution.entity';
import { ExecutionNodeResult } from '../../infrastructure/database/typeorm/entities/execution-node-result.entity';
import { EvaluationVersion } from '../../infrastructure/database/typeorm/entities/evaluation-version.entity';
import { Node } from '../../infrastructure/database/typeorm/entities/node.entity';
import { Edge } from '../../infrastructure/database/typeorm/entities/edge.entity';
import { ExecutionController } from './controllers/execution.controller';
import { ExecutionUseCases } from './use-cases/execution.use-cases';
import { Executor } from '../../engine/executor';
import { NodeRegistry } from '../../shared/plugins';

@Module({
  imports: [TypeOrmModule.forFeature([Execution, ExecutionNodeResult, EvaluationVersion, Node, Edge])],
  controllers: [ExecutionController],
  providers: [
    {
      provide: Executor,
      inject: [NodeRegistry],
      useFactory: (registry: NodeRegistry) => new Executor(registry),
    },
    ExecutionUseCases,
  ],
})
export class ExecutionModule {}
