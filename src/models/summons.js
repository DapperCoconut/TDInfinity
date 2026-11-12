// Humanoid summons rebuilt with the vehicle kit (2026-11-12): the people towers' style
// (makeHumanoid body + kit gear from people1.js) for the units towers send out.
// Each summonsN.js exports SUMMONS = { model: (count) => unit }. makeUnit (units.js) looks
// here first, so an entry overrides the old builder of the same name. Gold versions
// ("gold" + model) are made by goldify on these, so they need no entry.
import { SUMMONS as S1 } from './summons1.js';
import { SUMMONS as S2 } from './summons2.js';
import { SUMMONS as S3 } from './summons3.js';
import { SUMMONS as S4 } from './summons4.js';
import { SUMMONS as S5 } from './summons5.js';
import { SUMMONS as S6 } from './summons6.js';
import { SUMMONS as S7 } from './summons7.js';

export const SUMMON_MODELS = { ...S1, ...S2, ...S3, ...S4, ...S5, ...S6, ...S7 };
