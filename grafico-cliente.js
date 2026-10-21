// Gráfico para enviar ao cliente: só o valor de cada grupo (com impostos) e a fatia do total.
// Nada de custo, imposto ou lucro aqui. Desenhado em canvas para baixar como PNG;
// a prévia na tela é a mesma imagem que é baixada.

const GC = {
  largura: 1000, margem: 48, linha: 40, barra: 22,
  fonte: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  texto: '#1f2328', suave: '#6b7078', grade: '#e1e0d9', serie: '#2a78d6',
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

async function desenharGraficoCliente(canvas) {
  const grupos = dadosGrupos().sort((a, b) => b.bruto - a.bruto);
  const total = totaisOrcamento(orc).bruto;
  const logo = await carregarImagem(logoValida(orc.logo));
  const { largura: W, margem: M, linha: L, barra: B } = GC;
  const subtitulo = [orc.cliente, dataBR(orc.data), orc.local].filter(Boolean).join('   ·   ');

  // Logo com no máximo 56 px de altura e 220 px de largura
  const lh = logo ? Math.min(56, logo.height, logo.height * 220 / logo.width) : 0;
  const lw = logo ? logo.width * lh / logo.height : 0;
  const topo = logo || orc.empresa ? Math.max(lh, 28) + 32 : 0;

  const altura = M + topo + 34 + (subtitulo ? 26 : 0) + 30 + 30 + grupos.length * L + 16 + 44 + 24 + M;
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
  ctx.fillStyle = GC.texto;
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
  ctx.fillText('Valor por grupo', M, y);
  y += 30;

  const colRotulo = 230, colPct = 64, colValor = 150;
  const x0 = M + colRotulo + 16;
  const trilha = W - M - colPct - colValor - 16 - x0;
  const maior = Math.max(...grupos.map(g => g.bruto));
  ctx.fillStyle = GC.grade;
  ctx.fillRect(x0, y, 1, grupos.length * L); // linha de base

  for (const g of grupos) {
    const meio = y + L / 2;
    fonte(400, 15);
    ctx.fillStyle = GC.texto;
    ctx.textAlign = 'left';
    ctx.fillText(cortarTexto(ctx, g.nome, colRotulo), M, meio);

    ctx.fillStyle = GC.serie;
    ctx.beginPath();
    ctx.roundRect(x0 + 1, meio - B / 2, Math.max(2, g.bruto / maior * trilha), B, [0, 4, 4, 0]);
    ctx.fill();

    ctx.textAlign = 'right';
    fonte(600, 15);
    ctx.fillStyle = GC.texto;
    ctx.fillText(moeda.format(g.bruto), W - M - colPct, meio);
    fonte(400, 14);
    ctx.fillStyle = GC.suave;
    ctx.fillText(pct(g.bruto / total), W - M, meio);
    y += L;
  }

  // Total
  y += 16;
  ctx.fillStyle = GC.texto;
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
  document.getElementById('grafico-cliente').toBlob(blob => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'grafico-' + nomeBase() + '.png';
    a.click();
    URL.revokeObjectURL(a.href);
  }, 'image/png');
});
