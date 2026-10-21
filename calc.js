// Regras de cálculo, as mesmas da planilha original:
//   imposto = líquido × taxa
//   bruto   = líquido + imposto        (valor apresentado ao cliente)
//   lucro   = líquido − real           (real vazio conta como zero)
//   % lucro = lucro ÷ bruto
// Percentuais (imposto, markup) são guardados como número: 10 = 10%.

function arred(v) {
  return Math.round(v * 100) / 100;
}

// Líquido sugerido a partir do valor real do fornecedor.
function liquidoCalculado(real, markupPct) {
  return arred((real || 0) * (1 + markupPct / 100));
}

// Líquido que resulta no bruto digitado à mão.
function liquidoDoBruto(bruto, impostoPct) {
  return arred(bruto / (1 + impostoPct / 100));
}

function calcularItem(item, impostoPct) {
  const real = item.real || 0;
  const liquido = item.liquido || 0;
  const imposto = arred(liquido * impostoPct / 100);
  const bruto = arred(liquido + imposto);
  const lucro = arred(liquido - real);
  return { real, liquido, imposto, bruto, lucro, pct: bruto ? lucro / bruto : null };
}

function somar(lista) {
  const t = { real: 0, liquido: 0, imposto: 0, bruto: 0, lucro: 0 };
  for (const v of lista) for (const k in t) t[k] = arred(t[k] + v[k]);
  t.pct = t.bruto ? t.lucro / t.bruto : null;
  return t;
}

function totaisSubgrupo(sub, impostoPct) {
  return somar(sub.itens.map(i => calcularItem(i, impostoPct)));
}

function totaisGrupo(grupo, impostoPct) {
  return somar(grupo.subgrupos.map(s => totaisSubgrupo(s, impostoPct)));
}

function totaisOrcamento(orc) {
  return somar(orc.grupos.map(g => totaisGrupo(g, orc.imposto)));
}

if (typeof module !== 'undefined') {
  module.exports = { arred, liquidoCalculado, liquidoDoBruto, calcularItem, totaisSubgrupo, totaisGrupo, totaisOrcamento };
}
