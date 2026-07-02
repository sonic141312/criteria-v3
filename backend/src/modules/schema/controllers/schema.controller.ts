import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  Req, UseInterceptors, HttpCode, HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { DataSource } from 'typeorm';
import { SchemaUseCases } from '../use-cases/schema.use-cases';
import { OrgContextInterceptor } from '@infrastructure/auth/org-context.interceptor';
import { CreateSchemaDto, UpdateSchemaDto, UpdateFieldDto } from '../dto/schema.dto';

@Controller('schemas')
@UseInterceptors(OrgContextInterceptor)
export class SchemaController {
  constructor(
    private readonly useCases: SchemaUseCases,
    private readonly dataSource: DataSource,
  ) {}

  @Get()
  async list(@Req() req: Request) {
    return this.useCases.list(req.user!.organizationId as never);
  }

  @Get(':id')
  async findById(@Param('id') id: string, @Req() req: Request) {
    return this.useCases.findById(req.user!.organizationId as never, id as never);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateSchemaDto, @Req() req: Request) {
    return this.dataSource.transaction((em) =>
      this.useCases.create(req.user!.organizationId as never, dto, em),
    );
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSchemaDto,
    @Req() req: Request,
  ) {
    return this.dataSource.transaction((em) =>
      this.useCases.update(req.user!.organizationId as never, id as never, dto, em),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @Req() req: Request) {
    return this.dataSource.transaction((em) =>
      this.useCases.delete(req.user!.organizationId as never, id as never, em),
    );
  }

  @Get(':id/fields')
  async listFields(@Param('id') id: string, @Req() req: Request) {
    return this.useCases.listFields(req.user!.organizationId as never, id as never);
  }

  @Post(':id/fields')
  @HttpCode(HttpStatus.CREATED)
  async createField(
    @Param('id') id: string,
    @Body() dto: { key: string; displayName: string; dataType: string; description?: string; validation?: Record<string, unknown>; metadata?: Record<string, unknown> },
    @Req() req: Request,
  ) {
    return this.dataSource.transaction((em) =>
      this.useCases.createField(req.user!.organizationId as never, id as never, dto, em),
    );
  }

  @Patch(':id/fields/:fieldId')
  async updateField(
    @Param('id') id: string,
    @Param('fieldId') fieldId: string,
    @Body() dto: UpdateFieldDto,
    @Req() req: Request,
  ) {
    return this.dataSource.transaction((em) =>
      this.useCases.updateField(req.user!.organizationId as never, id as never, fieldId as never, dto, em),
    );
  }

  @Delete(':id/fields/:fieldId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteField(
    @Param('id') id: string,
    @Param('fieldId') fieldId: string,
    @Req() req: Request,
  ) {
    return this.dataSource.transaction((em) =>
      this.useCases.deleteField(req.user!.organizationId as never, id as never, fieldId, em),
    );
  }
}
