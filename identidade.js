// Identidade visual a partir da logo carregada: escolhe duas cores da imagem
// (principal = a mais escura, destaque = a outra), ajusta para manter a leitura
// e aplica nas variáveis do style.css. Sem logo, ou logo só em tons de cinza,
// valem as cores padrão do style.css.

// As cores dos gráficos de indicadores (--serie-*) ficam fixas, para nunca repetir cor entre custo, imposto e lucro.
const VARS_IDENTIDADE = ['--marca', '--acento', '--faixa', '--fundo', '--linha', '--grade', '--realce'];

// ---------- Conversões de cor ----------

const rgbHex = c => '#' + c.map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('');
const linear = v => (v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
const gama = v => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

function oklab([r, g, b]) {
  [r, g, b] = [r, g, b].map(linear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
}

function rgbDeOklab([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s].map(v => Math.round(Math.min(255, Math.max(0, gama(v)))));
}

const distancia = (x, y) => Math.hypot(...oklab(x).map((v, i) => v - oklab(y)[i]));
const croma = c => Math.hypot(oklab(c)[1], oklab(c)[2]);
const luminancia = c => 0.2126 * linear(c[0]) + 0.7152 * linear(c[1]) + 0.0722 * linear(c[2]);
const contrasteBranco = c => 1.05 / (luminancia(c) + 0.05);
const misturar = (c, branco) => c.map(v => v + (255 - v) * branco);

// Escurece mantendo o tom até o texto branco ter o contraste pedido
function escurecer(c, minimo) {
  const [L, a, b] = oklab(c);
  for (let l = L; l > 0 && contrasteBranco(c) < minimo; l -= 0.01) c = rgbDeOklab([l, a, b]);
  return c;
}

// ---------- Cores da imagem ----------

function coresDaImagem(img) {
  const lado = 80, e = Math.min(1, lado / Math.max(img.width, img.height));
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(img.width * e));
  cv.height = Math.max(1, Math.round(img.height * e));
  const ctx = cv.getContext('2d');
  ctx.drawImage(img, 0, 0, cv.width, cv.height);
  const px = ctx.getImageData(0, 0, cv.width, cv.height).data;

  // Agrupa pixels parecidos; ignora transparente e tons de cinza (branco, preto, cinza)
  const grupos = new Map();
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 200) continue;
    const c = [px[i], px[i + 1], px[i + 2]];
    if (croma(c) < 0.05) continue;
    const k = (c[0] >> 4) << 8 | (c[1] >> 4) << 4 | c[2] >> 4;
    const g = grupos.get(k) || { n: 0, soma: [0, 0, 0] };
    g.n++;
    c.forEach((v, j) => { g.soma[j] += v; });
    grupos.set(k, g);
  }
  const total = [...grupos.values()].reduce((s, g) => s + g.n, 0);
  // Cores com presença relevante, da mais frequente para a menos
  return [...grupos.values()]
    .filter(g => g.n >= total * 0.03)
    .sort((x, y) => y.n - x.n)
    .map(g => g.soma.map(v => v / g.n));
}

function identidadeDaLogo(img) {
  const cores = coresDaImagem(img);
  if (!cores.length) return null; // logo sem cor: fica a identidade padrão

  const primeira = cores[0];
  let segunda = cores.find(c => distancia(c, primeira) >= 0.12);
  if (!segunda) { // logo de uma cor só: deriva a segunda clareando ou escurecendo o mesmo tom
    const [L, a, b] = oklab(primeira);
    segunda = rgbDeOklab([L < 0.5 ? L + 0.2 : L - 0.25, a, b]);
  }
  const [escura, clara] = luminancia(primeira) <= luminancia(segunda) ? [primeira, segunda] : [segunda, primeira];

  const marca = escurecer(escura.map(Math.round), 7);    // barra do topo com texto branco
  const acento = escurecer(clara.map(Math.round), 4.5);  // botões com texto branco e links sobre branco

  return {
    '--marca': rgbHex(marca),
    '--acento': rgbHex(acento),
    '--faixa': rgbHex(acento),
    '--fundo': rgbHex(misturar(marca, 0.965)),
    '--linha': rgbHex(misturar(marca, 0.88)),
    '--grade': rgbHex(misturar(marca, 0.9)),
    '--realce': rgbHex(misturar(marca, 0.9)),
  };
}

// ---------- Aplicar ----------

let versaoIdentidade = 0, logoAplicada;

async function aplicarIdentidade() {
  const logo = logoValida(orc.logo);
  if (logo === logoAplicada) return; // mesma logo: cores já aplicadas
  logoAplicada = logo;
  const versao = ++versaoIdentidade;
  let cores = null;
  if (logo) {
    const img = new Image();
    img.src = logo;
    try { await img.decode(); cores = identidadeDaLogo(img); } catch { /* imagem ilegível: identidade padrão */ }
  }
  if (versao !== versaoIdentidade) return; // outra logo foi carregada enquanto esta era lida
  const raiz = document.documentElement.style;
  for (const v of VARS_IDENTIDADE) cores ? raiz.setProperty(v, cores[v]) : raiz.removeProperty(v);
  // O gráfico para o cliente é uma imagem: redesenha com as cores novas
  if (!document.getElementById('aba-indicadores').hidden) renderIndicadores();
}

// Cor atual de uma variável do style.css (para o canvas e o Excel)
function corDoTema(nome) {
  return getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
}
