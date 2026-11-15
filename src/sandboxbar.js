// Sandbox mode's bar under the health bar: pick a mode and a wave, summon it, summon a Dummy, or
// (after five warnings) the Dummy King. `send` sends an action to the sim.

import { sandboxSources } from './config.js';

const WARNINGS = [
  'The Dummy King is the strongest boss in the game.',
  'His nuke drops your base to 1 health the moment he arrives.',
  'His sword smashes your towers. His nukes wipe out whole parts of the map.',
  'He calls in Imperfect Dummies with huge health.',
  'If he gets through, you lose. Are you sure?',
];

export class SandboxBar {
  constructor(send) {
    this.send = send;
    this.sources = sandboxSources();
    const el = (this.el = document.createElement('div'));
    el.id = 'sandbox-bar';
    el.className = 'interactive';
    el.innerHTML = `
      <select class="sb-mode" title="Difficulty">${this.sources.map((s) => `<option value="${s.key}">${s.name}</option>`).join('')}</select>
      <select class="sb-wave" title="Wave"></select>
      <button class="btn sb-summon">Summon</button>
      <button class="btn sb-dummy">Dummy</button>
      <button class="btn sb-king">👑 Dummy King</button>
      <button class="btn sb-clear" title="Remove every enemy">Clear</button>`;
    document.getElementById('top').appendChild(el);
    this.mode = el.querySelector('.sb-mode');
    this.wave = el.querySelector('.sb-wave');
    this.mode.onchange = () => {
      this.fillWaves();
      this.mode.blur();
    };
    this.wave.onchange = () => this.wave.blur();
    this.fillWaves();
    el.querySelector('.sb-summon').onclick = () => this.send({ a: 'sbSummon', src: this.mode.value, wave: Number(this.wave.value) });
    el.querySelector('.sb-dummy').onclick = () => this.send({ a: 'sbDummy' });
    el.querySelector('.sb-clear').onclick = () => this.send({ a: 'sbClear' });
    el.querySelector('.sb-king').onclick = () => this.warn();
  }

  fillWaves() {
    const src = this.sources.find((s) => s.key === this.mode.value);
    this.wave.innerHTML = Array.from({ length: src?.waves ?? 0 }, (_, i) => `<option value="${i}">Wave ${i + 1}</option>`).join('');
  }

  /** Five warning buttons, each pressed on its own; the last one sends the Dummy King. */
  warn() {
    if (this.pop) return;
    const pop = (this.pop = document.createElement('div'));
    pop.id = 'sb-warn';
    pop.className = 'interactive';
    pop.innerHTML = `<div class="sb-warn-box"><div class="sb-warn-title">⚠ SUMMON THE DUMMY KING? ⚠</div>
      ${WARNINGS.map((w, i) => `<button class="btn sb-warn-btn" data-i="${i}">⚠ ${w}</button>`).join('')}
      <button class="btn sb-warn-cancel">Cancel</button></div>`;
    document.body.appendChild(pop);
    let left = WARNINGS.length;
    for (const b of pop.querySelectorAll('.sb-warn-btn')) {
      b.onclick = () => {
        if (b.disabled) return;
        b.disabled = true;
        b.classList.add('done');
        if (--left === 0) {
          this.closeWarn();
          this.send({ a: 'sbKing' });
        }
      };
    }
    pop.querySelector('.sb-warn-cancel').onclick = () => this.closeWarn();
  }

  closeWarn() {
    this.pop?.remove();
    this.pop = null;
  }

  dispose() {
    this.closeWarn();
    this.el.remove();
  }
}
