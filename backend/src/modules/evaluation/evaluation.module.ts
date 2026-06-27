import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Evaluation } from '../../infrastructure/database/typeorm/entities/evaluation.entity';
import { EvaluationVersion } from '../../infrastructure/database/typeorm/entities/evaluation-version.entity';
import { EvaluationController } from './controllers/evaluation.controller';
import { EvaluationUseCases } from './use-cases/evaluation.use-cases';

@Module({
  imports: [TypeOrmModule.forFeature([Evaluation, EvaluationVersion])],
  controllers: [EvaluationController],
  providers: [EvaluationUseCases],
})
export class EvaluationModule {}
