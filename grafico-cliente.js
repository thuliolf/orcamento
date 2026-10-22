// Gráfico para enviar ao cliente: valores com impostos e a fatia do total, na ordem da tela.
// Segue o "Na impressão" de cada grupo, como o relatório: "valor único" vira uma barra só;
// "linha por linha" mostra o total do grupo e uma barra por item.
// Nada de custo, imposto ou lucro aqui. Desenhado em canvas para baixar como PNG;
// a prévia na tela é a mesma imagem que é baixada.

const GC = {
  largura: 1000, margem: 48, linha: 40, barra: 22,
  fonte: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  texto: '#1f2328', suave: '#6b7078', // serie, marca e grade vêm da identidade visual ao desenhar
};

function carregarImagem(src) {
  return new Promise(ok => {
    if (!src) return ok(null);
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => ok(null);
    i.src = src;
  });
}

function cortarTexto(ctx, t, max) {
  if (ctx.measureText(t).width <= max) return t;
  while (t && ctx.measureText(t + '…').width > max) t = t.slice(0, -1);
  return t + '…';
}

// Linhas do gráfico. Itens sem valor ficam de fora (não têm barra).
function linhasGraficoCliente() {
  const linhas = [];
  for (const g of orc.grupos) {
    const valor = totaisGrupo(g, orc.imposto).bruto;
    if (valor <= 0) continue;
    const nome = g.nome || 'Sem nome';
    if (g.impressao === 'resumido') { linhas.push({ tipo: 'grupo', nome, valor, barra: true }); continue; }
    linhas.push({ tipo: 'titulo', nome, valor, barra: false });
    for (const s of g.subgrupos)
      for (const i of s.itens) {
        const v = calcularItem(i, orc.imposto).bruto;
        if (v > 0) linhas.push({ tipo: 'item', nome: i.descricao.trim() || 'Sem descrição', valor: v, barra: true });
      }
  }
  return linhas;
}

async function desenharGraficoCliente(canvas) {
  const linhas = linhasGraficoCliente();
  const ALTURA = { grupo: GC.linha, titulo: 40, item: 34 };
  const altLinhas = linhas.reduce((s, l) => s + ALTURA[l.tipo], 0);
  const total = totaisOrcamento(orc).bruto;
  const logo = await carregarImagem(logoValida(orc.logo));
  const { largura: W, margem: M, barra: B } = GC;
  // Cores da identidade visual atual (identidade.js / style.css)
  GC.serie = corDoTema('--acento'); GC.marca = corDoTema('--marca'); GC.grade = corDoTema('--grade');
  const subtitulo = [orc.cliente, dataBR(orc.data), orc.local].filter(Boolean).join('   ·   ');

  // Logo com no máximo 56 px de altura e 220 px de largura
  const lh = logo ? Math.min(56, logo.height, logo.height * 220 / logo.width) : 0;
  const lw = logo ? logo.width * lh / logo.height : 0;
  const topo = logo || orc.empresa ? Math.max(lh, 28) + 32 : 0;

  const altura = M + topo + 34 + (subtitulo ? 26 : 0) + 30 + 30 + altLinhas + 16 + 44 + 24 + M;
  const escala = 2; // imagem nítida em telas de alta densidade e impressa
  canvas.width = W * escala;
  canvas.height = altura * escala;
  const ctx = canvas.getContext('2d');
  ctx.scale(escala, escala);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, altura);
  ctx.textBaseline = 'middle';
  const fonte = (peso, px) => { ctx.font = `${peso} ${px}px ${GC.fonte}`; };

  let y = M;

  // Empresa
  if (topo) {
    const meio = y + Math.max(lh, 28) / 2;
    if (logo) ctx.drawImage(logo, M, meio - lh / 2, lw, lh);
    if (orc.empresa) {
      fonte(600, 20);
      ctx.fillStyle = GC.texto;
      ctx.fillText(cortarTexto(ctx, orc.empresa, W - 2 * M - lw - 16), M + (logo ? lw + 16 : 0), meio);
    }
    y += Math.max(lh, 28) + 16;
    ctx.fillStyle = GC.grade;
    ctx.fillRect(M, y, W - 2 * M, 1);
    y += 16;
  }

  // Orçamento
  fonte(700, 26);
  ctx.fillStyle = GC.marca;
  ctx.fillText(cortarTexto(ctx, orc.identificacao || 'Orçamento', W - 2 * M), M, y + 15);
  y += 34;
  if (subtitulo) {
    fonte(400, 15);
    ctx.fillStyle = GC.suave;
    ctx.fillText(cortarTexto(ctx, subtitulo, W - 2 * M), M, y + 12);
    y += 26;
  }

  // Gráfico
  y += 30;
  fonte(600, 16);
  ctx.fillStyle = GC.texto;
  ctx.fillText('Valores', M, y);
  y += 30;

  const colRotulo = 320, colPct = 64, colValor = 150;
  const x0 = M + colRotulo + 16;
  const trilha = W - M - colPct - colValor - 16 - x0;
  const maior = Math.max(...linhas.filter(l => l.barra).map(l => l.valor), 1);

  // Logo como marca-d'água no fundo da área do gráfico (barras + total), bem clara
  if (logo) {
    const areaH = Math.max(altLinhas + 76, 160);
    const e = Math.min((W - 2 * M) * 0.5 / logo.width, areaH * 0.8 / logo.height);
    ctx.globalAlpha = 0.08;
    ctx.drawImage(logo, (W - logo.width * e) / 2, y + (areaH - logo.height * e) / 2, logo.width * e, logo.height * e);
    ctx.globalAlpha = 1;
  }

  for (const l of linhas) {
    const h = ALTURA[l.tipo];
    const meio = l.tipo === 'titulo' ? y + h - 15 : y + h / 2; // título fica perto dos seus itens
    const recuo = l.tipo === 'item' ? 16 : 0;
    const peso = l.tipo === 'item' ? 400 : 600;
    const tamanho = l.tipo === 'item' ? 14 : 15;

    fonte(peso, tamanho);
    ctx.fillStyle = l.tipo === 'titulo' ? GC.marca : GC.texto;
    ctx.textAlign = 'left';
    const largRotulo = l.barra ? colRotulo - recuo : x0 - M; // título sem barra usa a largura toda
    ctx.fillText(cortarTexto(ctx, l.nome, largRotulo), M + recuo, meio);

    if (l.barra) {
      const b = l.tipo === 'item' ? B - 6 : B;
      ctx.fillStyle = GC.grade;
      ctx.fillRect(x0, y, 1, h); // linha de base
      ctx.fillStyle = GC.serie;
      ctx.beginPath();
      ctx.roundRect(x0 + 1, meio - b / 2, Math.max(2, l.valor / maior * trilha), b, [0, 4, 4, 0]);
      ctx.fill();
    } else {
      ctx.fillStyle = GC.grade;
      ctx.fillRect(M, meio + 13, W - 2 * M, 1); // separa o título do grupo dos seus itens
    }

    ctx.textAlign = 'right';
    fonte(l.tipo === 'item' ? 400 : 600, tamanho);
    ctx.fillStyle = GC.texto;
    ctx.fillText(moeda.format(l.valor), W - M - colPct, meio);
    fonte(400, 14);
    ctx.fillStyle = GC.suave;
    ctx.fillText(pct(l.valor / total), W - M, meio);
    y += h;
  }

  // Total
  y += 16;
  ctx.fillStyle = GC.marca;
  ctx.fillRect(M, y, W - 2 * M, 2);
  y += 24;
  fonte(700, 20);
  ctx.textAlign = 'left';
  ctx.fillText('Total', M, y);
  ctx.textAlign = 'right';
  ctx.fillText(moeda.format(total), W - M, y);
  y += 32;
  fonte(400, 13);
  ctx.textAlign = 'left';
  ctx.fillStyle = GC.suave;
  ctx.fillText('Valores com impostos inclusos.', M, y);
}

document.addEventListener('click', e => {
  if (e.target.id !== 'btn-baixar-grafico') return;
  // Gera a imagem na hora do toque (sem esperar), senão o iPhone não abre o menu de compartilhar
  const dados = atob(document.getElementById('grafico-cliente').toDataURL('image/png').split(',')[1]);
  const bytes = Uint8Array.from(dados, c => c.charCodeAt(0));
  entregarArquivo(new Blob([bytes], { type: 'image/png' }), 'grafico-' + nomeBase() + '.png'); // app.js
});
