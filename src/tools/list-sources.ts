import { getDatabaseMetadata, getDatabaseStats } from '../database/db.js';

export interface SourceInfo {
  name: string;
  authority: string;
  url: string;
  license: string;
  license_url: string;
  retrieval_method: string;
  update_frequency: string;
  last_ingested: string | null;
  source_commit: string | null;
  rule_count: number;
  coverage: string;
}

export function listSources(): { sources: SourceInfo[] } {
  const metadata = getDatabaseMetadata();
  const stats = getDatabaseStats();

  return {
    sources: [
      {
        name: 'SigmaHQ Detection Rules',
        authority: 'SigmaHQ Community',
        url: 'https://github.com/SigmaHQ/sigma',
        license: 'Detection Rule License (DRL)',
        license_url:
          'https://github.com/SigmaHQ/sigma/blob/master/LICENSE.Detection.Rules.md',
        retrieval_method: 'BULK_DOWNLOAD',
        update_frequency: 'weekly',
        last_ingested: metadata.build_time ?? null,
        source_commit: metadata.source_commit ?? null,
        rule_count: stats.total_rules,
        coverage:
          'All YAML rules under SigmaHQ/sigma/rules/ — Windows, Linux, macOS, cloud, network, and application log sources with MITRE ATT&CK technique mappings',
      },
    ],
  };
}
