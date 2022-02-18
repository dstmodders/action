import * as core from '@actions/core';
import * as versions from './versions';
import {
  LDoc,
  Lint,
  Test,
  busted,
  ldoc,
  luacheck,
  prettier,
  stylua,
} from './tools';
import { Input } from './input';
import { Versions } from './versions';

export interface Output {
  busted: Test;
  ldoc: LDoc;
  luacheck: Lint;
  prettier: Lint;
  stylua: Lint;
  versions: Versions;
}

export async function set(input: Input, output: Output): Promise<void> {
  if (input.ignoreSetOutput) {
    return;
  }

  core.startGroup('Set output');

  if (!input.ignoreCheckVersions) {
    await versions.setOutput(output.versions);
  }

  if (input.busted) {
    await busted.setOutput(output.busted);
  }

  if (input.ldoc) {
    await ldoc.setOutput(output.ldoc);
  }

  if (input.luacheck) {
    await luacheck.setOutput(output.luacheck);
  }

  if (input.prettier) {
    await prettier.setOutput(output.prettier);
  }

  if (input.stylua) {
    await stylua.setOutput(output.stylua);
  }

  core.endGroup();
}
