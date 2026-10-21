// Aba de indicadores: números-resumo e gráficos por grupo do orçamento aberto.
// Usa orc, moeda, pct e esc de app.js e os totais de calc.js.

const PARTES = [
  ['real', 'Custo dos fornecedores', 'var(--serie-1)'],
  ['imposto', 'Imposto', 'var(--serie-2)'],
  ['lucro', 'Lucro', 'var(--serie-3)'],
];

let indicadores = []; // grupos com valor, na ordem do gráfico de composição

function dadosGrupos() {
  return orc.grupos
    .map(g => ({ nome: g.nome || 'Sem nome', ...totaisGrupo(g, orc.imposto) }))
    .filter(g => g.bruto > 0);
}

function htmlKpi(rotulo, valor, nota = '', classe = '') {
  return `<div class="kpi ${classe}"><div class="rotulo">${rotulo}</div>
    <div class="valor">${valor}</div>${nota ? `<div class="nota">${nota}</div>` : ''}</div>`;
}

// Barra empilhada: custo + imposto + lucro = valor ao cliente.
function htmlComposicao(g, gi, maior, total) {
  const soma = PARTES.reduce((s, [k]) => s + Math.max(g[k], 0), 0);
  const segs = PARTES.map(([k, , cor]) => g[k] > 0
    ? `<span class="seg" style="flex-grow:${g[k]};background:${cor}"></span>` : '').join('');
  return `
    <div class="linha-graf" tabindex="0" data-gi="${gi}">
      <span class="rot">${esc(g.nome)}</span>
      <span class="trilha"><span class="barra-emp" style="width:${soma / maior * 100}%">${segs}</span></span>
      <span class="val">${moeda.format(g.bruto)} <small>${pct(g.bruto / total)}</small></span>
    </div>`;
}

// Barra de % de lucro, partindo do zero (para a esquerda se negativo).
function htmlPct(g, gi, min, max, media) {
  const pos = v => (v - min) / (max - min) * 100;
  const zero = pos(0), fim = pos(g.pct);
  return `
    <div class="linha-graf" tabindex="0" data-gi="${gi}">
      <span class="rot">${esc(g.nome)}</span>
      <span class="trilha">
        <span class="barra-pct${g.pct < 0 ? ' negativa' : ''}" style="left:${Math.min(zero, fim)}%;width:${Math.abs(fim - zero)}%"></span>
        <span class="media" style="left:${pos(media)}%"></span>
      </span>
      <span class="val">${pct(g.pct)}</span>
    </div>`;
}

function renderIndicadores() {
  const el = document.getElementById('aba-indicadores');
  const t = totaisOrcamento(orc);
  indicadores = dadosGrupos().sort((a, b) => b.bruto - a.bruto);

  if (!indicadores.length) {
    el.innerHTML = '<p class="vazio">Preencha valores no orçamento para ver os indicadores.</p>';
    return;
  }

  const maior = Math.max(...indicadores.map(g => PARTES.reduce((s, [k]) => s + Math.max(g[k], 0), 0)));
  const pcts = indicadores.map(g => g.pct).concat(t.pct);
  const min = Math.min(0, ...pcts), max = Math.max(...pcts, 0.01);
  const porPct = indicadores.map((g, gi) => ({ g, gi })).sort((a, b) => b.g.pct - a.g.pct);

  el.innerHTML = `
    <h2 class="titulo-ind">${esc(orc.identificacao || 'Orçamento sem identificação')}</h2>

    <div class="kpis">
      ${htmlKpi('Valor ao cliente', moeda.format(t.bruto), '', 'heroi')}
      ${htmlKpi('Custo dos fornecedores', moeda.format(t.real), pct(t.bruto ? t.real / t.bruto : null) + ' do valor')}
      ${htmlKpi('Imposto', moeda.format(t.imposto), pct(t.bruto ? t.imposto / t.bruto : null) + ' do valor')}
      ${htmlKpi('Lucro', moeda.format(t.lucro), pct(t.pct) + ' do valor')}
    </div>

    <section class="cartao">
      <h3>Valor ao cliente por grupo</h3>
      <p class="sub">Cada barra mostra para onde vai o valor do grupo. À direita, o valor e a fatia do total.</p>
      <ul class="legenda">${PARTES.map(([, n, cor]) => `<li><i style="background:${cor}"></i>${n}</li>`).join('')}</ul>
      <div class="grafico composicao">${indicadores.map((g, gi) => htmlComposicao(g, gi, maior, t.bruto)).join('')}</div>
    </section>

    <section class="cartao">
      <h3>% de lucro por grupo</h3>
      <p class="sub">Lucro ÷ valor ao cliente. A linha vertical marca o % do evento inteiro (${pct(t.pct)}).</p>
      <div class="grafico pct">${porPct.map(({ g, gi }) => htmlPct(g, gi, min, max, t.pct)).join('')}</div>
    </section>

    <section class="cartao">
      <div class="cartao-cab">
        <div>
          <h3>Gráfico para o cliente</h3>
          <p class="sub">Só o valor de cada grupo e a fatia do total, com impostos inclusos. Sem custo, imposto nem lucro.</p>
        </div>
        <button id="btn-baixar-grafico" class="principal">Baixar imagem</button>
      </div>
      <canvas id="grafico-cliente" class="grafico-cliente"></canvas>
    </section>

    <details class="cartao">
      <summary>Ver em tabela</summary>
      <div class="rolagem">
        <table>
          <thead><tr><th>Grupo</th><th class="num">Valor ao cliente</th><th class="num">% do total</th>
            <th class="num">Custo</th><th class="num">Imposto</th><th class="num">Lucro</th><th class="num">% lucro</th></tr></thead>
          <tbody>${indicadores.map(g => `<tr><td>${esc(g.nome)}</td><td class="num">${moeda.format(g.bruto)}</td>
            <td class="num">${pct(g.bruto / t.bruto)}</td><td class="num">${moeda.format(g.real)}</td>
            <td class="num">${moeda.format(g.imposto)}</td><td class="num">${moeda.format(g.lucro)}</td>
            <td class="num">${pct(g.pct)}</td></tr>`).join('')}</tbody>
          <tfoot><tr><td>Total</td><td class="num">${moeda.format(t.bruto)}</td><td class="num">100%</td>
            <td class="num">${moeda.format(t.real)}</td><td class="num">${moeda.format(t.imposto)}</td>
            <td class="num">${moeda.format(t.lucro)}</td><td class="num">${pct(t.pct)}</td></tr></tfoot>
        </table>
      </div>
    </details>`;
  desenharGraficoCliente(document.getElementById('grafico-cliente')); // grafico-cliente.js
}

// ---------- Dica ao passar o mouse ou focar uma linha do gráfico ----------

const dica = document.getElementById('dica');

function mostrarDica(linha, x, y) {
  const g = indicadores[linha.dataset.gi];
  dica.replaceChildren();
  const titulo = document.createElement('div');
  titulo.className = 'dica-titulo';
  titulo.textContent = g.nome;
  dica.append(titulo);
  const linhas = [...PARTES.map(([k, n, cor]) => [moeda.format(g[k]), n, cor]),
    [pct(g.pct), '% de lucro', null], [moeda.format(g.bruto), 'Valor ao cliente', null]];
  for (const [valor, nome, cor] of linhas) {
    const l = document.createElement('div');
    l.className = 'dica-linha';
    const chave = document.createElement('i');
    if (cor) chave.style.background = cor;
    const v = document.createElement('strong');
    v.textContent = valor;
    const n = document.createElement('span');
    n.textContent = nome;
    l.append(chave, v, n);
    dica.append(l);
  }
  dica.hidden = false;
  const r = dica.getBoundingClientRect();
  dica.style.left = Math.min(x + 14, innerWidth - r.width - 8) + 'px';
  dica.style.top = Math.min(y + 14, innerHeight - r.height - 8) + 'px';
}

const abaInd = document.getElementById('aba-indicadores');
abaInd.addEventListener('pointermove', e => {
  const linha = e.target.closest('.linha-graf');
  if (linha) mostrarDica(linha, e.clientX, e.clientY);
  else dica.hidden = true;
});
abaInd.addEventListener('pointerleave', () => { dica.hidden = true; });
abaInd.addEventListener('focusin', e => {
  const linha = e.target.closest('.linha-graf');
  if (!linha) return;
  const r = linha.querySelector('.trilha').getBoundingClientRect();
  mostrarDica(linha, r.left + r.width / 2, r.bottom);
});
abaInd.addEventListener('focusout', () => { dica.hidden = true; });

// ---------- Abas ----------

document.querySelector('.abas').addEventListener('click', e => {
  const aba = e.target.dataset.aba;
  if (!aba) return;
  for (const b of document.querySelectorAll('.abas [data-aba]'))
    b.setAttribute('aria-selected', b.dataset.aba === aba);
  document.getElementById('aba-orcamento').hidden = aba !== 'orcamento';
  abaInd.hidden = aba !== 'indicadores';
  dica.hidden = true;
  if (aba === 'indicadores') renderIndicadores();
});
