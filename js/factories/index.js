// js/factories/index.js — 공장 레지스트리 (node-safe: data-only import)
import automotive from './automotive.js';
import battery from './battery.js';
import semiconductor from './semiconductor.js';
import logistics from './logistics.js';

export const FACTORIES=[automotive,battery,semiconductor,logistics];
export const FACTORY_MAP=Object.fromEntries(FACTORIES.map(f=>[f.id,f]));
