import * as core from '@actions/core';
import * as busted from './busted';
import * as luacheck from './luacheck';
import * as prettier from './prettier';
import * as stylua from './stylua';
import * as versions from './versions';
import { Input } from './input';
import { LDoc } from './ldoc';
import { Lint } from './lint';
import { Test } from './busted';
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
  core.startGroup('Set output');

  await versions.setOutput(output.versions);

  if (input.busted) {
    await busted.setOutput(output.busted);
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
