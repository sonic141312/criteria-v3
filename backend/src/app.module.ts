import { Module } from '@nestjs/common';

import { TypeOrmDatabaseModule } from './infrastructure/database/typeorm/typeorm.module';
import { PluginBootstrapService } from './infrastructure/plugins/plugin-bootstrap.service';
import { HealthModule } from './modules/health/health.module';
import { SchemaModule } from './modules/schema/schema.module';
import { EvaluationModule } from './modules/evaluation/evaluation.module';
import { GraphModule } from './modules/graph/graph.module';
import { ExecutionModule } from './modules/execution/execution.module';
import { PluginModule } from './modules/plugin/plugin.module';

/**
 * Root module. Wires infrastructure and feature modules.
 * Phase 4: all REST API modules wired.
 */
@Module({
  imports: [
    TypeOrmDatabaseModule,
    PluginModule,    // Global — must come before modules that inject NodeRegistry
    HealthModule,
    SchemaModule,
    EvaluationModule,
    GraphModule,
    ExecutionModule,
  ],
  providers: [PluginBootstrapService],
})
export class AppModule {}
