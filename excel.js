// Exporta o orçamento inteiro (custo, imposto, lucro) para Excel (.xlsx), com fórmulas,
// no formato da planilha original. O .xlsx é um zip de arquivos XML, montado aqui
// sem biblioteca externa (funciona offline).

// ---------- Zip sem compressão ----------

const TABELA_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = TABELA_CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function zip(arquivos) {
  const enc = new TextEncoder();
  const partes = [], central = [];
  let pos = 0;
  for (const [nome, texto] of arquivos) {
    const n = enc.encode(nome), d = enc.encode(texto), crc = crc32(d);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // nomes em UTF-8
    local.setUint16(12, 33, true);    // data 01/01/1980
    local.setUint32(14, crc, true);
    local.setUint32(18, d.length, true);
    local.setUint32(22, d.length, true);
    local.setUint16(26, n.length, true);
    partes.push(new Uint8Array(local.buffer), n, d);

    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint16(8, 0x0800, true);
    c.setUint16(14, 33, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, d.length, true);
    c.setUint32(24, d.length, true);
    c.setUint16(28, n.length, true);
    c.setUint32(42, pos, true);
    central.push(new Uint8Array(c.buffer), n);
    pos += 30 + n.length + d.length;
  }
  const tamCentral = central.reduce((s, p) => s + p.length, 0);
  const fim = new DataView(new ArrayBuffer(22));
  fim.setUint32(0, 0x06054b50, true);
  fim.setUint16(8, arquivos.length, true);
  fim.setUint16(10, arquivos.length, true);
  fim.setUint32(12, tamCentral, true);
  fim.setUint32(16, pos, true);
  return new Blob([...partes, ...central, new Uint8Array(fim.buffer)],
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// ---------- Planilha ----------

// Estilos (índices de cellXfs em estilosXml)
const S = { normal: 0, negrito: 1, cabecalho: 2, grupo: 3, moeda: 4, pct: 5, totalMoeda: 6, totalPct: 7,
  titulo: 8, subgrupo: 9, totalTexto: 10, cabecalhoNum: 11, pctEsquerda: 12 };

const estilosXml = (marca, realce) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2"><numFmt numFmtId="164" formatCode="&quot;R$&quot; #,##0.00"/><numFmt numFmtId="165" formatCode="0.0%"/></numFmts>
<fonts count="6">
<font><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="${marca}"/><name val="Calibri"/></font>
<font><b/><sz val="14"/><color rgb="${marca}"/><name val="Calibri"/></font>
<font><i/><sz val="11"/><color rgb="FF6B7078"/><name val="Calibri"/></font>
</fonts>
<fills count="4">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="${marca}"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="${realce}"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left/><right/><top style="thin"><color rgb="${marca}"/></top><bottom/><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="13">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
<xf numFmtId="0" fontId="3" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="164" fontId="1" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>
<xf numFmtId="165" fontId="1" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>
<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="5" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/>
<xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="right"/></xf>
<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="left"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

function xml(t) {
  return String(t).replace(/[^\x09\x0a\x0d\x20-￿]/g, '')
    .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// Célula: texto, número, ou fórmula { f, v } (v = valor já calculado, mostrado antes de recalcular)
function celula(ref, valor, s) {
  if (valor == null || valor === '') return `<c r="${ref}" s="${s}"/>`;
  if (typeof valor === 'number') return `<c r="${ref}" s="${s}"><v>${valor}</v></c>`;
  if (typeof valor === 'object') {
    return typeof valor.v === 'number'
      ? `<c r="${ref}" s="${s}"><f>${xml(valor.f)}</f><v>${valor.v}</v></c>`
      : `<c r="${ref}" s="${s}" t="str"><f>${xml(valor.f)}</f><v></v></c>`;
  }
  return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${xml(valor)}</t></is></c>`;
}

// Cor do tema atual no formato do Excel: #3f0044 → FF3F0044
const argb = nome => 'FF' + corDoTema(nome).slice(1).toUpperCase();

function montarPlanilha() {
  const linhas = [];
  const add = (celulas, estilos) => {
    const n = linhas.length + 1;
    linhas.push(`<row r="${n}">${celulas.map((v, i) =>
      celula('ABCDEFGH'[i] + n, v, Array.isArray(estilos) ? estilos[i] : estilos)).join('')}</row>`);
    return n;
  };
  const pctF = n => ({ f: `IF(F${n}=0,"",G${n}/F${n})` });
  const somas = (refs, t) => ['C', 'D', 'E', 'F', 'G'].map(c =>
    ({ f: refs.length ? `SUM(${refs.map(r => r.replace(/#/g, c)).join(',')})` : '0', v: t[{ C: 'real', D: 'liquido', E: 'imposto', F: 'bruto', G: 'lucro' }[c]] }));
  const linhaTotal = (rotulo, refs, t) => {
    const n = linhas.length + 1;
    return add(['', rotulo, ...somas(refs, t), { ...pctF(n), v: t.pct ?? undefined }],
      [S.totalTexto, S.totalTexto, S.totalMoeda, S.totalMoeda, S.totalMoeda, S.totalMoeda, S.totalMoeda, S.totalPct]);
  };

  if (orc.empresa) add([orc.empresa], S.negrito);
  add([orc.identificacao || 'Orçamento'], S.titulo);
  add(['Cliente', orc.cliente], [S.negrito, S.normal]);
  add(['Data', dataBR(orc.data)], [S.negrito, S.normal]);
  add(['Horário e local', orc.local], [S.negrito, S.normal]);
  const imp = '$B$' + add(['Imposto', orc.imposto / 100], [S.negrito, S.pctEsquerda]); // editável: as fórmulas usam esta célula
  add([]);
  const cab = add(['Qtd', 'Descrição', 'Real', 'Cobrado líquido', 'Imposto', 'Cobrado bruto', 'Lucro', '% Lucro'],
    [S.cabecalho, S.cabecalho, ...Array(6).fill(S.cabecalhoNum)]);

  const totaisGrupos = [];
  for (const g of orc.grupos) {
    add([g.nome || 'Sem nome', '', '', '', '', '', '', ''], S.grupo);
    const faixas = [];
    for (const s of g.subgrupos) {
      if (s.nome) add(['', s.nome], S.subgrupo);
      const ini = linhas.length + 1;
      for (const i of s.itens) {
        const c = calcularItem(i, orc.imposto);
        const n = linhas.length + 1;
        add([i.quantidade, i.descricao, i.real, c.liquido,
          { f: `D${n}*${imp}`, v: c.imposto }, { f: `D${n}+E${n}`, v: c.bruto },
          { f: `D${n}-C${n}`, v: c.lucro }, { ...pctF(n), v: c.pct ?? undefined }],
        [S.normal, S.normal, S.moeda, S.moeda, S.moeda, S.moeda, S.moeda, S.pct]);
      }
      const fimLinhas = linhas.length;
      if (fimLinhas < ini) continue; // subgrupo sem linhas
      faixas.push(`#${ini}:#${fimLinhas}`);
      if (s.nome && g.subgrupos.length > 1)
        linhaTotal('Subtotal ' + s.nome, [`#${ini}:#${fimLinhas}`], totaisSubgrupo(s, orc.imposto));
    }
    totaisGrupos.push('#' + linhaTotal('Total do grupo', faixas, totaisGrupo(g, orc.imposto)));
    add([]);
  }
  linhaTotal('Total do orçamento', totaisGrupos, totaisOrcamento(orc));

  const folha = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
<sheetViews><sheetView workbookViewId="0"><pane ySplit="${cab}" topLeftCell="A${cab + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols><col min="1" max="1" width="16" customWidth="1"/><col min="2" max="2" width="48" customWidth="1"/><col min="3" max="7" width="17" customWidth="1"/><col min="8" max="8" width="10" customWidth="1"/></cols>
<sheetData>${linhas.join('')}</sheetData>
<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>
<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>
</worksheet>`;

  return zip([
    ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`],
    ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`],
    ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Orçamento" sheetId="1" r:id="rId1"/></sheets>
<calcPr calcId="191029" fullCalcOnLoad="1"/>
</workbook>`],
    ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`],
    ['xl/worksheets/sheet1.xml', folha],
    ['xl/styles.xml', estilosXml(argb('--marca'), argb('--realce'))],
  ]);
}

document.getElementById('btn-excel').addEventListener('click', () => {
  entregarArquivo(montarPlanilha(), nomeBase() + '.xlsx'); // app.js
});
