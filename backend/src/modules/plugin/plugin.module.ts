import { Module, Global } from '@nestjs/common';
import { NodeRegistry } from '../../shared/plugins';
import { PluginController } from './controllers/plugin.controller';

/**
 * Global plugin module. Exports NodeRegistry as a singleton.
 */
@Global()
@Module({
  controllers: [PluginController],
  providers: [NodeRegistry],
  exports: [NodeRegistry],
})
export class PluginModule {}
