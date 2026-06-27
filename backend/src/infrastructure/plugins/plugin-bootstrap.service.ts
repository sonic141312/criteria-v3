import { Injectable, OnModuleInit } from '@nestjs/common';
import { NodeRegistry } from '../../shared/plugins';
import { InputPlugin } from './core/input.plugin';
import { NormalizePlugin } from './core/normalize.plugin';
import { ThresholdPlugin } from './core/threshold.plugin';
import { OutputPlugin } from './core/output.plugin';
import { WeightedAveragePlugin } from './core/weighted-average.plugin';
import { FormulaPlugin } from './core/formula.plugin';

/**
 * Registers all core plugins with the NodeRegistry at application startup.
 * Runs once when the module initializes.
 */
@Injectable()
export class PluginBootstrapService implements OnModuleInit {
  constructor(private readonly registry: NodeRegistry) {}

  onModuleInit(): void {
    const plugins = [
      InputPlugin,
      NormalizePlugin,
      ThresholdPlugin,
      OutputPlugin,
      WeightedAveragePlugin,
      FormulaPlugin,
    ];

    for (const plugin of plugins) {
      this.registry.register(plugin);
      console.log(`[PluginBootstrap] Registered: ${plugin.type} v${plugin.version}`);
    }

    console.log(`[PluginBootstrap] Total plugins: ${this.registry.size}`);
  }
}
