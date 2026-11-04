import { expect, test } from 'vitest';
import { formatInteger, interpolate } from './format.ts';

test.each([
  [0, '0', '0'],
  [7, '7', '7'],
  [999, '999', '999'],
  [1000, '1.000', '1,000'],
  [12_345, '12.345', '12,345'],
  [1_234_567, '1.234.567', '1,234,567'],
  [-4321, '-4.321', '-4,321'],
  [12.6, '13', '13'],
  [-0.2, '0', '0'],
])('formatInteger(%d) is %j in German and %j in English', (value, de, en) => {
  expect(formatInteger('de', value)).toBe(de);
  expect(formatInteger('en', value)).toBe(en);
});

test('non-finite values stay visible', () => {
  expect(formatInteger('en', Number.NaN)).toBe('NaN');
  expect(formatInteger('de', Number.POSITIVE_INFINITY)).toBe('Infinity');
});

test('interpolate fills every placeholder and formats numbers per locale', () => {
  const template = '{name} hat {score} Punkte, {name}!';
  expect(interpolate(template, { name: 'R15', score: 12_345 }, 'de')).toBe(
    'R15 hat 12.345 Punkte, R15!',
  );
  expect(interpolate('{score} points', { score: 12_345 }, 'en')).toBe('12,345 points');
});

test('a placeholder without a parameter stays in the text', () => {
  expect(interpolate('HI {score}', {}, 'en')).toBe('HI {score}');
  expect(interpolate('no placeholders', { score: 1 }, 'en')).toBe('no placeholders');
});

test('string parameters are inserted as they are, digits included', () => {
  expect(interpolate('{rank}.', { rank: '10000' }, 'de')).toBe('10000.');
});
