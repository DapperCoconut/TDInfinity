import { GameClient } from './game.js';
import { Lobby } from './lobby.js';
import { Net } from './net.js';
import { audio } from './audio.js';
import { profile } from './profile.js';
import { DIFFICULTIES } from './config.js';

const net = new Net();
const lobby = new Lobby(net);
const client = new GameClient(document.getElementById('game'), lobby.clientHooks());
lobby.client = client;
client.onLiminal = () => lobby.startLiminal(); // Liminal contract: walked into Sunken Canyon's glitchy pit
lobby.show('title');

// Music plays everywhere, menus included, but a browser only lets a page make sound after a click
// or a key press: the first one anywhere starts it.
for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, () => audio.unlock(), { capture: true });

// Handy for debugging in the browser console.
window.td = { client, net, lobby, audio };

// Konami code (↑ ↑ ↓ ↓ ← → ← → B A): infinite cash in a game; in the menus, infinite credits and
// shards, and every event tower unlocked.
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
let konami = 0;
window.addEventListener('keydown', (e) => {
  // A wrong key restarts the sequence (extra ↑ presses keep the ↑ ↑ already typed).
  if (e.code === KONAMI[konami]) konami++;
  else konami = e.code === 'ArrowUp' ? Math.min(konami, 2) || 1 : 0;
  if (konami < KONAMI.length) return;
  konami = 0;
  if (client.session) {
    // In a game: infinite cash for this round (the sim confirms with a 'konami' event).
    if (!client.ended) client.session.send({ a: 'konami' });
    return;
  }
  // In the menus: infinite credits for the shop and infinite Dimension Shards for alternate forms.
  profile.credits = Infinity;
  profile.shards = Infinity;
  profile.gems = Infinity;
  for (const k of Object.keys(DIFFICULTIES)) if (!profile.beaten.includes(k) && k !== 'hardcore') profile.beaten.push(k); // opens Hardcore
  profile.unlockEvents(); // also saves
  audio.upgrade();
  lobby.renderDifficulty?.();
  lobby.toast('∞ credits, ∞ Dimension Shards, ∞ Gems, Hardcore and every event tower unlocked!');
});
