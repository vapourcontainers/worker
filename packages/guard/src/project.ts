import { readFile } from 'node:fs/promises';
import YAML from 'yaml';

export default async function loadProject(path = 'project.yml'): Promise<IProject> {
  return YAML.parse(await readFile(path, 'utf-8'));
}

export interface IProject {
  footages: IFootage[];
  targets: ITarget[];
  upload: IUpload;
}

export interface IFootage {
  source: string;
  target: string;
}

export interface ITarget {
  script: string;
  output: string;
}

export interface IUpload {
  prefix: string;
}
