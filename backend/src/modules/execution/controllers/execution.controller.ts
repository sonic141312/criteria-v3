import { Controller, Get, Post, Body, Param, Req, UseInterceptors, HttpCode, HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { DataSource } from 'typeorm';
import { ExecutionUseCases } from '../use-cases/execution.use-cases';
import { OrgContextInterceptor } from '@infrastructure/auth/org-context.interceptor';
import { RunExecutionDto } from '../dto/execution.dto';

@Controller('executions')
@UseInterceptors(OrgContextInterceptor)
export class ExecutionController {
  constructor(
    private readonly useCases: ExecutionUseCases,
    private readonly dataSource: DataSource,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async run(@Body() dto: RunExecutionDto, @Req() req: Request) {
    return this.dataSource.transaction((em) =>
      this.useCases.run(req.user!.organizationId as never, dto, em),
    );
  }

  @Get(':id')
  async getById(@Param('id') id: string, @Req() req: Request) {
    return this.dataSource.transaction((em) =>
      this.useCases.getById(req.user!.organizationId as never, id as never, em),
    );
  }

  @Get(':id/trace')
  async getTrace(@Param('id') id: string, @Req() req: Request) {
    return this.dataSource.transaction((em) =>
      this.useCases.getTrace(req.user!.organizationId as never, id as never, em),
    );
  }
}
