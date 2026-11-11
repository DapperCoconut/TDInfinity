// The order wheel: right-click a tower or the ground for a ring of things to do, or to ask your
// teammates for. Bots do what they're asked (see bot/bot.js); everyone sees the order in chat and
// as a marker on the map. These are methods of GameClient: game.js puts them on the class.

/** Is player `id` a bot? (The hub names them bot1, bot2...) */
export const isBot = (id) => String(id).startsWith('bot');

export class GameWheel {

  /** Opens the wheel at screen point (cx, cy) for whatever is under the mouse. */
  openWheel(cx, cy) {
    if (!this.session || this.ended || this.fps || this.spectating) return;
    this.ui.hideWheel();
    const hit = this.pickAny();
    const t = hit?.kind === 'tower' ? this.state.towers.get(hit.id) : null;
    this.pickGround();
    const at = this.hasGround ? { x: this.groundHit.x, z: this.groundHit.z } : null;
    const items = this.wheelItems(t, at);
    if (!items.length) return;
    this.cancelPlace();
    if (this.aiming) this.stopAim();
    this.ordering = null;
    this.ui.showWheel(cx, cy, items, (key) => this.wheelPick(key, t, at));
  }

  /** What the wheel offers for tower `t` (or the ground at `at`). */
  wheelItems(t, at) {
    const mp = this.session.mp;
    const me = this.session.myId;
    const items = [];
    if (t && t.owner === me) {
      items.push({ key: 'upgrade', label: 'Upgrade', icon: '⬆️', hint: 'E' }, { key: 'sell', label: 'Sell', icon: '💰', hint: 'X' }, { key: 'target', label: 'Targeting', icon: '🎯', hint: 'T' });
      if (mp) items.push({ key: 'look', label: 'Look here!', icon: '📣' });
    } else if (t && isBot(t.owner)) {
      items.push({ key: 'bot-upgrade', label: 'Upgrade it', icon: '🤖' }, { key: 'bot-move', label: 'Move it…', icon: '🤖' }, { key: 'bot-sell', label: 'Sell it', icon: '🤖' });
    } else if (t && mp) {
      items.push({ key: 'ask-upgrade', label: 'Upgrade this?', icon: '📣' }, { key: 'look', label: 'Look here!', icon: '📣' });
    } else if (!t && mp && at) {
      items.push({ key: 'build', label: 'Build here!', icon: '📣' }, { key: 'defend', label: 'Need defense!', icon: '📣' }, { key: 'farm', label: 'Farm up!', icon: '📣' }, { key: 'save', label: 'Save cash!', icon: '📣' });
    }
    return items;
  }

  wheelPick(key, t, at) {
    this.ui.hideWheel();
    const s = this.session;
    switch (key) {
      case 'upgrade':
      case 'sell':
      case 'target':
        this.select(t.id);
        this.towerAction(key);
        return;
      case 'bot-upgrade':
      case 'ask-upgrade':
        return s.command({ cmd: 'upgrade', id: t.id, x: t.x, z: t.z });
      case 'bot-sell':
        return s.command({ cmd: 'sell', id: t.id, x: t.x, z: t.z });
      case 'bot-move':
        // The next click on the ground says where.
        this.ordering = { cmd: 'move', id: t.id };
        this.ui.toast('Click where it should go');
        return;
      case 'look':
        return s.command({ cmd: 'look', id: t?.id, x: t ? t.x : at.x, z: t ? t.z : at.z });
      default:
        return s.command({ cmd: key, x: at.x, z: at.z });
    }
  }

  /** A click while an order waits for a spot ("Move it…"): sends it there. */
  tryOrder() {
    const o = this.ordering;
    this.ordering = null;
    this.ring.visible = false;
    this.pickGround();
    if (!this.hasGround) return;
    this.session.command({ cmd: o.cmd, id: o.id, x: this.groundHit.x, z: this.groundHit.z });
  }
}
