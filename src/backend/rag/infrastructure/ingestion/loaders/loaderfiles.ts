import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { IIngestionRunOptions } from '../../../application/ingestion/iingestion.types.js';

export async function readJsonFile<T = unknown>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

export function resolveRoot(rootDir: string, filePath: string): string {
  return path.join(rootDir, filePath);
}

export function samePath(left: string, right: string): boolean {
  const normalizedLeft = normalizePath(left);
  const normalizedRight = normalizePath(right);
  return (
    normalizedLeft === normalizedRight ||
    normalizedLeft.endsWith(normalizedRight) ||
    normalizedRight.endsWith(normalizedLeft)
  );
}

export function isPathInDirectory(rootDir: string, filePath: string, directoryPath: string): boolean {
  const resolvedFilePath = path.resolve(rootDir, filePath);
  const resolvedDirectoryPath = path.resolve(rootDir, directoryPath);
  const relativePath = path.relative(resolvedDirectoryPath, resolvedFilePath);

  return !relativePath || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

export function matchesFileSelection(filePath: string, selection: IIngestionRunOptions | undefined): boolean {
  return (
    !selection ||
    selection.all ||
    selection.filePaths.length === 0 ||
    selection.sourceKeys.length > 0 ||
    selection.filePaths.some(selectedFilePath => samePath(selectedFilePath, filePath))
  );
}

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/^\.\//, '');
}
