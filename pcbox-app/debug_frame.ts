// Quick debug script to check frame analysis values against PDF
// Run with: npx tsx debug_frame.ts

import { defaultInput } from './src/utils/constants';
import { calcDeadLoad, calcLiveLoad1, calcLiveLoad2 } from './src/calc/loads';
import { runFrameAnalysis } from './src/calc/frame';

const input = defaultInput;
const deadLoad = calcDeadLoad(input);
const liveLoad1 = calcLiveLoad1(input);
const liveLoad2 = calcLiveLoad2(input);

console.log('=== LOAD VALUES ===');
console.log('Dead load totalV:', deadLoad.totalV.toFixed(2), '(PDF: 226.64)');
console.log('Dead load qLeft:', deadLoad.groundReaction.qLeft.toFixed(2), 'qRight:', deadLoad.groundReaction.qRight.toFixed(2));
console.log('Live1 Pvl:', liveLoad1.Pvl.toFixed(2), '(PDF: 13.72)');

const { deadForces, live1Forces, live2Forces } = runFrameAnalysis(input, deadLoad, liveLoad1, liveLoad2);

function printMemberForces(name: string, mf: any) {
  const points = ['leftEnd', 'haunchLeft', 'd2Left', 'midspan', 'd2Right', 'haunchRight', 'rightEnd'];
  const M = points.map((p: string) => mf[p].M.toFixed(1));
  const N = points.map((p: string) => mf[p].N.toFixed(1));
  const S = points.map((p: string) => mf[p].S.toFixed(1));
  console.log(`  ${name}:`);
  console.log(`    M = [${M.join(', ')}]`);
  console.log(`    N = [${N.join(', ')}]`);
  console.log(`    S = [${S.join(', ')}]`);
}

console.log('\n=== DEAD LOAD (Case 1) ===');
console.log('PDF:');
console.log('  Top:    M=[-34.0, -7.4, 2.4, 44.2, 2.4, -7.4, -34.0], N=48.3, S=[97.6,...,-97.6]');
console.log('  LWall:  M=[-34.0, -20.8, -19.6, 1.5, -22.0, -23.5, -40.4], N=[97.6..113.3], S=[-48.3..64.3]');
console.log('  RWall:  M=[-34.0, -20.8, -19.6, 1.5, -22.0, -23.5, -40.4], N=[97.6..113.3], S=[48.3..-64.3]');
console.log('  Bottom: M=[-40.4, -9.6, 1.8, 50.3, 1.8, -9.6, -40.4], N=64.3, S=[-113.3..113.3]');
console.log('Ours:');
printMemberForces('Top slab', deadForces.topSlab);
printMemberForces('Left wall', deadForces.leftWall);
printMemberForces('Right wall', deadForces.rightWall);
printMemberForces('Bottom', deadForces.bottomSlab);

console.log('\n=== LIVE LOAD 1 (Case 2) ===');
console.log('PDF:');
console.log('  Top:    M=[-6.9, 0.3, 2.3, 8.4, 2.3, 0.3, -6.9], N=0.0, S=[21.9,...,-21.9]');
console.log('  LWall:  M=[-6.9, -4.2, -3.9, 0.3, -4.5, -4.8, -8.1], N=[21.9..25.5], S=[0.0..0.0]');
console.log('  Bottom: M=[-8.1, -1.9, 0.4, 10.1, 0.4, -1.9, -8.1], N=0.0, S=[-25.5..25.5]');
console.log('Ours:');
printMemberForces('Top slab', live1Forces.topSlab);
printMemberForces('Left wall', live1Forces.leftWall);
printMemberForces('Right wall', live1Forces.rightWall);
printMemberForces('Bottom', live1Forces.bottomSlab);

console.log('\n=== LIVE LOAD 2 (Case 3) ===');
console.log('PDF:');
console.log('  Top:    M=[1.8, 0.7, 0.4, -1.5, 0.4, 0.7, 1.8], N=6.9, S=[0.0..0.0]');
console.log('  LWall:  M=[1.8, 1.1, 1.0, -0.2, 1.1, 1.2, 1.8], N=[0.0..0.0], S=[-6.9..6.9]');
console.log('Ours:');
printMemberForces('Top slab', live2Forces.topSlab);
printMemberForces('Left wall', live2Forces.leftWall);
printMemberForces('Right wall', live2Forces.rightWall);
printMemberForces('Bottom', live2Forces.bottomSlab);
