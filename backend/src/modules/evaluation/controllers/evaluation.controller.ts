import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseInterceptors, HttpCode, HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { DataSource } from 'typeorm';
import { EvaluationUseCases } from '../use-cases/evaluation.use-cases';
import { OrgContextInterceptor } from '@infrastructure/auth/org-context.interceptor';
import { CreateEvaluationDto, UpdateEvaluationDto } from '../dto/evaluation.dto';

@Controller('evaluations')
@UseInterceptors(OrgContextInterceptor)
export class EvaluationController {
  constructor(
    private readonly useCases: EvaluationUseCases,
    private readonly dataSource: DataSource,
  ) {}

  @Get()
  async list(@Req() req: Request) {
    return this.dataSource.transaction((em) =>
      this.useCases.list(req.user!.organizationId as never, em),
    );
  }

  @Get(':id')
  async findById(@Param('id') id: string, @Req() req: Request) {
    return this.dataSource.transaction((em) =>
      this.useCases.findById(req.user!.organizationId as never, id as never, em),
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateEvaluationDto, @Req() req: Request) {
    return this.dataSource.transaction((em) =>
      this.useCases.create(req.user!.organizationId as never, dto, em),
    );
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateEvaluationDto, @Req() req: Request) {
    return this.dataSource.transaction((em) =>
      this.useCases.update(req.user!.organizationId as never, id as never, dto, em),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @Req() req: Request) {
    return this.dataSource.transaction((em) =>
      this.useCases.softDelete(req.user!.organizationId as never, id as never, em),
    );
  }

  @Get(':id/versions')
  async listVersions(@Param('id') id: string, @Req() req: Request) {
    return this.dataSource.transaction((em) =>
      this.useCases.listVersions(req.user!.organizationId as never, id as never, em),
    );
  }

  @Get(':id/versions/:vId')
  async getVersion(@Param('id') id: string, @Param('vId') vId: string, @Req() req: Request) {
    return this.dataSource.transaction((em) =>
      this.useCases.getVersion(req.user!.organizationId as never, id as never, vId as never, em),
    );
  }

  @Get(':id/executions')
  async listExecutions(@Param('id') id: string, @Req() req: Request) {
    return this.dataSource.transaction((em) =>
      this.useCases.listExecutionsByEvaluation(req.user!.organizationId as never, id as never, em),
    );
  }

  @Post(':id/versions')
  @HttpCode(HttpStatus.CREATED)
  async createVersion(@Param('id') id: string, @Req() req: Request) {
    return this.dataSource.transaction((em) =>
      this.useCases.createVersion(req.user!.organizationId as never, id as never, em),
    );
  }

  @Post(':id/versions/:vId/publish')
  @HttpCode(HttpStatus.OK)
  async publish(@Param('id') id: string, @Param('vId') vId: string, @Req() req: Request) {
    return this.dataSource.transaction((em) =>
      this.useCases.publish(req.user!.organizationId as never, id as never, vId as never, em),
    );
  }
}
