import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seeds the TikTok Creator reference use case for development and integration tests.
 *
 * Fixed UUIDs for stable references across test runs.
 *
 *   orgId       = 00000000-0000-0000-0000-000000000001
 *   schemaId    = 00000000-0000-0000-0000-000000000010
 *   evaluationId= 00000000-0000-0000-0000-000000000020
 *   versionId   = 00000000-0000-0000-0000-000000000021
 *
 * Reference graph (per docs/rule_engine_prompt.md § Reference Use Case):
 *
 *   [Input: followers]      → [Normalize: 0–10]  ─┐
 *   [Input: engagement_rate]                       ├→ [WeightedAverage: 0.3/0.5/0.2]
 *   [Input: growth_rate]                           ┘      → [Threshold: <5 → REJECT]
 *                                                      → [Output: score + decision]
 */
export class SeedTiktokCreator1700000010000 implements MigrationInterface {
  name = 'SeedTiktokCreator1700000010000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Fixed UUIDs for stable test references.
    const orgId = '00000000-0000-0000-0000-000000000001';
    const schemaId = '00000000-0000-0000-0000-000000000010';
    const evaluationId = '00000000-0000-0000-0000-000000000020';
    const versionId = '00000000-0000-0000-0000-000000000021';

    const inputFollowersId = '00000000-0000-0000-0000-000000000100';
    const inputEngagementId = '00000000-0000-0000-0000-000000000101';
    const inputGrowthId = '00000000-0000-0000-0000-000000000102';
    const normalizeId = '00000000-0000-0000-0000-000000000110';
    const weightedAvgId = '00000000-0000-0000-0000-000000000120';
    const thresholdId = '00000000-0000-0000-0000-000000000130';
    const outputId = '00000000-0000-0000-0000-000000000140';

    // ---- organization ----
    await queryRunner.query(
      `INSERT INTO organizations (id, name)
       VALUES ($1, 'Acme Creators')
       ON CONFLICT (id) DO NOTHING;`,
      [orgId],
    );

    // ---- schema ----
    await queryRunner.query(
      `INSERT INTO schemas (id, organization_id, name, description)
       VALUES ($1, $2, 'TikTok Creator', 'Reference schema for TikTok creator evaluation.')
       ON CONFLICT (id) DO NOTHING;`,
      [schemaId, orgId],
    );

    // ---- fields ----
    const fields = [
      { key: 'followers', display_name: 'Followers', data_type: 'number', description: 'Total follower count' },
      { key: 'engagement_rate', display_name: 'Engagement Rate', data_type: 'percentage', description: 'Average engagement per post' },
      { key: 'growth_rate', display_name: 'Growth Rate', data_type: 'percentage', description: 'Monthly follower growth rate' },
      { key: 'country', display_name: 'Country', data_type: 'string', description: 'Primary audience country' },
    ];
    for (const f of fields) {
      await queryRunner.query(
        `INSERT INTO fields (schema_id, key, display_name, data_type, description)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (schema_id, key) DO NOTHING;`,
        [schemaId, f.key, f.display_name, f.data_type, f.description],
      );
    }

    // ---- evaluation ----
    await queryRunner.query(
      `INSERT INTO evaluations (id, organization_id, schema_id, name, description)
       VALUES ($1, $2, $3, 'Creator Quality Score', 'Scores a TikTok creator for partnership decisions.')
       ON CONFLICT (id) DO NOTHING;`,
      [evaluationId, orgId, schemaId],
    );

    // ---- evaluation_version (published, v1) ----
    await queryRunner.query(
      `INSERT INTO evaluation_versions (id, evaluation_id, version_number, status, published_at)
       VALUES ($1, $2, 1, 'PUBLISHED', NOW())
       ON CONFLICT (id) DO NOTHING;`,
      [versionId, evaluationId],
    );

    // ---- nodes ----
    const nodes = [
      // 3 input nodes
      { id: inputFollowersId, type: 'input', label: 'Followers', config: { fieldKey: 'followers' }, pos: [0, 0] },
      { id: inputEngagementId, type: 'input', label: 'Engagement Rate', config: { fieldKey: 'engagement_rate' }, pos: [0, 120] },
      { id: inputGrowthId, type: 'input', label: 'Growth Rate', config: { fieldKey: 'growth_rate' }, pos: [0, 240] },
      // 1 normalize
      { id: normalizeId, type: 'normalize', label: 'Normalize Followers', config: { min: 0, max: 5_000_000, outMin: 0, outMax: 10 }, pos: [240, 0] },
      // 1 weighted_average
      { id: weightedAvgId, type: 'weighted_average', label: 'Weighted Score', config: { weights: [0.3, 0.5, 0.2] }, pos: [480, 80] },
      // 1 threshold
      { id: thresholdId, type: 'threshold', label: 'Threshold', config: { threshold: 5, belowValue: 'REJECT', aboveOrEqualValue: 'APPROVE' }, pos: [720, 80] },
      // 1 output
      { id: outputId, type: 'output', label: 'Result', config: { fields: ['score', 'decision'] }, pos: [960, 80] },
    ];
    for (const n of nodes) {
      await queryRunner.query(
        `INSERT INTO nodes (id, evaluation_version_id, node_type, label, config, position_x, position_y)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
         ON CONFLICT (id) DO NOTHING;`,
        [n.id, versionId, n.type, n.label, JSON.stringify(n.config), n.pos[0], n.pos[1]],
      );
    }

    // ---- edges ----
    const edges = [
      // normalize takes followers
      { from: inputFollowersId, fromPort: 'value', to: normalizeId, toPort: 'value', order: 1 },
      // weighted_average takes normalize-out, engagement-input, growth-input
      { from: normalizeId, fromPort: 'normalized', to: weightedAvgId, toPort: 'a', order: 2 },
      { from: inputEngagementId, fromPort: 'value', to: weightedAvgId, toPort: 'b', order: 3 },
      { from: inputGrowthId, fromPort: 'value', to: weightedAvgId, toPort: 'c', order: 4 },
      // threshold takes weighted_average
      { from: weightedAvgId, fromPort: 'result', to: thresholdId, toPort: 'value', order: 5 },
      // output takes threshold result (decision)
      { from: thresholdId, fromPort: 'result', to: outputId, toPort: 'decision', order: 6 },
      // output also takes weighted_average result (score) — same source, different output port
      { from: weightedAvgId, fromPort: 'result', to: outputId, toPort: 'score', order: 7 },
    ];
    let i = 0;
    for (const e of edges) {
      i += 1;
      const edgeId = `00000000-0000-0000-0000-00000000020${i}`;
      await queryRunner.query(
        `INSERT INTO edges (id, evaluation_version_id, from_node_id, from_port, to_node_id, to_port, execution_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING;`,
        [edgeId, versionId, e.from, e.fromPort, e.to, e.toPort, e.order],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const ids = [
      '00000000-0000-0000-0000-000000000140',
      '00000000-0000-0000-0000-000000000130',
      '00000000-0000-0000-0000-000000000120',
      '00000000-0000-0000-0000-000000000110',
      '00000000-0000-0000-0000-000000000102',
      '00000000-0000-0000-0000-000000000101',
      '00000000-0000-0000-0000-000000000100',
    ];
    for (const id of ids) {
      await queryRunner.query(`DELETE FROM nodes WHERE id = $1;`, [id]);
    }
    await queryRunner.query(`DELETE FROM evaluation_versions WHERE id = '00000000-0000-0000-0000-000000000021';`);
    await queryRunner.query(`DELETE FROM evaluations WHERE id = '00000000-0000-0000-0000-000000000020';`);
    await queryRunner.query(`DELETE FROM fields WHERE schema_id = '00000000-0000-0000-0000-000000000010';`);
    await queryRunner.query(`DELETE FROM schemas WHERE id = '00000000-0000-0000-0000-000000000010';`);
    await queryRunner.query(`DELETE FROM organizations WHERE id = '00000000-0000-0000-0000-000000000001';`);
  }
}
