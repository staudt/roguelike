import { GameState, DamageType } from './types';
import { PAL } from './palette';
import { getXPForLevel, getXPForNextLevel } from './progression';
import { getWeaponDef } from './items';
import { StatusEffectType } from './status';

const DAMAGE_TYPE_NAMES: Record<DamageType, string> = {
  [DamageType.SLASH]: 'SLASH',
  [DamageType.THRUST]: 'THRUST',
  [DamageType.BLUNT]: 'BLUNT',
};

export function renderHUD(ctx: CanvasRenderingContext2D, state: GameState, w: number, h: number): void {
  const { player, inventory, messages, floor, gameOver } = state;

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

  // ── Dog health bar (below player health) ──
  if (state.dog && state.dog.alive) {
    const dy = hy + barH + 8;

    ctx.fillStyle = PAL.hudBg;
    ctx.fillRect(hx - 4, dy - 4, barW + 8, barH + 24);

    ctx.fillStyle = PAL.healthBarBg;
    ctx.fillRect(hx, dy, barW, barH);

    const dogPct = Math.max(0, state.dog.health / state.dog.maxHealth);
    ctx.fillStyle = dogPct > 0.3 ? PAL.dog : PAL.damageText;
    ctx.fillRect(hx, dy, barW * dogPct, barH);

    ctx.fillStyle = PAL.hudTextBright;
    ctx.font = '13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`DOG Lv${state.dog.level}: ${Math.max(0, state.dog.health)}/${state.dog.maxHealth}`, hx + 4, dy + 14);
  }

  // ── Status effects row (below HP and dog bars) ──
  {
    const baseStatusY = state.dog && state.dog.alive ? hy + barH + 8 + barH + 8 : hy + barH + 8;
    if (state.playerStatusEffects.length > 0) {
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'left';
      let sry = baseStatusY;
      for (const eff of state.playerStatusEffects) {
        let label: string;
        let color: string;
        if (eff.type === StatusEffectType.PARALYZED) {
          label = `[PARALYZED ${(eff.duration / 1000).toFixed(1)}s]`;
          color = '#6699ff';
        } else if (eff.type === StatusEffectType.IN_PIT) {
          label = '[TRAPPED IN PIT]';
          color = '#cc8844';
        } else if (eff.type === StatusEffectType.POISONED) {
          label = `[POISONED ${(eff.duration / 1000).toFixed(1)}s]`;
          color = '#44cc55';
        } else if (eff.type === StatusEffectType.BLINDED) {
          label = `[BLINDED ${(eff.duration / 1000).toFixed(1)}s]`;
          color = '#ffcc33';
        } else {
          label = `[SLOWED ${(eff.duration / 1000).toFixed(1)}s]`;
          color = '#aaaaaa';
        }
        const textW = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(10,10,20,0.7)';
        ctx.fillRect(hx - 4, sry - 2, textW + 8, 14);
        ctx.fillStyle = color;
        ctx.fillText(label, hx, sry + 10);
        sry += 16;
      }
    }
  }

  // ── XP bar + Level (below health bars) ──
  {
    const statusRowH = state.playerStatusEffects.length * 16;
    const xpY = (state.dog && state.dog.alive ? hy + barH + 8 + barH + 8 : hy + barH + 8) + statusRowH;
    const xpBarH = 10;

    ctx.fillStyle = PAL.hudBg;
    ctx.fillRect(hx - 4, xpY - 4, barW + 8, xpBarH + 34);

    ctx.fillStyle = PAL.hudTextBright;
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Lv.${state.playerLevel}`, hx, xpY + 10);

    const labelW = 36;
    const xpBarX = hx + labelW;
    const xpBarW = barW - labelW;

    const currentLevelXP = getXPForLevel(state.playerLevel);
    const nextLevelXP = getXPForNextLevel(state.playerLevel);
    const xpInLevel = state.playerXP - currentLevelXP;
    const xpNeeded = nextLevelXP - currentLevelXP;
    const xpPct = xpNeeded > 0 ? Math.min(1, xpInLevel / xpNeeded) : 1;

    ctx.fillStyle = PAL.healthBarBg;
    ctx.fillRect(xpBarX, xpY, xpBarW, xpBarH);

    ctx.fillStyle = '#ffdd44';
    ctx.fillRect(xpBarX, xpY, xpBarW * xpPct, xpBarH);

    ctx.fillStyle = PAL.hudText;
    ctx.font = '9px monospace';
    ctx.fillText(`${state.playerXP} XP`, xpBarX + 2, xpY + 8);

    // Attributes line
    const attrY = xpY + xpBarH + 4;
    const { str, dex, con, search } = state.playerAttributes;
    ctx.fillStyle = PAL.narrativeText;
    ctx.font = '10px monospace';
    ctx.fillText(`STR ${str}  DEX ${dex}  CON ${con}  SCH ${search}`, hx, attrY + 8);
  }

  // ── Weapon info (bottom-left) ──
  const wx = 16;
  const wy = h - 60;
  const weaponInstance = inventory.equipped.weapon;
  const weaponDef = weaponInstance ? getWeaponDef(weaponInstance.defId) : null;

  ctx.fillStyle = PAL.hudBg;
  ctx.fillRect(wx - 4, wy - 4, 200, 52);

  if (weaponDef && weaponInstance) {
    const durability = weaponInstance.durability ?? 0;
    const maxDurability = weaponDef.maxDurability;

    ctx.fillStyle = PAL.hudTextBright;
    ctx.font = '13px monospace';
    ctx.fillText(weaponDef.name, wx, wy + 14);

    const dtype = DAMAGE_TYPE_NAMES[weaponDef.damageType];
    const broken = durability <= 0 ? ' [BROKEN]' : '';
    ctx.fillStyle = durability <= 0 ? PAL.damageText : PAL.hudText;
    ctx.font = '11px monospace';
    ctx.fillText(`${dtype} | DMG:${weaponDef.baseDamage}${broken}`, wx, wy + 28);

    // Durability bar
    const dpct = maxDurability > 0 ? durability / maxDurability : 0;
    ctx.fillStyle = PAL.durabilityBarBg;
    ctx.fillRect(wx, wy + 34, 140, 8);
    ctx.fillStyle = dpct > 0.3 ? PAL.durabilityBar : PAL.damageText;
    ctx.fillRect(wx, wy + 34, 140 * dpct, 8);
  } else {
    ctx.fillStyle = PAL.hudText;
    ctx.font = '13px monospace';
    ctx.fillText('No weapon', wx, wy + 14);
  }

  // ── Floor / Branch (top-right) ──
  const branchLabel = state.progress.branch === 'main' ? '' : `${state.progress.branch.charAt(0).toUpperCase() + state.progress.branch.slice(1)} `;
  const floorLabel = `${branchLabel}F${floor}`;
  ctx.fillStyle = PAL.hudBg;
  ctx.fillRect(w - 120, 12, 108, 28);
  ctx.fillStyle = PAL.hudTextBright;
  ctx.font = '14px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(floorLabel, w - 20, 32);

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
