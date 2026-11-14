import type { A11yList, DrawTarget, Rect, TextChoice, Translator } from '@r15k/engine';
import { drawLabel, labelWidth, UI_THEME } from '@r15k/ui';
import type { ScoreEntryV1 } from '../save/save-schema.ts';
import { capHeightOf } from '../scenes/text-support.ts';
import type { ScoreBlock } from './hub-parts.ts';

/** Gap between the rank, the initials and the score of a row. */
const COLUMN_GAP = 4;

/** The rank text of a row ('1.' … '10.'). */
function rankText(index: number): string {
  return `${index + 1}.`;
}

/** Width of the widest line of the hub score list (heading included). */
export function scoreListWidth(
  entries: readonly ScoreEntryV1[],
  context: { readonly i18n: Translator; readonly text: TextChoice },
): number {
  const { i18n, text } = context;
  const rankWidth = labelWidth(rankText(9), text);
  const rows = entries.map(
    (entry) =>
      rankWidth +
      labelWidth(entry.initials, text) +
      labelWidth(i18n.formatInteger(entry.score), text) +
      3 * COLUMN_GAP,
  );
  return Math.max(labelWidth(i18n.t('arcade.hub.topScores'), text), ...rows);
}

/** Draws the heading and the first `block.rows` entries (rank, initials, right-aligned score). */
export function drawScoreList(
  target: DrawTarget,
  entries: readonly ScoreEntryV1[],
  context: { readonly block: ScoreBlock; readonly i18n: Translator; readonly text: TextChoice },
): void {
  const { block, i18n, text } = context;
  const { rect } = block;
  const cap = capHeightOf(text);
  drawLabel(target, i18n.t('arcade.hub.topScores'), {
    style: text,
    slot: UI_THEME.textAccent,
    x: rect.x,
    y: rect.y,
  });
  const rankWidth = labelWidth(rankText(9), text);
  entries.slice(0, block.rows).forEach((entry, index) => {
    const y = rect.y + cap + 4 + index * (cap + 3);
    const style = { style: text, slot: UI_THEME.text, y };
    drawLabel(target, rankText(index), { ...style, x: rect.x + rankWidth, align: 'right' });
    drawLabel(target, entry.initials, { ...style, x: rect.x + rankWidth + COLUMN_GAP });
    const score = i18n.formatInteger(entry.score);
    drawLabel(target, score, { ...style, x: rect.x + rect.width, align: 'right' });
  });
}

/** The mirror list of every stored entry (also when the pixel list is hidden on small layouts). */
export function scoreListNode(
  entries: readonly ScoreEntryV1[],
  context: { readonly i18n: Translator; readonly rect: Rect },
): A11yList {
  const { i18n } = context;
  return {
    kind: 'list',
    id: 'scores',
    rect: context.rect,
    label: i18n.t('arcade.hub.topScores'),
    items: entries.map((entry, index) => ({
      id: `score-${index + 1}`,
      label: i18n.t('arcade.a11y.topScoreEntry', {
        rank: index + 1,
        initials: entry.initials,
        score: entry.score,
      }),
    })),
  };
}
