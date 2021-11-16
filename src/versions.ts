import * as core from '@actions/core';
import * as busted from './busted';
import * as ldoc from './ldoc';
import * as lua from './lua';
import * as luacheck from './luacheck';
import * as prettier from './prettier';
import * as stylua from './stylua';

export interface Versions {
  busted: string;
  ldoc: string;
  lua: string;
  luacheck: string;
  prettier: string;
  stylua: string;
}

export async function get(): Promise<Versions> {
  const versions: Versions = <Versions>{
    busted: '',
    ldoc: '',
    lua: '',
    luacheck: '',
    prettier: '',
    stylua: '',
  };

  versions.busted = await busted.getVersion();
  versions.ldoc = await ldoc.getVersion();
  versions.lua = await lua.getVersion();
  versions.luacheck = await luacheck.getVersion();
  versions.prettier = await prettier.getVersion();
  versions.stylua = await stylua.getVersion();

  return Promise.resolve(versions);
}

export async function check(): Promise<Versions> {
  core.startGroup('Check versions');
  const v: Versions = await get();
  core.info(`Busted: ${v.busted}`);
  core.info(`LDoc: ${v.ldoc}`);
  core.info(`Lua: ${v.lua}`);
  core.info(`Luacheck: ${v.luacheck}`);
  core.info(`Prettier: ${v.prettier}`);
  core.info(`StyLua: ${v.stylua}`);
  core.endGroup();
  return Promise.resolve(v);
}

export async function setOutput(versions: Versions): Promise<void> {
  core.setOutput('busted-version', versions.lua);
  core.setOutput('ldoc-version', versions.ldoc);
  core.setOutput('lua-version', versions.lua);
  core.setOutput('luacheck-version', versions.luacheck);
  core.setOutput('prettier-version', versions.prettier);
  core.setOutput('stylua-version', versions.stylua);
}
