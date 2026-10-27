import { LEVELS } from '../src/game/levels';
import { validateTrack } from '../src/track/validate';
import { createDefaultCustomTrack } from '../src/game/defaultTrack';

const rows = [...LEVELS.map((l) => ({ name: l.name, segs: l.segments() })), { name: 'Custom default', segs: createDefaultCustomTrack().segments }];
for (const r of rows) {
  const v = validateTrack(r.segs);
  const p = v.path!;
  console.log(`== ${r.name}: ok=${v.ok} len=${p?.length.toFixed(0)} minY=${p?.minHeight.toFixed(1)} maxY=${p?.maxHeight.toFixed(1)} bounds=${p ? `${p.bounds.min.x.toFixed(0)},${p.bounds.min.z.toFixed(0)}..${p.bounds.max.x.toFixed(0)},${p.bounds.max.z.toFixed(0)}` : ''}`);
  if (v.sim) console.log(`   dur=${v.sim.duration.toFixed(1)}s vmax=${(v.sim.maxSpeed * 3.6).toFixed(0)}km/h G=${v.sim.minG.toFixed(2)}..${v.sim.maxG.toFixed(2)} thrill=${v.sim.thrillPotential.toFixed(0)} stall=${v.sim.stallSegment}`);
  for (const i of v.issues) console.log('   ', i.level, i.message);
}
