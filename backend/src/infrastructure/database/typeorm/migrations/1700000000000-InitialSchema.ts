import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema for criteria-system-v3.
 *
 * Creates 9 tables in dependency order, with indexes and FK constraints
 * matching docs/erd/erd.md and docs/erd/typeorm-entities.md.
 */
export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ----------------------------------------------------------------
    // 1. organizations (no FKs)
    // ----------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE organizations (
        id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
        name        varchar(255) NOT NULL,
        created_at  timestamptz  NOT NULL DEFAULT NOW(),
        updated_at  timestamptz  NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`CREATE INDEX idx_organizations_created_at ON organizations (created_at);`);

    // ----------------------------------------------------------------
    // 2. schemas (FK -> organizations)
    // ----------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE schemas (
        id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid         NOT NULL,
        name            varchar(255) NOT NULL,
        description     text         NULL,
        created_at      timestamptz  NOT NULL DEFAULT NOW(),
        updated_at      timestamptz  NOT NULL DEFAULT NOW(),
        deleted_at      timestamptz  NULL,
        CONSTRAINT fk_schemas_organization
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT
      );
    `);
    await queryRunner.query(`CREATE INDEX idx_schemas_organization_id ON schemas (organization_id);`);
    await queryRunner.query(`CREATE INDEX idx_schemas_organization_id_deleted_at ON schemas (organization_id, deleted_at);`);

    // ----------------------------------------------------------------
    // 3. fields (FK -> schemas)
    // ----------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE fields (
        id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
        schema_id    uuid         NOT NULL,
        key          varchar(255) NOT NULL,
        display_name varchar(255) NOT NULL,
        description  text         NULL,
        data_type    varchar(64)  NOT NULL,
        validation   jsonb        NULL,
        metadata     jsonb        NULL,
        created_at   timestamptz  NOT NULL DEFAULT NOW(),
        updated_at   timestamptz  NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_fields_schema
          FOREIGN KEY (schema_id) REFERENCES schemas(id) ON DELETE CASCADE,
        CONSTRAINT uq_fields_schema_id_key UNIQUE (schema_id, key)
      );
    `);
    await queryRunner.query(`CREATE INDEX idx_fields_schema_id ON fields (schema_id);`);

    // ----------------------------------------------------------------
    // 4. evaluations (FK -> organizations, schemas)
    // ----------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE evaluations (
        id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid         NOT NULL,
        schema_id       uuid         NOT NULL,
        name            varchar(255) NOT NULL,
        description     text         NULL,
        created_at      timestamptz  NOT NULL DEFAULT NOW(),
        updated_at      timestamptz  NOT NULL DEFAULT NOW(),
        deleted_at      timestamptz  NULL,
        CONSTRAINT fk_evaluations_organization
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
        CONSTRAINT fk_evaluations_schema
          FOREIGN KEY (schema_id) REFERENCES schemas(id) ON DELETE RESTRICT
      );
    `);
    await queryRunner.query(`CREATE INDEX idx_evaluations_organization_id ON evaluations (organization_id);`);
    await queryRunner.query(`CREATE INDEX idx_evaluations_organization_id_deleted_at ON evaluations (organization_id, deleted_at);`);
    await queryRunner.query(`CREATE INDEX idx_evaluations_schema_id ON evaluations (schema_id);`);

    // ----------------------------------------------------------------
    // 5. evaluation_versions (FK -> evaluations)
    // ----------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE evaluation_versions (
        id             uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
        evaluation_id  uuid         NOT NULL,
        version_number int          NOT NULL,
        status         varchar(32)  NOT NULL,
        published_at   timestamptz  NULL,
        created_at     timestamptz  NOT NULL DEFAULT NOW(),
        updated_at     timestamptz  NOT NULL DEFAULT NOW(),
        deleted_at     timestamptz  NULL,
        CONSTRAINT fk_evaluation_versions_evaluation
          FOREIGN KEY (evaluation_id) REFERENCES evaluations(id) ON DELETE CASCADE,
        CONSTRAINT uq_evaluation_versions_evaluation_id_version_number UNIQUE (evaluation_id, version_number)
      );
    `);
    await queryRunner.query(`CREATE INDEX idx_evaluation_versions_evaluation_id ON evaluation_versions (evaluation_id);`);
    await queryRunner.query(`CREATE INDEX idx_evaluation_versions_evaluation_id_status ON evaluation_versions (evaluation_id, status);`);

    // ----------------------------------------------------------------
    // 6. nodes (FK -> evaluation_versions)
    // ----------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE nodes (
        id                    uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
        evaluation_version_id uuid            NOT NULL,
        node_type             varchar(128)    NOT NULL,
        label                 varchar(255)    NOT NULL,
        config                jsonb           NOT NULL,
        position_x            double precision NOT NULL,
        position_y            double precision NOT NULL,
        created_at            timestamptz     NOT NULL DEFAULT NOW(),
        updated_at            timestamptz     NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_nodes_evaluation_version
          FOREIGN KEY (evaluation_version_id) REFERENCES evaluation_versions(id) ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`CREATE INDEX idx_nodes_evaluation_version_id ON nodes (evaluation_version_id);`);

    // ----------------------------------------------------------------
    // 7. edges (FK -> evaluation_versions, nodes x2)
    // ----------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE edges (
        id                    uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
        evaluation_version_id uuid         NOT NULL,
        from_node_id          uuid         NOT NULL,
        from_port             varchar(128) NOT NULL,
        to_node_id            uuid         NOT NULL,
        to_port               varchar(128) NOT NULL,
        execution_order       int          NOT NULL,
        created_at            timestamptz  NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_edges_evaluation_version
          FOREIGN KEY (evaluation_version_id) REFERENCES evaluation_versions(id) ON DELETE CASCADE,
        CONSTRAINT fk_edges_from_node
          FOREIGN KEY (from_node_id) REFERENCES nodes(id) ON DELETE CASCADE,
        CONSTRAINT fk_edges_to_node
          FOREIGN KEY (to_node_id) REFERENCES nodes(id) ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`CREATE INDEX idx_edges_evaluation_version_id ON edges (evaluation_version_id);`);
    await queryRunner.query(`CREATE INDEX idx_edges_from_node_id ON edges (from_node_id);`);
    await queryRunner.query(`CREATE INDEX idx_edges_to_node_id ON edges (to_node_id);`);

    // ----------------------------------------------------------------
    // 8. executions (FK -> organizations, evaluation_versions)
    // ----------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE executions (
        id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id       uuid        NOT NULL,
        evaluation_version_id uuid        NOT NULL,
        status                varchar(32) NOT NULL,
        input_values          jsonb       NOT NULL,
        final_result          jsonb       NULL,
        started_at            timestamptz NOT NULL DEFAULT NOW(),
        finished_at           timestamptz NULL,
        CONSTRAINT fk_executions_organization
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
        CONSTRAINT fk_executions_evaluation_version
          FOREIGN KEY (evaluation_version_id) REFERENCES evaluation_versions(id) ON DELETE RESTRICT
      );
    `);
    await queryRunner.query(`CREATE INDEX idx_executions_organization_id ON executions (organization_id);`);
    await queryRunner.query(`CREATE INDEX idx_executions_evaluation_version_id ON executions (evaluation_version_id);`);
    await queryRunner.query(`CREATE INDEX idx_executions_organization_id_status ON executions (organization_id, status);`);

    // ----------------------------------------------------------------
    // 9. execution_node_results (FK -> executions, nodes)
    // ----------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE execution_node_results (
        id               uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
        execution_id     uuid         NOT NULL,
        node_id          uuid         NOT NULL,
        status           varchar(32)  NOT NULL,
        value            jsonb        NULL,
        inputs_received  jsonb        NULL,
        explanation      text         NULL,
        warnings         text[]       NOT NULL DEFAULT ARRAY[]::text[],
        error            text         NULL,
        duration_ms      int          NULL,
        created_at       timestamptz  NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_execution_node_results_execution
          FOREIGN KEY (execution_id) REFERENCES executions(id) ON DELETE CASCADE,
        CONSTRAINT fk_execution_node_results_node
          FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE RESTRICT
      );
    `);
    await queryRunner.query(`CREATE INDEX idx_execution_node_results_execution_id ON execution_node_results (execution_id);`);
    await queryRunner.query(`CREATE INDEX idx_execution_node_results_node_id_status ON execution_node_results (node_id, status);`);
    await queryRunner.query(`CREATE INDEX idx_execution_node_results_node_id ON execution_node_results (node_id);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS execution_node_results;`);
    await queryRunner.query(`DROP TABLE IF EXISTS executions;`);
    await queryRunner.query(`DROP TABLE IF EXISTS edges;`);
    await queryRunner.query(`DROP TABLE IF EXISTS nodes;`);
    await queryRunner.query(`DROP TABLE IF EXISTS evaluation_versions;`);
    await queryRunner.query(`DROP TABLE IF EXISTS evaluations;`);
    await queryRunner.query(`DROP TABLE IF EXISTS fields;`);
    await queryRunner.query(`DROP TABLE IF EXISTS schemas;`);
    await queryRunner.query(`DROP TABLE IF EXISTS organizations;`);
  }
}
