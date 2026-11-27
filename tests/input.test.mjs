import test from 'node:test';
import assert from 'node:assert/strict';
import { parseVndAmount, formatVndInput } from '../dist/input.js';

test('Vietnamese grouping never turns 85.000 VND into 85 VND', () => {
  for (const text of ['85000', '85.000', '85,000', '85 000', '85\u00a0000', '85\u202f000', '85.000 ₫', '85.000 VND', '85.000 đ']) assert.equal(parseVndAmount(text), 85000);
  assert.equal(parseVndAmount('1.250.000'), 1250000);
  assert.equal(parseVndAmount('-1.250.000'), -1250000);
  assert.equal(parseVndAmount('+2,000'), 2000);
});

test('ambiguous fractions, mixed grouping, exponents and incomplete values fail', () => {
  for (const text of ['', ' ', '1.5', '1,50', '1.000,000', '1 00', '12.34.567', '1e5', '0x100', 'Infinity', 'NaN', '100abc', '--100', '1..000', '.000', '100.0000']) assert.throws(() => parseVndAmount(text), Error, text);
});

test('zero, negative balances, range bounds and overflow have explicit rules', () => {
  assert.equal(parseVndAmount('0'), 0);
  assert.equal(Object.is(parseVndAmount('-0'), -0), false);
  assert.equal(parseVndAmount('1.000.000.000.000'), 1000000000000);
  assert.throws(() => parseVndAmount('1.000.000.000.001'));
  assert.throws(() => parseVndAmount('9007199254740993'));
  assert.throws(() => parseVndAmount('-1000', {min: 0}));
  assert.throws(() => parseVndAmount('0', {min: 1}));
  assert.equal(parseVndAmount('1', {min: 1}), 1);
});

test('formatted edit values round-trip exactly', () => {
  for (const amount of [0, 1, 85, 85000, 1250000, -650000, 1000000000000]) assert.equal(parseVndAmount(formatVndInput(amount)), amount);
  assert.equal(formatVndInput(''), '');
});
