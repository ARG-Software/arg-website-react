import { flattenJsonToText } from '../extractors/flattenjson.js';
import { createSource } from '../../../application/ingestion/source.factory.js';
import type { IProjectJson } from '../sitedata.types.js';
import type { IRagSource } from '../../../domain/sources/ragsource.types.js';
import { readJsonFile, resolveRoot } from './loaderfiles.js';

export async function loadProjectSources(rootDir: string, relativeFilePath: string): Promise<IRagSource[]> {
  const filePath = resolveRoot(rootDir, relativeFilePath);
  const projects = await readJsonFile<IProjectJson[]>(filePath);

  return projects.map(project =>
    createSource({
      sourceType: 'project',
      sourceKey: project.slug,
      title: project.title,
      url: `/projects/${project.slug}/`,
      path: filePath,
      metadata: {
        source_file: filePath,
        client: project.client,
        category: project.subtitle,
        live_link: project.liveLink,
        reference_rank: project.referenceRank,
      },
      content: flattenJsonToText(project, `project ${project.title}`),
    })
  );
}
