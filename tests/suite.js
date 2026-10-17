(function (root) {
  "use strict";

  var calc = root.CalculadoraFrete.calculos;
  var exportacao = root.CalculadoraFrete.exportacao;

  function memoria() {
    var dados = new Map();
    return {
      falhar: false,
      falharLeitura: false,
      getItem: function (chave) {
        if (this.falharLeitura) {
          var erroLeitura = new Error("blocked");
          erroLeitura.name = "SecurityError";
          throw erroLeitura;
        }
        return dados.has(chave) ? dados.get(chave) : null;
      },
      setItem: function (chave, valor) {
        if (this.falhar) {
          var erro = new Error("quota");
          erro.name = "QuotaExceededError";
          throw erro;
        }
        dados.set(chave, String(valor));
      },
      removeItem: function (chave) {
        dados.delete(chave);
      }
    };
  }

  function veiculoReferencia() {
    return {
      nome: "Fiorino exemplo",
      precoCombustivel: "6,00",
      consumoKmPorLitro: "10",
      manutencaoPorKm: "0,25",
      pneusPorKm: "0,00",
      consumiveisPorKm: "0",
      seguroMensal: "100,00",
      ipvaAnual: "1.200,00",
      licenciamentoAnual: "120,00",
      custosFinanceirosMensais: "0",
      outrasDespesasFixasMensais: "1.180,00",
      kmMensal: "3.000",
      margemPercentual: "20",
      valorMinimoFrete: "0"
    };
  }

  function freteReferencia(extra) {
    var base = {
      descricao: "Entrega exemplo",
      distanciaIda: "50",
      distanciaRetorno: "50",
      retornoVazio: false,
      pedagios: "0",
      ajudante: "0",
      cargaDescarga: "0",
      outrasDespesas: "0",
      margemPercentual: "20",
      valorMinimoFrete: "0"
    };
    if (!extra) return base;
    Object.keys(extra).forEach(function (chave) {
      base[chave] = extra[chave];
    });
    return base;
  }

  function registroDe(calculo) {
    return {
      id: "teste-0001",
      criadoEm: "2026-10-17T15:00:00.000Z",
      atualizadoEm: "2026-10-17T15:30:00.000Z",
      salvo: true,
      entrada: calculo.entrada,
      veiculoUtilizado: Object.assign({}, calculo.veiculo.valores, { custos: calculo.veiculo.custos }),
      resultado: calculo.resultado
    };
  }

  function executarTestes() {
    var testes = [];

    function teste(nome, fn) {
      try {
        fn();
        testes.push({ nome: nome, ok: true });
      } catch (erro) {
        testes.push({ nome: nome, ok: false, erro: erro && erro.message ? erro.message : String(erro) });
      }
    }

    function igual(atual, esperado, mensagem) {
      if (atual !== esperado) {
        throw new Error((mensagem || "Valor diferente") + " — recebido " + atual + ", esperado " + esperado);
      }
    }

    function perto(atual, esperado, tolerancia, mensagem) {
      if (!Number.isFinite(atual) || Math.abs(atual - esperado) > tolerancia) {
        throw new Error((mensagem || "Fora da tolerância") + " — recebido " + atual + ", esperado " + esperado);
      }
    }

    function verdade(condicao, mensagem) {
      if (!condicao) throw new Error(mensagem || "Condição falsa");
    }

    teste("1. combustível por km", function () {
      var custos = calc.calcularCustosVeiculo(veiculoReferencia());
      verdade(custos.ok, "veículo deveria ser válido");
      perto(custos.custos.custoCombustivelPorKm, 0.6, 1e-9);
    });

    teste("2. custo variável por km", function () {
      var custos = calc.calcularCustosVeiculo(veiculoReferencia());
      perto(custos.custos.custoVariavelPorKm, 0.85, 1e-9);
    });

    teste("3. IPVA e licenciamento viram custo mensal", function () {
      var custos = calc.calcularCustosVeiculo(veiculoReferencia());
      perto(custos.custos.ipvaLicenciamentoMensal, 110, 1e-9);
      igual(calc.centavos(custos.custos.custosFixosMensais), 139000);
    });

    teste("4. rateio do custo fixo por km", function () {
      var custos = calc.calcularCustosVeiculo(veiculoReferencia());
      perto(custos.custos.custoFixoPorKm, 1390 / 3000, 1e-9);
      perto(custos.custos.custoFixoPorKm, 0.463333, 0.000001);
    });

    teste("5. frete com ida e retorno", function () {
      var frete = calc.calcularFrete(veiculoReferencia(), freteReferencia());
      verdade(frete.ok, "frete deveria ser válido");
      igual(frete.resultado.kmTotal, 100);
      igual(calc.centavos(frete.resultado.combustivel), 6000);
      igual(calc.centavos(frete.resultado.demaisVariaveis), 2500);
      igual(calc.centavos(frete.resultado.custoFixo), 4633);
      igual(calc.centavos(frete.resultado.custoTotal), 13133);
      igual(calc.centavos(frete.resultado.precoSugerido), 16417);
      igual(calc.centavos(frete.resultado.lucro), 3284);
    });

    teste("6. retorno com distância zero", function () {
      var frete = calc.calcularFrete(veiculoReferencia(), freteReferencia({
        distanciaRetorno: "0"
      }));
      igual(frete.resultado.kmTotal, 50);
      igual(calc.centavos(frete.resultado.custoTotal), 6567);
      igual(calc.centavos(frete.resultado.precoSugerido), 8208);
    });

    teste("7. despesas extras entram no custo", function () {
      var frete = calc.calcularFrete(veiculoReferencia(), freteReferencia({
        pedagios: "10,00",
        ajudante: "20,00",
        cargaDescarga: "5,00",
        outrasDespesas: "2,50"
      }));
      igual(calc.centavos(frete.resultado.extras), 3750);
      igual(calc.centavos(frete.resultado.custoTotal), 16883);
      igual(calc.centavos(frete.resultado.precoSugerido), 21104);
    });

    teste("8. margem incide sobre o preço de venda", function () {
      var frete = calc.calcularFrete(veiculoReferencia(), freteReferencia());
      igual(calc.centavos(frete.resultado.precoSugerido), 16417);
      igual(calc.centavos(131.33 * 1.2), 15760);
      verdade(calc.centavos(frete.resultado.precoSugerido) !== 15760, "não pode ser acréscimo sobre o custo");
      perto(frete.resultado.precoCalculado * 0.8, 131.333333, 0.01);
    });

    teste("9. preço mínimo substitui o preço da margem", function () {
      var frete = calc.calcularFrete(veiculoReferencia(), freteReferencia({
        valorMinimoFrete: "200,00"
      }));
      verdade(frete.resultado.minimoAplicado, "mínimo deveria ser aplicado");
      igual(calc.centavos(frete.resultado.precoSugerido), 20000);
      igual(calc.centavos(frete.resultado.precoCalculado), 16417);
    });

    teste("10. margem efetiva é recalculada com o preço mínimo", function () {
      var frete = calc.calcularFrete(veiculoReferencia(), freteReferencia({
        valorMinimoFrete: "200"
      }));
      igual(calc.centavos(frete.resultado.lucro), 6867);
      igual(frete.resultado.margemEfetiva, 34.34);
      igual(calc.calcularFrete(veiculoReferencia(), freteReferencia()).resultado.margemEfetiva, 20);
    });

    teste("11. entradas inválidas são rejeitadas", function () {
      verdade(!calc.calcularCustosVeiculo(Object.assign(veiculoReferencia(), { consumoKmPorLitro: "0" })).ok);
      verdade(!calc.calcularCustosVeiculo(Object.assign(veiculoReferencia(), { kmMensal: "0" })).ok);
      verdade(!calc.calcularCustosVeiculo(Object.assign(veiculoReferencia(), { precoCombustivel: "" })).ok);
      verdade(!calc.calcularCustosVeiculo(Object.assign(veiculoReferencia(), { margemPercentual: "100" })).ok);
      verdade(!calc.calcularCustosVeiculo(Object.assign(veiculoReferencia(), { margemPercentual: "-1" })).ok);
      verdade(!calc.calcularFrete(veiculoReferencia(), freteReferencia({ distanciaIda: "" })).ok);
      verdade(!calc.calcularFrete(veiculoReferencia(), freteReferencia({ distanciaIda: "abc" })).ok);
      verdade(!calc.calcularFrete(veiculoReferencia(), freteReferencia({ pedagios: "-2" })).ok);
      verdade(!calc.calcularFrete(veiculoReferencia(), freteReferencia({ margemPercentual: "100" })).ok);
      verdade(!calc.parseNumeroBr("").ok);
      verdade(!calc.parseNumeroBr("1,2,3").ok);
      igual(calc.parseNumeroBr("1.234,56").valor, 1234.56);
      igual(calc.parseNumeroBr("R$ 1.180,00").valor, 1180);
      igual(calc.parseNumeroBr("0,25").valor, 0.25);
      igual(calc.parseNumeroBr("1.200").valor, 1200);
      igual(calc.parseNumeroBr("0.25").valor, 0.25);
      igual(calc.calcularCustosVeiculo(Object.assign(veiculoReferencia(), {
        custosFinanceirosMensais: "50,00"
      })).custos.custosFixosMensais, 1440);
    });

    teste("12. persistência e recuperação", function () {
      var banco = memoria();
      var armazenamento = root.CalculadoraFrete.criarArmazenamento(banco);
      var salvo = armazenamento.salvarVeiculo(veiculoReferencia());
      verdade(salvo.ok, salvo.erro || "falha ao salvar veículo");
      var lido = armazenamento.lerVeiculo();
      igual(lido.valor.precoCombustivel, 6);
      igual(lido.valor.kmMensal, 3000);
      igual(lido.valor.nome, "Fiorino exemplo");

      var calculo = calc.calcularFrete(veiculoReferencia(), freteReferencia());
      var freteSalvo = armazenamento.salvarFrete(registroDe(calculo));
      verdade(freteSalvo.ok, freteSalvo.erro || "falha ao salvar frete");
      var lista = armazenamento.lerFretes();
      igual(lista.valor.length, 1);
      igual(calc.centavos(lista.valor[0].resultado.precoSugerido), 16417);

      armazenamento.salvarVeiculo(Object.assign(veiculoReferencia(), { precoCombustivel: "7,00" }));
      igual(armazenamento.lerVeiculo().valor.precoCombustivel, 7);
      igual(armazenamento.lerFretes().valor[0].veiculoUtilizado.precoCombustivel, 6);

      var excluido = armazenamento.excluirFrete(freteSalvo.frete.id);
      verdade(excluido.ok);
      igual(armazenamento.lerFretes().valor.length, 0);
      igual(armazenamento.lerVeiculo().valor.precoCombustivel, 7);

      banco.falhar = true;
      var semEspaco = armazenamento.salvarVeiculo(veiculoReferencia());
      verdade(!semEspaco.ok);
      verdade(semEspaco.erro.indexOf("espaço") !== -1);

      var bancoRuim = memoria();
      bancoRuim.setItem("fiorino-frete:veiculo", "{");
      var corrompido = root.CalculadoraFrete.criarArmazenamento(bancoRuim).lerVeiculo();
      verdade(!corrompido.ok && corrompido.corrompido);

      var backup = root.CalculadoraFrete.criarArmazenamento(memoria());
      backup.salvarVeiculo(veiculoReferencia());
      backup.salvarFrete(registroDe(calc.calcularFrete(veiculoReferencia(), freteReferencia())));
      var arquivo = backup.exportarBackup();
      verdade(arquivo.ok);
      igual(arquivo.backup.versao, 1);
      arquivo.backup.fretes[0].resultado.precoSugerido = 1;
      var destino = root.CalculadoraFrete.criarArmazenamento(memoria());
      destino.salvarVeiculo(Object.assign(veiculoReferencia(), { nome: "Atual" }));
      var mescla = destino.importarBackup(arquivo.backup, "mesclar");
      verdade(mescla.ok, mescla.erro || "mescla falhou");
      igual(mescla.incluidos, 1);
      igual(destino.lerVeiculo().valor.nome, "Atual");
      igual(calc.centavos(destino.lerFretes().valor[0].resultado.precoSugerido), 16417);

      var troca = destino.importarBackup({ versao: 2, veiculo: null, fretes: [] }, "substituir");
      verdade(!troca.ok);
      var invalido = destino.importarBackup({ versao: 1, veiculo: { precoCombustivel: -5 }, fretes: [] }, "substituir");
      verdade(!invalido.ok);
    });

    teste("13. exportação consistente com o orçamento salvo", function () {
      var calculo = calc.calcularFrete(veiculoReferencia(), freteReferencia());
      var registro = registroDe(calculo);
      var planilhas = exportacao.montarPlanilhasOrcamento(registro);
      igual(planilhas[0].nome, "Fretes");
      igual(planilhas[1].nome, "Detalhamento");
      igual(planilhas[2].nome, "Configuracoes");
      var preco = exportacao.valorDaLinha(planilhas[0], "Preço sugerido");
      var custo = exportacao.valorDaLinha(planilhas[0], "Custo total estimado");
      igual(calc.centavos(preco.v), calc.centavos(registro.resultado.precoSugerido));
      igual(calc.centavos(custo.v), calc.centavos(registro.resultado.custoTotal));
      igual(calc.centavos(preco.v), 16417);
      var pdf = exportacao.montarLinhasPdf(registro);
      var linhaPreco = pdf.filter(function (item) { return item.rotulo === "Preço sugerido"; })[0];
      verdade(linhaPreco.valor.indexOf("164,17") !== -1, linhaPreco.valor);
      var lista = exportacao.montarPlanilhasLista([registro], registro.veiculoUtilizado);
      igual(calc.centavos(lista[0].linhas[1][17].v), 16417);
      igual(lista[2].linhas[2][0].v, "Preço do combustível");
    });

    teste("componentes do custo fecham com o total", function () {
      var frete = calc.calcularFrete(veiculoReferencia(), freteReferencia());
      var r = frete.resultado;
      var soma = calc.centavos(r.combustivel) + calc.centavos(r.demaisVariaveis) + calc.centavos(r.custoFixo) + calc.centavos(r.extras);
      igual(soma, calc.centavos(r.custoTotal));
    });

    teste("custo financeiro mensal entra separado", function () {
      var custos = calc.calcularCustosVeiculo(Object.assign(veiculoReferencia(), {
        custosFinanceirosMensais: "80,00"
      }));
      igual(calc.centavos(custos.custos.custosFixosMensais), 147000);
    });

    teste("margem vazia do frete usa a margem do veículo", function () {
      var frete = calc.calcularFrete(veiculoReferencia(), freteReferencia({ margemPercentual: "" }));
      verdade(frete.ok);
      igual(frete.entrada.margemPercentual, 20);
    });

    var falhas = testes.filter(function (item) { return !item.ok; });
    return {
      total: testes.length,
      falhas: falhas.length,
      aprovados: testes.length - falhas.length,
      testes: testes
    };
  }

  root.executarTestes = executarTestes;
})(typeof globalThis !== "undefined" ? globalThis : this);
