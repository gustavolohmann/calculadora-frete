# Calculadora de frete — Fiorino

Aplicação web para estimar o custo operacional e o preço sugerido de um frete feito com Fiorino. Funciona no navegador, sem backend, sem banco de dados e sem instalação de pacotes.

Os resultados são estimativas operacionais. O sistema não calcula tarifa oficial de frete.

Versão publicada: https://gustavolohmann.github.io/calculadora-frete/

## Executar

É preciso um servidor estático. Abrir o `index.html` direto pelo disco pode bloquear o carregamento dos scripts em alguns navegadores.

Na pasta do projeto, com PHP:

```text
php -S 127.0.0.1:8080
```

Com Python, se estiver instalado:

```text
python -m http.server 8080
```

Depois abra `http://127.0.0.1:8080`.

Não há compilação nem `npm install`.

## Como usar

1. Em **Veículo**, informe combustível, consumo, quilometragem mensal e margem. Os demais custos podem ficar em branco e entram como zero.
2. Use **Salvar configuração** para guardar esses dados neste navegador. **Restaurar valores salvos** descarta o que está na tela e volta ao último salvamento.
3. Em **Frete**, informe a distância de ida e a de retorno. O retorno não é presumido: use 0 se não houver volta, ou marque retorno vazio para copiar a distância da ida.
4. O preço é atualizado enquanto os campos são preenchidos. **Salvar orçamento** guarda a simulação no histórico.
5. Em **Histórico**, abra, atualize, exporte ou exclua um orçamento. A exclusão pede confirmação.

**Preencher com exemplo** coloca números de demonstração, identificados na tela. Eles não são dados do seu veículo. **Remover exemplo** tira esses números da tela e, se você tiver salvado o exemplo, pede confirmação para apagá-lo.

## Cálculo

Custos fixos do mês:

```text
seguro + (IPVA + licenciamento) / 12 + custos financeiros + outras despesas fixas
```

O custo financeiro é a parcela mensal de financiamento ou leasing. Ele não é tratado como depreciação. Se o mesmo valor também estiver em outras despesas fixas, ele será contado duas vezes — a tela avisa essa possibilidade.

Custo fixo por km = custos fixos do mês / quilometragem mensal.

Custo variável por km = combustível por litro / consumo + manutenção + pneus + consumíveis.

No frete:

```text
km = ida + retorno
custo = km × (custo variável por km + custo fixo por km) + pedágios + ajudante + carga/descarga + outras despesas
preço = custo / (1 - margem / 100)
preço sugerido = maior valor entre o preço e o mínimo
```

A margem é uma parte do preço de venda, não um acréscimo sobre o custo. 20% não significa custo × 1,20. Se o valor mínimo ficar acima do preço da margem, a margem efetiva é recalculada com o preço final.

Margem igual ou maior que 100% é recusada, porque o preço deixaria de ser calculável.

### Precisão

As taxas por quilômetro ficam em ponto flutuante, sem arredondar para centavos por km. Arredondar o km cedo distorce viagens mais longas.

Os valores em reais exibidos e gravados são arredondados half-up para duas casas decimais (centavos). A meia unidade sobe, inclusive 0,005. O preço usa o custo antes desse arredondamento final e só depois é levado a centavos. Por isso, no exemplo de referência, 100 km custam R$ 131,33 e o preço com margem de 20% fica R$ 164,17.

Os componentes exibidos são ajustados em no máximo um centavo para somarem exatamente o custo total apresentado.

Entradas no padrão brasileiro (`1.234,56`, `0,25`, `R$ 6,00`) são aceitas. `1.234` é lido como milhar. `6.00` e `0.25` são lidos como decimal.

## Dados neste navegador

Tudo fica no `localStorage` do navegador, nas chaves:

- `fiorino-frete:veiculo`
- `fiorino-frete:fretes`
- `fiorino-frete:tema` (só a preferência de tema; não entra no backup)

Atualizar a página mantém a configuração e os fretes. Outro navegador, outro computador ou o modo anônimo não recebem esses dados. Não há conta, nuvem nem sincronização.

Salvar ou excluir um frete não apaga a configuração do veículo.

Se o armazenamento estiver cheio, bloqueado ou corrompido, a tela explica o problema. Os cálculos continuam disponíveis.

**Exportar backup** gera um JSON com a versão, a configuração e os fretes. **Importar** só grava o arquivo depois de validar a estrutura. Dá para mesclar os fretes (a configuração atual permanece) ou substituir tudo. Na importação, os resultados são recalculados a partir das distâncias e da configuração guardada em cada frete.

**Apagar dados deste navegador** exige a caixa de confirmação e uma segunda confirmação. Não apaga o tema.

O histórico aceita até 1.000 fretes.

## Exportar PDF e XLSX

- **PDF**: um orçamento, com veículo, datas, distâncias, custos, preço, lucro, margem e a observação de que o valor é uma estimativa.
- **XLSX de um frete**: abas `Fretes`, `Detalhamento` e `Configuracoes`, com os números calculados e a memória da conta em texto.
- **XLSX de todos os fretes**: as mesmas abas, com uma linha por frete salvo.
- **XLSX de configurações**: a aba `Configuracoes`, com os valores que estão na tela.

A exportação da tela usa o cálculo do momento. A exportação pelo histórico usa o orçamento salvo. Os arquivos trazem valores, não fórmulas vivas do Excel, para não divergirem do arredondamento da aplicação.

As bibliotecas estão em `vendor/`:

- jsPDF 2.5.1 (MIT) — `vendor/jspdf.umd.min.js`
- SheetJS 0.20.3 (Apache-2.0) — `vendor/xlsx.full.min.js`

Se um desses arquivos não carregar, a exportação correspondente avisa e o restante da aplicação continua funcionando.

As fontes Barlow Condensed, Source Sans 3 e IBM Plex Mono vêm do Google Fonts. Sem rede, o navegador usa fontes parecidas já instaladas.

## Testes

Abra `http://127.0.0.1:8080/tests/index.html` com o mesmo servidor. A página executa os testes de cálculo, validação, persistência e consistência da exportação, sem framework.

A responsividade é conferida no navegador, nas larguras de 320, 375, 428, 768, 1024, 1280, 1440 e 1920 px.

## Limitações

- Os dados somem se o usuário limpar os dados do site ou usar outro navegador.
- Não há mapa, GPS, rota, nota fiscal, rastreamento nem cadastro de clientes além do texto do orçamento.
- O PDF usa a fonte padrão da biblioteca. Alguns símbolos fora do português comum podem sair simplificados.
- A planilha formata moeda e percentual no padrão do Excel; o separador visual segue o idioma do programa onde o arquivo for aberto.
- Valores acima de 1.000.000.000 são recusados.
- `1.234` (ponto e três dígitos, parte inteira diferente de zero) é milhar brasileiro, não decimal.
