import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Node } from '../../infrastructure/database/typeorm/entities/node.entity';
import { Edge } from '../../infrastructure/database/typeorm/entities/edge.entity';
import { EvaluationVersion } from '../../infrastructure/database/typeorm/entities/evaluation-version.entity';
import { PluginModule } from '../plugin/plugin.module';
import { GraphController } from './controllers/graph.controller';
import { GraphUseCases } from './use-cases/graph.use-cases';
import { GraphValidator } from '../../engine/validator';

@Module({
  imports: [TypeOrmModule.forFeature([Node, Edge, EvaluationVersion]), PluginModule],
  controllers: [GraphController],
  providers: [GraphUseCases, GraphValidator],
})
export class GraphModule {}
