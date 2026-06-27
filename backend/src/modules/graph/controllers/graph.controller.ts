import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseInterceptors, HttpCode, HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { DataSource } from 'typeorm';
import { GraphUseCases } from '../use-cases/graph.use-cases';
import { OrgContextInterceptor } from '@infrastructure/auth/org-context.interceptor';
import { CreateNodeDto, UpdateNodeDto, CreateEdgeDto } from '../dto/graph.dto';

@Controller('versions/:vId/graph')
@UseInterceptors(OrgContextInterceptor)
export class GraphController {
  constructor(
    private readonly useCases: GraphUseCases,
    private readonly dataSource: DataSource,
  ) {}

  @Get()
  async getGraph(@Param('vId') vId: string, @Req() req: Request) {
    return this.dataSource.transaction((em) =>
      this.useCases.getGraph(req.user!.organizationId as never, vId as never, em),
    );
  }

  @Post('nodes')
  @HttpCode(HttpStatus.CREATED)
  async createNode(
    @Param('vId') vId: string,
    @Body() dto: CreateNodeDto,
    @Req() req: Request,
  ) {
    return this.dataSource.transaction((em) =>
      this.useCases.createNode(req.user!.organizationId as never, vId as never, dto, em),
    );
  }

  @Put('nodes/:nodeId')
  async updateNode(
    @Param('vId') vId: string,
    @Param('nodeId') nodeId: string,
    @Body() dto: UpdateNodeDto,
    @Req() req: Request,
  ) {
    return this.dataSource.transaction((em) =>
      this.useCases.updateNode(req.user!.organizationId as never, vId as never, nodeId as never, dto, em),
    );
  }

  @Delete('nodes/:nodeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteNode(
    @Param('vId') vId: string,
    @Param('nodeId') nodeId: string,
    @Req() req: Request,
  ) {
    return this.dataSource.transaction((em) =>
      this.useCases.deleteNode(req.user!.organizationId as never, vId as never, nodeId as never, em),
    );
  }

  @Post('edges')
  @HttpCode(HttpStatus.CREATED)
  async createEdge(
    @Param('vId') vId: string,
    @Body() dto: CreateEdgeDto,
    @Req() req: Request,
  ) {
    return this.dataSource.transaction((em) =>
      this.useCases.createEdge(req.user!.organizationId as never, vId as never, dto, em),
    );
  }

  @Delete('edges/:edgeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEdge(
    @Param('vId') vId: string,
    @Param('edgeId') edgeId: string,
    @Req() req: Request,
  ) {
    return this.dataSource.transaction((em) =>
      this.useCases.deleteEdge(req.user!.organizationId as never, vId as never, edgeId as never, em),
    );
  }

  @Post('validate')
  async validateGraph(@Param('vId') vId: string, @Req() req: Request) {
    return this.dataSource.transaction((em) =>
      this.useCases.validateGraph(req.user!.organizationId as never, vId as never, em),
    );
  }
}
