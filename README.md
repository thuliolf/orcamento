# Orçamento de Eventos

Página estática para montar orçamentos de eventos: despesas agrupadas em grupos e subgrupos, valor real do fornecedor (opcional), imposto padrão sobre todas as despesas, valor cobrado calculado ou ajustado à mão, e lucro em valor e percentual por linha. A impressão pode sair resumida por grupo ou detalhada linha a linha.

Não há servidor nem banco de dados. Cada orçamento é um arquivo `.json` que você abre na página, edita e salva de volta no seu computador.

## Rodar localmente

Não precisa instalar nada além de um navegador. Para servir a pasta:

```bash
python3 -m http.server 8000
```

Depois abra http://localhost:8000.

## Estrutura

```
index.html   página do sistema
CLAUDE.md    diretrizes de desenvolvimento
```

## Dados

Este repositório é público. Orçamentos reais ficam fora dele: guarde seus arquivos `.json` onde preferir, ou na pasta `dados/`, que o `.gitignore` já exclui.
