/**
 * JSDocコメントからメタデータを自動抽出
 */

import * as path from 'path';
import { CheckMetadata } from './types';

interface JSDocTags {
  what?: string;
  why?: string;
  failure?: string;
}

/**
 * ファイルパスとJSDocコメントからメタデータを生成
 */
export function extractMetadata(filePath: string, jsDoc: string): CheckMetadata {
  const tags = parseJSDoc(jsDoc);

  // ファイルパスから layer と id を自動生成
  const relativePath = filePath.split('/policy/horizontal/static/')[1];
  const parts = relativePath?.split('/') || [];
  const workspace = parts[0]; // server, web, infra
  const layer = parts[1]; // domain-model, use-case, etc.
  const fileName = path.basename(filePath, '.ts');

  const id = `${workspace}/${layer}/${fileName}`;

  return {
    id,
    name: fileName.replace(/-/g, ' '),
    description: tags.what || '',
    layer: layer || '',
    what: tags.what || '',
    why: tags.why || '',
    failure: tags.failure || '',
  };
}

/**
 * JSDocコメントをパースしてタグを抽出
 */
function parseJSDoc(jsDoc: string): JSDocTags {
  const tags: JSDocTags = {};

  const whatMatch = jsDoc.match(/@what\s+(.+)/);
  if (whatMatch) tags.what = whatMatch[1].trim();

  const whyMatch = jsDoc.match(/@why\s+(.+)/);
  if (whyMatch) tags.why = whyMatch[1].trim();

  const failureMatch = jsDoc.match(/@failure\s+(.+)/);
  if (failureMatch) tags.failure = failureMatch[1].trim();

  return tags;
}
