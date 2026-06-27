import { Controller, Get, Param } from '@nestjs/common';
import { NodeRegistry } from '@shared/plugins';

@Controller('plugins')
export class PluginController {
  constructor(private readonly registry: NodeRegistry) {}

  @Get()
  list() {
    return this.registry.discover().map(def => ({
      type: def.type,
      version: def.version,
      metadata: def.metadata,
      inputPorts: def.inputPorts,
      outputPorts: def.outputPorts,
      configSchema: def.configSchema,
      capability: def.capability,
    }));
  }

  @Get(':type')
  getByType(@Param('type') type: string) {
    const def = this.registry.get(type);
    return {
      type: def.type,
      version: def.version,
      metadata: def.metadata,
      inputPorts: def.inputPorts,
      outputPorts: def.outputPorts,
      configSchema: def.configSchema,
      capability: def.capability,
    };
  }
}
