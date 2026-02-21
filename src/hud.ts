import { GameState, DamageType } from './types';
import { PAL } from './palette';

const DAMAGE_TYPE_NAMES: Record<DamageType, string> = {
  [DamageType.SLASH]: 'SLASH',
  [DamageType.THRUST]: 'THRUST',
  [DamageType.BLUNT]: 'BLUNT',
};

export function renderHUD(ctx: CanvasRenderingContext2D, state: GameState, w: number, h: number): void {
  const { player, weapon, messages, floor, gameOver } = state;

  ctx.save();

  // ── Health bar (top-left) ──
  const hx = 16;
  const hy = 16;
  const barW = 180;
  const barH = 18;

  ctx.fillStyle = PAL.hudBg;
  ctx.fillRect(hx - 4, hy - 4, barW + 8, barH + 24);

  ctx.fillStyle = PAL.healthBarBg;
  ctx.fillRect(hx, hy, barW, barH);

  const pct = Math.max(0, player.health / player.maxHealth);
  ctx.fillStyle = pct > 0.3 ? PAL.healthBar : PAL.damageText;
  ctx.fillRect(hx, hy, barW * pct, barH);

  ctx.fillStyle = PAL.hudTextBright;
  ctx.font = '13px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`HP: ${Math.max(0, player.health)}/${player.maxHealth}`, hx + 4, hy + 14);

  // ── Weapon info (bottom-left) ──
  const wx = 16;
  const wy = h - 60;

  ctx.fillStyle = PAL.hudBg;
  ctx.fillRect(wx - 4, wy - 4, 200, 52);

  ctx.fillStyle = PAL.hudTextBright;
  ctx.font = '13px monospace';
  ctx.fillText(weapon.name, wx, wy + 14);

  const dtype = DAMAGE_TYPE_NAMES[weapon.damageType];
  const broken = weapon.durability <= 0 ? ' [BROKEN]' : '';
  ctx.fillStyle = weapon.durability <= 0 ? PAL.damageText : PAL.hudText;
  ctx.font = '11px monospace';
  ctx.fillText(`${dtype} | DMG:${weapon.baseDamage}${broken}`, wx, wy + 28);

  // Durability bar
  const dpct = weapon.durability / weapon.maxDurability;
  ctx.fillStyle = PAL.durabilityBarBg;
  ctx.fillRect(wx, wy + 34, 140, 8);
  ctx.fillStyle = dpct > 0.3 ? PAL.durabilityBar : PAL.damageText;
  ctx.fillRect(wx, wy + 34, 140 * dpct, 8);

  // ── Floor number (top-right) ──
  ctx.fillStyle = PAL.hudBg;
  ctx.fillRect(w - 100, 12, 88, 28);
  ctx.fillStyle = PAL.hudTextBright;
  ctx.font = '14px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`Floor ${floor}`, w - 20, 32);

  // ── Narrative messages (top-center) ──
  const visibleMessages = messages.filter((m) => m.timer > 0).slice(-5);
  if (visibleMessages.length > 0) {
    const mx = w / 2;
    const startY = 24;
    const lineH = 22;
    const totalH = visibleMessages.length * lineH + 8;

    // Subtle background panel
    ctx.fillStyle = 'rgba(10, 10, 20, 0.6)';
    ctx.fillRect(mx - 280, startY - 16, 560, totalH);

    ctx.textAlign = 'center';
    ctx.font = 'italic 14px monospace';
    for (let i = 0; i < visibleMessages.length; i++) {
      const msg = visibleMessages[i]!;
      const alpha = Math.min(1, msg.timer / 1500);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = PAL.narrativeText;
      ctx.fillText(msg.text, mx, startY + i * lineH);
    }
    ctx.globalAlpha = 1;
  }

  // ── Game over overlay ──
  if (gameOver) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = PAL.damageText;
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('YOU DIED', w / 2, h / 2 - 20);

    ctx.fillStyle = PAL.hudText;
    ctx.font = '16px monospace';
    ctx.fillText('Press R to restart', w / 2, h / 2 + 20);
  }

  ctx.restore();
}

export function updateMessages(state: GameState, dt: number): void {
  for (const msg of state.messages) {
    msg.timer -= dt * 1000;
  }
  // Remove expired
  state.messages = state.messages.filter((m) => m.timer > 0);
}
