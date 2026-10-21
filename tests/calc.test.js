// Rodar com: node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert');
const c = require('../calc.js');

test('linha com real e cobrado: imposto sobre o líquido, lucro e %', () => {
  const r = c.calcularItem({ real: 1000, liquido: 1500 }, 10);
  assert.deepStrictEqual(
    { imposto: r.imposto, bruto: r.bruto, lucro: r.lucro },
    { imposto: 150, bruto: 1650, lucro: 500 }
  );
  assert.strictEqual(r.pct, 500 / 1650);
});

test('sem valor real, o lucro é o líquido inteiro', () => {
  const r = c.calcularItem({ real: null, liquido: 4000 }, 10);
  assert.strictEqual(r.lucro, 4000);
});

test('linha vazia não divide por zero', () => {
  assert.strictEqual(c.calcularItem({ real: null, liquido: 0 }, 10).pct, null);
});

test('líquido calculado pelo markup sobre o real', () => {
  assert.strictEqual(c.liquidoCalculado(1000, 30), 1300);
  assert.strictEqual(c.liquidoCalculado(1000, 0), 1000);
  assert.strictEqual(c.liquidoCalculado(null, 30), 0);
});

test('bruto digitado à mão volta exatamente pelo cálculo', () => {
  const liq = c.liquidoDoBruto(9000, 10);
  assert.strictEqual(liq, 8181.82);
  assert.strictEqual(c.calcularItem({ real: 0, liquido: liq }, 10).bruto, 9000);
});

test('totais por subgrupo, grupo e orçamento', () => {
  const orc = {
    imposto: 10,
    grupos: [
      { subgrupos: [
        { itens: [{ real: 100, liquido: 200 }, { real: 50, liquido: 50 }] },
        { itens: [{ real: null, liquido: 300 }] },
      ] },
      { subgrupos: [{ itens: [{ real: 400, liquido: 500 }] }] },
    ],
  };
  assert.strictEqual(c.totaisSubgrupo(orc.grupos[0].subgrupos[0], 10).bruto, 275);
  const g = c.totaisGrupo(orc.grupos[0], 10);
  assert.deepStrictEqual([g.real, g.liquido, g.imposto, g.bruto, g.lucro], [150, 550, 55, 605, 400]);
  const t = c.totaisOrcamento(orc);
  assert.deepStrictEqual([t.real, t.liquido, t.bruto, t.lucro], [550, 1050, 1155, 500]);
  assert.strictEqual(t.pct, 500 / 1155);
});
