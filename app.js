// Tela de edição, abrir/salvar JSON e impressão. Cálculos ficam em calc.js.

const CHAVE_PADROES = 'orcamento-eventos:padroes';
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

let orc;
let alterado = false;

// ---------- Modelo ----------

function lerPadroes() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_PADROES)) || {};
  } catch {
    return {};
  }
}

function novoItem() {
  return { quantidade: 1, descricao: '', real: null, liquido: 0, manual: false };
}
function novoSubgrupo() {
  return { nome: '', itens: [novoItem()] };
}
function novoGrupo() {
  return { nome: '', impressao: 'detalhado', subgrupos: [novoSubgrupo()] };
}
function novoOrcamento() {
  const p = lerPadroes();
  return {
    versao: 1,
    empresa: p.empresa ?? '',
    logo: p.logo ?? null,
    identificacao: '', cliente: '', data: '', local: '',
    imposto: p.imposto ?? 10,
    markup: p.markup ?? 0,
    grupos: [novoGrupo()],
  };
}

// Itens que não foram ajustados à mão acompanham o valor real e o markup.
function recalcularAutomaticos() {
  for (const g of orc.grupos)
    for (const s of g.subgrupos)
      for (const i of s.itens)
        if (!i.manual) i.liquido = liquidoCalculado(i.real, orc.markup);
}

// ---------- Formatação ----------

function esc(t) {
  return String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// Aceita "1.234,56", "1234,56" e "1234.56".
function lerNumero(txt) {
  let t = String(txt).trim();
  if (t === '') return null;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  const n = Number(t);
  return isNaN(n) ? null : n;
}

function numCampo(v, casas = 2) {
  if (v == null) return '';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: 2 });
}

function pct(v) {
  return v == null ? '—' : (v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%';
}

function dataBR(iso) {
  return iso ? iso.split('-').reverse().join('/') : '';
}

// ---------- Tela ----------

const COLUNAS = 9;

function htmlItem(i, ii) {
  return `
    <tr data-i="${ii}">
      <td><input data-campo="quantidade" class="num curto" inputmode="decimal" value="${esc(numCampo(i.quantidade, 0))}"></td>
      <td><input data-campo="descricao" class="descricao" value="${esc(i.descricao)}" placeholder="Descrição"></td>
      <td><input data-campo="real" class="num" inputmode="decimal" value="${esc(numCampo(i.real))}" placeholder="—"></td>
      <td><input data-campo="liquido" class="num" inputmode="decimal"></td>
      <td class="num" data-v="imposto"></td>
      <td><input data-campo="bruto" class="num" inputmode="decimal"></td>
      <td class="num" data-v="lucro"></td>
      <td class="num" data-v="pct"></td>
      <td class="acoes">
        <button data-acao="recalcular" class="discreto" title="Voltar ao cálculo pelo valor real">↺</button>
        <button data-acao="item-remover" class="discreto" title="Remover linha">×</button>
      </td>
    </tr>`;
}

function htmlTotais(prefixo) {
  return ['real', 'liquido', 'imposto', 'bruto', 'lucro', 'pct']
    .map(k => `<td class="num" data-${prefixo}="${k}"></td>`).join('');
}

// Alça para arrastar + setas para subir/descer
function htmlOrdem(tipo, pos, total) {
  if (total < 2) return '';
  return `<span class="alca" draggable="true" data-alca="${tipo}" title="Arraste para mudar a ordem">⠿</span>
    <button data-acao="${tipo}-subir" class="discreto seta" title="Subir"${pos === 0 ? ' disabled' : ''}>↑</button>
    <button data-acao="${tipo}-descer" class="discreto seta" title="Descer"${pos === total - 1 ? ' disabled' : ''}>↓</button>`;
}

function htmlSubgrupo(s, si, total) {
  const unico = total === 1;
  return `
    <tbody data-s="${si}">
      <tr class="sub-cab">
        <td colspan="${COLUNAS}">
          ${htmlOrdem('sub', si, total)}
          <input data-acao="nome-sub" value="${esc(s.nome)}" placeholder="Subgrupo (opcional)">
          <button data-acao="item-novo" class="discreto">+ Linha</button>
          ${unico ? '' : '<button data-acao="sub-remover" class="discreto perigo">Remover subgrupo</button>'}
        </td>
      </tr>
      ${s.itens.map(htmlItem).join('')}
      <tr class="subtotal"${s.nome ? '' : ' hidden'}>
        <td></td><td>Subtotal ${esc(s.nome)}</td>${htmlTotais('s')}<td></td>
      </tr>
    </tbody>`;
}

function htmlGrupo(g, gi) {
  return `
    <section class="grupo" data-g="${gi}">
      <div class="grupo-cab">
        ${htmlOrdem('grupo', gi, orc.grupos.length)}
        <input data-acao="nome-grupo" class="nome-grupo" value="${esc(g.nome)}" placeholder="Nome do grupo (ex.: Decoração)">
        <label>Na impressão
          <select data-acao="impressao">
            <option value="detalhado"${g.impressao === 'detalhado' ? ' selected' : ''}>linha por linha</option>
            <option value="resumido"${g.impressao === 'resumido' ? ' selected' : ''}>valor único</option>
          </select>
        </label>
        <button data-acao="sub-novo" class="discreto">+ Subgrupo</button>
        <button data-acao="grupo-remover" class="discreto perigo">Remover grupo</button>
      </div>
      <div class="rolagem">
        <table>
          <thead><tr>
            <th>Qtd</th><th>Descrição</th><th>Real</th><th>Cobrado líquido</th><th>Imposto</th>
            <th>Cobrado bruto</th><th>Lucro</th><th>% Lucro</th><th></th>
          </tr></thead>
          ${g.subgrupos.map((s, si) => htmlSubgrupo(s, si, g.subgrupos.length)).join('')}
          <tfoot><tr><td></td><td>Total do grupo</td>${htmlTotais('g')}<td></td></tr></tfoot>
        </table>
      </div>
    </section>`;
}

function render() {
  for (const el of document.querySelectorAll('[data-cab]')) {
    const k = el.dataset.cab;
    el.value = (k === 'imposto' || k === 'markup') ? numCampo(orc[k], 0) : (orc[k] ?? '');
  }
  mostrarLogo();
  document.getElementById('grupos').innerHTML = orc.grupos.map(htmlGrupo).join('');
  atualizarNumeros();
  // Abrir/Novo com a aba de indicadores visível (renderIndicadores vem de indicadores.js)
  if (!document.getElementById('aba-indicadores').hidden) renderIndicadores();
}

function preencherTotais(raiz, prefixo, t) {
  for (const k of ['real', 'liquido', 'imposto', 'bruto', 'lucro'])
    raiz.querySelector(`[data-${prefixo}="${k}"]`).textContent = moeda.format(t[k]);
  raiz.querySelector(`[data-${prefixo}="pct"]`).textContent = pct(t.pct);
}

// Atualiza só valores calculados, sem recriar campos (o cursor fica onde está).
function atualizarNumeros() {
  const ativo = document.activeElement;
  const secoes = document.querySelectorAll('section.grupo');
  orc.grupos.forEach((g, gi) => {
    const secao = secoes[gi];
    g.subgrupos.forEach((s, si) => {
      const corpo = secao.querySelector(`tbody[data-s="${si}"]`);
      s.itens.forEach((i, ii) => {
        const linha = corpo.querySelector(`tr[data-i="${ii}"]`);
        const c = calcularItem(i, orc.imposto);
        const liq = linha.querySelector('[data-campo="liquido"]');
        const bru = linha.querySelector('[data-campo="bruto"]');
        if (liq !== ativo) liq.value = numCampo(c.liquido);
        if (bru !== ativo) bru.value = numCampo(c.bruto);
        liq.classList.toggle('manual', i.manual);
        bru.classList.toggle('manual', i.manual);
        linha.querySelector('[data-acao="recalcular"]').hidden = !i.manual;
        linha.querySelector('[data-v="imposto"]').textContent = moeda.format(c.imposto);
        linha.querySelector('[data-v="lucro"]').textContent = moeda.format(c.lucro);
        linha.querySelector('[data-v="pct"]').textContent = pct(c.pct);
      });
      preencherTotais(corpo.querySelector('.subtotal'), 's', totaisSubgrupo(s, orc.imposto));
    });
    preencherTotais(secao.querySelector('tfoot'), 'g', totaisGrupo(g, orc.imposto));
  });

  const t = totaisOrcamento(orc);
  document.getElementById('total').innerHTML = `
    <dt>Real (fornecedores)</dt><dd>${moeda.format(t.real)}</dd>
    <dt>Cobrado líquido</dt><dd>${moeda.format(t.liquido)}</dd>
    <dt>Imposto</dt><dd>${moeda.format(t.imposto)}</dd>
    <dt>Cobrado bruto</dt><dd class="destaque">${moeda.format(t.bruto)}</dd>
    <dt>Lucro</dt><dd>${moeda.format(t.lucro)} (${pct(t.pct)})</dd>`;
}

function marcarAlterado() {
  alterado = true;
}

// ---------- Eventos da tela ----------

function localizar(el) {
  const g = orc.grupos[el.closest('[data-g]')?.dataset.g];
  const s = g?.subgrupos[el.closest('[data-s]')?.dataset.s];
  const ii = el.closest('[data-i]')?.dataset.i;
  return { g, s, i: s?.itens[ii], ii: Number(ii) };
}

document.querySelector('.cabecalho').addEventListener('input', e => {
  const k = e.target.dataset.cab;
  if (!k) return;
  if (k === 'imposto' || k === 'markup') {
    orc[k] = lerNumero(e.target.value) ?? 0;
    if (k === 'markup') recalcularAutomaticos();
    atualizarNumeros();
  } else {
    orc[k] = e.target.value;
  }
  marcarAlterado();
});

const grupos = document.getElementById('grupos');

grupos.addEventListener('input', e => {
  const el = e.target;
  const { g, s, i } = localizar(el);
  if (el.dataset.acao === 'nome-grupo') g.nome = el.value;
  else if (el.dataset.acao === 'nome-sub') {
    s.nome = el.value;
    el.closest('tbody').querySelector('.subtotal').hidden = !s.nome;
  }
  else if (el.dataset.campo === 'descricao') i.descricao = el.value;
  else if (el.dataset.campo === 'quantidade') i.quantidade = lerNumero(el.value);
  else if (el.dataset.campo === 'real') {
    i.real = lerNumero(el.value);
    if (!i.manual) i.liquido = liquidoCalculado(i.real, orc.markup);
  }
  else if (el.dataset.campo === 'liquido') {
    i.liquido = lerNumero(el.value) ?? 0;
    i.manual = true;
  }
  else if (el.dataset.campo === 'bruto') {
    i.liquido = liquidoDoBruto(lerNumero(el.value) ?? 0, orc.imposto);
    i.manual = true;
  }
  else return;
  atualizarNumeros();
  marcarAlterado();
});

// Ao sair de um campo numérico, mostra o valor já formatado.
document.addEventListener('focusout', e => {
  if (e.target.classList?.contains('num')) setTimeout(() => {
    if (!e.target.isConnected) return; // a tela foi redesenhada (ex.: linha removida)
    if (e.target.dataset.cab) e.target.value = numCampo(orc[e.target.dataset.cab], 0);
    else if (e.target.dataset.campo === 'real') e.target.value = numCampo(localizar(e.target).i.real);
    else if (e.target.dataset.campo === 'quantidade') e.target.value = numCampo(localizar(e.target).i.quantidade, 0);
    else atualizarNumeros();
  });
});

grupos.addEventListener('change', e => {
  if (e.target.dataset.acao !== 'impressao') return;
  localizar(e.target).g.impressao = e.target.value;
  marcarAlterado();
});

grupos.addEventListener('click', e => {
  const acao = e.target.dataset.acao;
  if (e.target.tagName !== 'BUTTON' || !acao) return;
  const { g, s, i, ii } = localizar(e.target);
  if (acao === 'item-novo') s.itens.push(novoItem());
  else if (acao === 'item-remover') s.itens.splice(ii, 1);
  else if (acao === 'recalcular') {
    i.manual = false;
    i.liquido = liquidoCalculado(i.real, orc.markup);
  }
  else if (acao === 'sub-novo') g.subgrupos.push(novoSubgrupo());
  else if (acao === 'sub-remover') {
    if (!confirm('Remover este subgrupo e suas linhas?')) return;
    g.subgrupos.splice(g.subgrupos.indexOf(s), 1);
  }
  else if (acao === 'grupo-remover') {
    if (!confirm(`Remover o grupo "${g.nome || 'sem nome'}" e todas as suas linhas?`)) return;
    orc.grupos.splice(orc.grupos.indexOf(g), 1);
  }
  else if (/-(subir|descer)$/.test(acao)) {
    const [tipo, sentido] = acao.split('-');
    const lista = tipo === 'grupo' ? orc.grupos : g.subgrupos;
    const de = lista.indexOf(tipo === 'grupo' ? g : s);
    const para = de + (sentido === 'subir' ? -1 : 1);
    mover(lista, de, para);
    render();
    marcarAlterado();
    // Mantém o foco na mesma seta, agora na nova posição (útil pelo teclado)
    const sec = document.querySelector(`section.grupo[data-g="${tipo === 'grupo' ? para : orc.grupos.indexOf(g)}"]`);
    const alvo = (tipo === 'grupo' ? sec.querySelector('.grupo-cab') : sec.querySelector(`tbody[data-s="${para}"]`))
      .querySelector(`[data-acao="${acao}"]`);
    if (alvo && !alvo.disabled) alvo.focus();
    return;
  }
  else return;
  render();
  marcarAlterado();
});

// ---------- Reordenar grupos e subgrupos ----------

function mover(lista, de, para) {
  lista.splice(para, 0, lista.splice(de, 1)[0]);
}

// Arrastar pela alça ⠿. Subgrupos só mudam de lugar dentro do próprio grupo.
let arrasto = null;

function alvoArrasto(e) {
  if (!arrasto) return null;
  const el = arrasto.tipo === 'grupo' ? e.target.closest('section.grupo') : e.target.closest('tbody[data-s]');
  if (!el || (arrasto.tipo === 'sub' && Number(el.closest('section.grupo').dataset.g) !== arrasto.gi)) return null;
  const r = el.getBoundingClientRect();
  return { el, depois: e.clientY > r.top + r.height / 2 };
}

function limparMarcas() {
  for (const el of document.querySelectorAll('.marca-cima, .marca-baixo')) el.classList.remove('marca-cima', 'marca-baixo');
}

grupos.addEventListener('dragstart', e => {
  const alca = e.target.closest?.('[data-alca]');
  if (!alca) return;
  const sec = alca.closest('section.grupo');
  const el = alca.dataset.alca === 'grupo' ? sec : alca.closest('tbody');
  arrasto = { tipo: alca.dataset.alca, gi: Number(sec.dataset.g), si: Number(el.dataset.s), el };
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', '');
  e.dataTransfer.setDragImage(el, 24, 20);
  el.classList.add('arrastando');
});

grupos.addEventListener('dragover', e => {
  const a = alvoArrasto(e);
  if (!a) return;
  e.preventDefault();
  limparMarcas();
  // Linha indicando onde vai cair: no grupo inteiro, ou na primeira/última linha visível do subgrupo
  const marca = arrasto.tipo === 'grupo' ? a.el
    : (a.depois ? [...a.el.rows].filter(r => !r.hidden).pop() : a.el.rows[0]);
  marca.classList.add(a.depois ? 'marca-baixo' : 'marca-cima');
});

grupos.addEventListener('drop', e => {
  const a = alvoArrasto(e);
  limparMarcas();
  if (!a) return;
  e.preventDefault();
  const lista = arrasto.tipo === 'grupo' ? orc.grupos : orc.grupos[arrasto.gi].subgrupos;
  const de = arrasto.tipo === 'grupo' ? arrasto.gi : arrasto.si;
  let para = Number(arrasto.tipo === 'grupo' ? a.el.dataset.g : a.el.dataset.s) + (a.depois ? 1 : 0);
  if (para > de) para--;
  if (para === de) return;
  mover(lista, de, para);
  render();
  marcarAlterado();
});

grupos.addEventListener('dragend', () => {
  arrasto?.el.classList.remove('arrastando');
  arrasto = null;
  limparMarcas();
});

document.getElementById('btn-grupo').addEventListener('click', () => {
  orc.grupos.push(novoGrupo());
  render();
  marcarAlterado();
  document.querySelector('section.grupo:last-of-type .nome-grupo').focus();
});

document.getElementById('btn-padrao').addEventListener('click', e => {
  try {
    localStorage.setItem(CHAVE_PADROES, JSON.stringify({
      empresa: orc.empresa, logo: orc.logo, imposto: orc.imposto, markup: orc.markup,
    }));
    e.target.textContent = 'Padrão salvo ✓';
  } catch {
    e.target.textContent = 'Não foi possível salvar';
  }
  setTimeout(() => { e.target.textContent = 'Usar como padrão'; }, 2000);
});

// ---------- Logo da empresa ----------
// Fica dentro do JSON como imagem PNG embutida, reduzida para no máximo 400×200.

// Só aceita imagem embutida (arquivos de fora podem trazer qualquer texto no campo).
function logoValida(logo) {
  return typeof logo === 'string' && logo.startsWith('data:image/') ? logo : null;
}

function mostrarLogo() {
  const img = document.getElementById('logo-previa');
  const logo = logoValida(orc.logo);
  img.hidden = !logo;
  if (logo) img.src = logo; else img.removeAttribute('src');
  document.getElementById('btn-logo-remover').hidden = !logo;
  document.getElementById('btn-logo').textContent = logo ? 'Trocar…' : 'Carregar…';
}

function reduzirImagem(arquivo) {
  return new Promise((ok, falha) => {
    const img = new Image();
    img.onload = () => {
      const escala = Math.min(1, 400 / img.width, 200 / img.height);
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * escala);
      c.height = Math.round(img.height * escala);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      ok(c.toDataURL('image/png'));
    };
    img.onerror = falha;
    img.src = URL.createObjectURL(arquivo);
  });
}

document.getElementById('btn-logo').addEventListener('click', () => document.getElementById('logo-arquivo').click());

document.getElementById('logo-arquivo').addEventListener('change', async e => {
  const arquivo = e.target.files[0];
  e.target.value = '';
  if (!arquivo) return;
  try {
    orc.logo = await reduzirImagem(arquivo);
    mostrarLogo();
    marcarAlterado();
  } catch {
    alert('Não foi possível ler esta imagem.');
  }
});

document.getElementById('btn-logo-remover').addEventListener('click', () => {
  orc.logo = null;
  mostrarLogo();
  marcarAlterado();
});

// ---------- Novo / abrir / salvar ----------

function podeDescartar() {
  return !alterado || confirm('Há alterações não salvas. Descartar?');
}

document.getElementById('btn-novo').addEventListener('click', () => {
  if (!podeDescartar()) return;
  orc = novoOrcamento();
  alterado = false;
  render();
});

document.getElementById('btn-abrir').addEventListener('click', () => {
  if (podeDescartar()) document.getElementById('arquivo').click();
});

document.getElementById('arquivo').addEventListener('change', async e => {
  const arquivo = e.target.files[0];
  e.target.value = '';
  if (!arquivo) return;
  try {
    const dados = JSON.parse(await arquivo.text());
    if (!Array.isArray(dados.grupos)) throw new Error('formato');
    orc = dados;
    alterado = false;
    render();
  } catch {
    alert('Este arquivo não é um orçamento válido.');
  }
});

function nomeBase() {
  const base = (orc.identificacao || 'orcamento')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\W+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
  return base || 'orcamento';
}

function nomeArquivo() {
  return nomeBase() + '.json';
}

document.getElementById('btn-salvar').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(orc, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nomeArquivo();
  a.click();
  URL.revokeObjectURL(a.href);
  alterado = false;
});

window.addEventListener('beforeunload', e => {
  if (alterado) e.preventDefault();
});

// ---------- Impressão ----------
// Mostra só o que vai para o cliente: descrição, quantidade e valor bruto.

function temConteudo(i) {
  return i.descricao.trim() || i.liquido;
}

function htmlImpressaoGrupo(g) {
  const total = totaisGrupo(g, orc.imposto).bruto;
  const subs = g.subgrupos.map(s => ({ ...s, itens: s.itens.filter(temConteudo) })).filter(s => s.itens.length);
  if (!subs.length) return '';
  const titulo = esc(g.nome || 'Sem nome');

  if (g.impressao === 'resumido') {
    const itens = subs.flatMap(s => s.itens)
      .map(i => `<li>${i.quantidade > 1 ? numCampo(i.quantidade, 0) + ' × ' : ''}${esc(i.descricao)}</li>`).join('');
    return `
      <section class="imp-grupo">
        <h2><span>${titulo}</span><span>${moeda.format(total)}</span></h2>
        <ul>${itens}</ul>
      </section>`;
  }

  const linhas = subs.map(s => `
    ${s.nome ? `<tr class="imp-sub"><td colspan="3">${esc(s.nome)}</td></tr>` : ''}
    ${s.itens.map(i => `
      <tr><td class="num">${numCampo(i.quantidade, 0)}</td><td>${esc(i.descricao)}</td>
      <td class="num">${moeda.format(calcularItem(i, orc.imposto).bruto)}</td></tr>`).join('')}
    ${s.nome && subs.length > 1 ? `<tr class="imp-subtotal"><td></td><td>Subtotal ${esc(s.nome)}</td>
      <td class="num">${moeda.format(totaisSubgrupo(s, orc.imposto).bruto)}</td></tr>` : ''}`).join('');
  return `
    <section class="imp-grupo">
      <h2><span>${titulo}</span><span>${moeda.format(total)}</span></h2>
      <table>
        <thead><tr><th class="num">Qtd</th><th>Descrição</th><th class="num">Valor</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table>
    </section>`;
}

function montarImpressao() {
  const campos = [['Cliente', orc.cliente], ['Data', dataBR(orc.data)], ['Horário e local', orc.local]]
    .filter(([, v]) => v).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('');
  const logo = logoValida(orc.logo);
  const empresa = (logo || orc.empresa) ? `
    <div class="imp-empresa">
      ${logo ? `<img src="${esc(logo)}" alt="">` : ''}
      ${orc.empresa ? `<strong>${esc(orc.empresa)}</strong>` : ''}
    </div>` : '';
  document.getElementById('impressao').innerHTML = `
    ${empresa}
    <header>
      <h1>${esc(orc.identificacao || 'Orçamento')}</h1>
      <dl>${campos}</dl>
    </header>
    ${orc.grupos.map(htmlImpressaoGrupo).join('')}
    <p class="imp-total"><span>Total</span><span>${moeda.format(totaisOrcamento(orc).bruto)}</span></p>
    <p class="imp-nota">Valores com impostos inclusos.</p>`;
}

window.addEventListener('beforeprint', montarImpressao);
document.getElementById('btn-imprimir').addEventListener('click', () => window.print());

// ---------- Início ----------

orc = novoOrcamento();
render();
