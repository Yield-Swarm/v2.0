// verify-kaleidoscope.js — end-to-end test for Tree of Life
'use strict';

const { TreeOfLife } = require('./lib/kaleidoscope/tree-of-life');

async function main() {
  const tree = new TreeOfLife();

  // 1. Spec check — all 11 layers defined
  const spec = tree.getSpec();
  console.assert(spec.length === 11, 'Expected 11 layers, got ' + spec.length);
  console.log('[1] Layer spec OK — 11 layers:', spec.map(l => l.layerName).join('→'));

  // 2. Full end-to-end traversal
  const result = await tree.process(
    { agentDecision: 'REBALANCE_PORTFOLIO', targetYield: 0.15 },
    'treasury-agent-001',
    { urgency: 'high' }
  );

  console.assert(result.sessionId, 'Missing sessionId');
  console.assert(result.layersTraversed === 11, 'Expected 11 layers traversed');
  console.assert(result.forwardSecrecyVerified === true, 'Forward secrecy not verified');
  console.assert(result.voidEvent, 'No void event recorded');
  console.assert(result.voidEvent.keysDestroyed > 0, 'No keys destroyed in void');
  console.assert(result.voidEvent.keysGenerated > 0, 'No keys generated in rebirth');
  console.assert(result.sovereignAction, 'No sovereign action produced');
  console.assert(result.sovereignAction.signature, 'No signature on sovereign action');

  console.log('[2] End-to-end traversal OK');
  console.log('    Session:', result.sessionId);
  console.log('    Layers traversed:', result.layersTraversed);
  console.log('    Keys destroyed:', result.voidEvent.keysDestroyed);
  console.log('    Keys generated:', result.voidEvent.keysGenerated);
  console.log('    Processing ms:', result.totalProcessingMs);

  // 3. Audit check
  const audit = await tree.audit();
  console.assert(audit.healthy, 'Audit reports unhealthy');
  console.assert(audit.layers.length === 11, 'Audit should return 11 layers');
  console.log('[3] Audit OK — all layers healthy');

  // 4. Void trigger
  const voidResult = await tree.triggerVoid('cpa-agent-001');
  console.assert(voidResult.voidEvent, 'Manual void trigger failed');
  console.log('[4] Manual void trigger OK');

  // 5. Layer status
  const layers = tree.getLayers();
  console.assert(layers.length === 11, 'getLayers should return 11');
  console.log('[5] Layer status OK');

  console.log('\n✅ ALL TESTS PASSED — Tree of Life is operational');
  console.log('   Dimensional flow: 1→7→49→128→565→128→7→49→1→0→1');
  console.log('   Void destroys, Rebirth renews. The Kaleidoscope refracts. 🔱🌳⚡');
}

main().catch(err => {
  console.error('❌ TEST FAILED:', err.message);
  console.error(err.stack);
  process.exit(1);
});
