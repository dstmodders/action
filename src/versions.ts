import * as core from '@actions/core';
import * as lua from './lua';
import * as luacheck from './luacheck';
import * as prettier from './prettier';
import * as stylua from './stylua';

interface Versions {
  lua: string;
  luacheck: string;
  prettier: string;
  stylua: string;
}

async function get(): Promise<Versions> {
  const versions: Versions = <Versions>{
    lua: '',
    luacheck: '',
    prettier: '',
    stylua: '',
  };

  core.startGroup('Check versions');
  versions.lua = await lua.getVersion();
  versions.luacheck = await luacheck.getVersion();
  versions.prettier = await prettier.getVersion();
  versions.stylua = await stylua.getVersion();

  return Promise.resolve(versions);
}

async function setOutput(versions: Versions): Promise<void> {
  core.setOutput('lua-version', versions.lua);
  core.setOutput('luacheck-version', versions.luacheck);
  core.setOutput('prettier-version', versions.prettier);
  core.setOutput('stylua-version', versions.stylua);
}

export { Versions, get, setOutput };
