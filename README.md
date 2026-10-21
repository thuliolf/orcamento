# Orçamento de Eventos

Página estática para montar orçamentos de eventos: despesas agrupadas em grupos e subgrupos, valor real do fornecedor (opcional), imposto padrão sobre todas as despesas, valor cobrado calculado ou ajustado à mão, e lucro em valor e percentual por linha. A impressão sai com valor único ou linha por linha, escolhido em cada grupo.

Não há servidor nem banco de dados. Cada orçamento é um arquivo `.json` que você abre na página (**Abrir…**), edita e salva de volta no seu computador (**Salvar**).

## Usar

Abra o `index.html` no navegador, com duplo clique mesmo. Para testar com dados, abra `exemplos/exemplo.json`.

## Regras de cálculo

Mesmas da planilha original:

| Coluna | Cálculo |
|---|---|
| Real | valor do fornecedor; opcional (vazio conta como zero) |
| Cobrado líquido | `real × (1 + markup)` enquanto não for alterado à mão |
| Imposto | `líquido × imposto %` |
| Cobrado bruto | `líquido + imposto` (valor que vai para o cliente) |
| Lucro | `líquido − real` |
| % Lucro | `lucro ÷ bruto` |

Digitar o líquido ou o bruto marca a linha como manual (fundo amarelo): ela deixa de acompanhar o real e o markup. O botão ↺ volta a linha ao cálculo automático.

**Usar como padrão** guarda empresa, logo, imposto e markup no navegador para os próximos orçamentos novos.

A logo é reduzida para no máximo 400×200 px e fica dentro do próprio arquivo `.json`.

## Impressão

Mostra só o que é do cliente: logo e nome da empresa, quantidade, descrição e valor bruto, além de um total por grupo e um total geral. A página não deixa o navegador imprimir o cabeçalho e o rodapé dele (endereço do site, título, data). Em cada grupo, "Na impressão" escolhe entre:

- **linha por linha**: cada item com seu valor, e subtotal por subgrupo;
- **valor único**: os itens listados sem valor e um só total para o grupo.

## Indicadores

A aba **Indicadores** resume o orçamento aberto:

- valor ao cliente, custo dos fornecedores, imposto e lucro (em R$ e em % do valor);
- valor ao cliente por grupo, com cada barra dividida em custo, imposto e lucro;
- % de lucro por grupo, com uma linha marcando o % do evento inteiro;
- os mesmos números em tabela;
- **gráfico para o cliente**: só o valor de cada grupo e a fatia do total, com logo e nome da empresa, sem custo, imposto nem lucro. O botão **Baixar imagem** salva em PNG.

Grupos sem valor ficam de fora. Passe o mouse (ou navegue com Tab) sobre uma barra para ver os detalhes do grupo.

## Formato do arquivo

```json
{
  "versao": 1,
  "empresa": "...", "logo": "data:image/png;base64,... (ou null)",
  "identificacao": "...", "cliente": "...", "data": "2026-12-12", "local": "...",
  "imposto": 10,
  "markup": 30,
  "grupos": [
    {
      "nome": "Decoração",
      "impressao": "detalhado | resumido",
      "subgrupos": [
        {
          "nome": "",
          "itens": [
            { "quantidade": 1, "descricao": "...", "real": 1000, "liquido": 1300, "manual": false }
          ]
        }
      ]
    }
  ]
}
```

Percentuais são guardados como número (`10` = 10%). Um subgrupo com nome vazio não aparece como cabeçalho. Os valores das linhas são totais da linha; a quantidade é só informativa.

## Desenvolvimento

```
index.html          página
style.css           estilos (tela e impressão)
app.js              tela, abrir/salvar, impressão
indicadores.js      aba de indicadores
grafico-cliente.js  gráfico para o cliente (PNG)
calc.js             regras de cálculo
tests/              testes dos cálculos
exemplos/           orçamento fictício
```

Testes: `node --test tests/*.test.js`

## Dados

Este repositório é público. Orçamentos reais ficam fora dele: guarde seus arquivos `.json` onde preferir, ou na pasta `dados/`, que o `.gitignore` já exclui.
