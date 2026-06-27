import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Schema } from '../../infrastructure/database/typeorm/entities/schema.entity';
import { Field } from '../../infrastructure/database/typeorm/entities/field.entity';
import { SchemaController } from './controllers/schema.controller';
import { SchemaUseCases } from './use-cases/schema.use-cases';

@Module({
  imports: [TypeOrmModule.forFeature([Schema, Field])],
  controllers: [SchemaController],
  providers: [SchemaUseCases],
})
export class SchemaModule {}
