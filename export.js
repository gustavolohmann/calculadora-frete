(function (root) {
  "use strict";

  var MENSAGEM_PDF = "A exportação em PDF está indisponível porque a biblioteca não carregou. Os cálculos e os dados salvos neste navegador continuam funcionando. Verifique a pasta vendor ou sua conexão e atualize a página.";
  var MENSAGEM_XLSX = "A exportação em XLSX está indisponível porque a biblioteca não carregou. Os cálculos e os dados salvos neste navegador continuam funcionando. Verifique a pasta vendor ou sua conexão e atualize a página.";

  function calculos() {
    return root.CalculadoraFrete.calculos;
  }

  function texto(valor) {
    return { v: valor == null ? "" : String(valor), t: "s" };
  }

  function numero(valor, formato) {
    return { v: Number(valor) || 0, t: "n", z: formato || "0.00" };
  }

  function moeda(valor) {
    return { v: Number(valor) || 0, t: "n", z: '"R$" #,##0.00' };
  }

  function percentual(valor) {
    if (valor == null || !Number.isFinite(valor)) return texto("—");
    return { v: valor / 100, t: "n", z: "0.00%" };
  }

  function distancia(valor) {
    return { v: Number(valor) || 0, t: "n", z: "#,##0.00" };
  }

  function linha() {
    return Array.prototype.slice.call(arguments);
  }

  function nomeVeiculo(registro) {
    var nome = registro.veiculoUtilizado && registro.veiculoUtilizado.nome;
    return nome ? nome : "Fiorino";
  }

  function montarPlanilhaFrete(registro) {
    var entrada = registro.entrada;
    var resultado = registro.resultado;
    var veiculo = registro.veiculoUtilizado || {};
    var c = calculos();
    return {
      nome: "Fretes",
      larguras: [{ wch: 36 }, { wch: 22 }, { wch: 16 }, { wch: 64 }],
      linhas: [
        linha(texto("Campo"), texto("Valor"), texto("Unidade"), texto("Memória de cálculo")),
        linha(texto("Veículo"), texto(nomeVeiculo(registro)), texto(""), texto("")),
        linha(texto("Descrição"), texto(entrada.descricao || ""), texto(""), texto("")),
        linha(texto("Criado em"), texto(c.formatarDataHora(registro.criadoEm)), texto(""), texto("")),
        linha(texto("Atualizado em"), texto(c.formatarDataHora(registro.atualizadoEm)), texto(""), texto("")),
        linha(texto("Distância de ida"), distancia(entrada.distanciaIda), texto("km"), texto("")),
        linha(texto("Distância de retorno"), distancia(entrada.distanciaRetorno), texto("km"), texto(entrada.retornoVazio ? "Retorno vazio marcado; a distância informada entra no custo." : "")),
        linha(texto("Distância total"), distancia(resultado.kmTotal), texto("km"), texto("Ida + retorno")),
        linha(texto("Preço do combustível"), moeda(veiculo.precoCombustivel), texto("R$/L"), texto("")),
        linha(texto("Consumo"), numero(veiculo.consumoKmPorLitro, "0.00"), texto("km/L"), texto("")),
        linha(texto("Custo de combustível"), moeda(resultado.combustivel), texto("R$"), texto("Distância total × preço do litro / consumo")),
        linha(texto("Demais custos variáveis"), moeda(resultado.demaisVariaveis), texto("R$"), texto("Distância total × (manutenção + pneus + consumíveis)")),
        linha(texto("Custos fixos rateados"), moeda(resultado.custoFixo), texto("R$"), texto("Distância total × custos fixos mensais / km mensal")),
        linha(texto("Pedágios"), moeda(entrada.pedagios), texto("R$"), texto("")),
        linha(texto("Ajudante"), moeda(entrada.ajudante), texto("R$"), texto("")),
        linha(texto("Carga e descarga"), moeda(entrada.cargaDescarga), texto("R$"), texto("")),
        linha(texto("Outras despesas"), moeda(entrada.outrasDespesas), texto("R$"), texto("")),
        linha(texto("Despesas extras"), moeda(resultado.extras), texto("R$"), texto("Pedágios + ajudante + carga e descarga + outras")),
        linha(texto("Custo total estimado"), moeda(resultado.custoTotal), texto("R$"), texto("Combustível + demais variáveis + custos fixos + extras")),
        linha(texto("Margem informada"), percentual(entrada.margemPercentual), texto("% do preço"), texto("Preço = custo / (1 - margem/100)")),
        linha(texto("Preço calculado pela margem"), moeda(resultado.precoCalculado), texto("R$"), texto("")),
        linha(texto("Valor mínimo"), moeda(entrada.valorMinimoFrete), texto("R$"), texto("")),
        linha(texto("Preço sugerido"), moeda(resultado.precoSugerido), texto("R$"), texto("O maior valor entre o preço calculado e o mínimo")),
        linha(texto("Lucro estimado"), moeda(resultado.lucro), texto("R$"), texto("Preço sugerido - custo total")),
        linha(texto("Margem efetiva"), percentual(resultado.margemEfetiva), texto("% do preço"), texto(resultado.minimoAplicado ? "Recalculada porque o valor mínimo ficou acima do preço da margem." : "")),
        linha(texto("Custo por km"), resultado.custoPorKm == null ? texto("—") : moeda(resultado.custoPorKm), texto("R$/km"), texto("")),
        linha(texto("Preço sugerido por km"), resultado.precoPorKm == null ? texto("—") : moeda(resultado.precoPorKm), texto("R$/km"), texto("")),
        linha(texto("Observação"), texto(c.OBSERVACAO), texto(""), texto(""))
      ]
    };
  }

  function montarPlanilhaDetalhe(registro) {
    var resultado = registro.resultado;
    return {
      nome: "Detalhamento",
      larguras: [{ wch: 36 }, { wch: 18 }, { wch: 72 }],
      linhas: [
        linha(texto("Componente"), texto("Valor"), texto("Como foi obtido")),
        linha(texto("Combustível"), moeda(resultado.combustivel), texto("Quilômetros da ida e do retorno × custo do combustível por km")),
        linha(texto("Demais custos variáveis"), moeda(resultado.demaisVariaveis), texto("Quilômetros × manutenção, pneus e consumíveis")),
        linha(texto("Custos fixos rateados"), moeda(resultado.custoFixo), texto("Quilômetros × custo fixo por km")),
        linha(texto("Despesas extras"), moeda(resultado.extras), texto("Pedágios, ajudante, carga, descarga e outras despesas da viagem")),
        linha(texto("Custo total estimado"), moeda(resultado.custoTotal), texto("Soma dos componentes")),
        linha(texto("Preço sugerido"), moeda(resultado.precoSugerido), texto("Margem sobre o preço de venda, respeitado o valor mínimo"))
      ]
    };
  }

  function montarPlanilhaConfiguracao(veiculo) {
    var custos = (veiculo && veiculo.custos) || {};
    var c = calculos();
    function taxa(valor) {
      return valor == null ? texto("—") : numero(c.roundHalfUp(valor, 6), "0.000000");
    }
    return {
      nome: "Configuracoes",
      larguras: [{ wch: 40 }, { wch: 20 }, { wch: 24 }],
      linhas: [
        linha(texto("Parâmetro"), texto("Valor"), texto("Unidade")),
        linha(texto("Veículo"), texto(veiculo && veiculo.nome ? veiculo.nome : ""), texto("")),
        linha(texto("Preço do combustível"), moeda(veiculo.precoCombustivel), texto("R$/L")),
        linha(texto("Consumo médio"), numero(veiculo.consumoKmPorLitro, "0.00"), texto("km/L")),
        linha(texto("Manutenção"), moeda(veiculo.manutencaoPorKm), texto("R$/km")),
        linha(texto("Pneus"), moeda(veiculo.pneusPorKm), texto("R$/km")),
        linha(texto("Óleo e consumíveis"), moeda(veiculo.consumiveisPorKm), texto("R$/km")),
        linha(texto("Seguro"), moeda(veiculo.seguroMensal), texto("R$/mês")),
        linha(texto("IPVA"), moeda(veiculo.ipvaAnual), texto("R$/ano")),
        linha(texto("Licenciamento"), moeda(veiculo.licenciamentoAnual), texto("R$/ano")),
        linha(texto("Custos financeiros"), moeda(veiculo.custosFinanceirosMensais), texto("R$/mês")),
        linha(texto("Outras despesas fixas"), moeda(veiculo.outrasDespesasFixasMensais), texto("R$/mês")),
        linha(texto("Quilometragem mensal"), numero(veiculo.kmMensal, "#,##0.00"), texto("km/mês")),
        linha(texto("Margem padrão"), percentual(veiculo.margemPercentual), texto("% do preço")),
        linha(texto("Valor mínimo de frete"), moeda(veiculo.valorMinimoFrete), texto("R$")),
        linha(texto("Custos fixos mensais"), custos.custosFixosMensais == null ? texto("—") : moeda(custos.custosFixosMensais), texto("R$/mês")),
        linha(texto("Custo fixo por km"), taxa(custos.custoFixoPorKm), texto("R$/km")),
        linha(texto("Custo de combustível por km"), taxa(custos.custoCombustivelPorKm), texto("R$/km")),
        linha(texto("Custo variável por km"), taxa(custos.custoVariavelPorKm), texto("R$/km"))
      ]
    };
  }

  function montarPlanilhasOrcamento(registro) {
    return [
      montarPlanilhaFrete(registro),
      montarPlanilhaDetalhe(registro),
      montarPlanilhaConfiguracao(registro.veiculoUtilizado || {})
    ];
  }

  function cabecalhoLista() {
    return linha(
      texto("Descrição"),
      texto("Veículo"),
      texto("Atualizado em"),
      texto("Ida (km)"),
      texto("Retorno (km)"),
      texto("Total (km)"),
      texto("Retorno vazio"),
      texto("Pedágios"),
      texto("Ajudante"),
      texto("Carga e descarga"),
      texto("Outras despesas"),
      texto("Extras"),
      texto("Combustível"),
      texto("Demais variáveis"),
      texto("Custos fixos"),
      texto("Custo total"),
      texto("Margem informada"),
      texto("Preço sugerido"),
      texto("Lucro estimado"),
      texto("Margem efetiva"),
      texto("Custo por km"),
      texto("Preço por km")
    );
  }

  function linhaFrete(registro) {
    var c = calculos();
    var entrada = registro.entrada;
    var resultado = registro.resultado;
    return linha(
      texto(entrada.descricao || ""),
      texto(nomeVeiculo(registro)),
      texto(c.formatarDataHora(registro.atualizadoEm)),
      distancia(entrada.distanciaIda),
      distancia(entrada.distanciaRetorno),
      distancia(resultado.kmTotal),
      texto(entrada.retornoVazio ? "Sim" : "Não"),
      moeda(entrada.pedagios),
      moeda(entrada.ajudante),
      moeda(entrada.cargaDescarga),
      moeda(entrada.outrasDespesas),
      moeda(resultado.extras),
      moeda(resultado.combustivel),
      moeda(resultado.demaisVariaveis),
      moeda(resultado.custoFixo),
      moeda(resultado.custoTotal),
      percentual(entrada.margemPercentual),
      moeda(resultado.precoSugerido),
      moeda(resultado.lucro),
      percentual(resultado.margemEfetiva),
      resultado.custoPorKm == null ? texto("—") : moeda(resultado.custoPorKm),
      resultado.precoPorKm == null ? texto("—") : moeda(resultado.precoPorKm)
    );
  }

  function montarPlanilhasLista(fretes, veiculo) {
    var linhasFretes = [cabecalhoLista()];
    var linhasDetalhe = [linha(
      texto("Descrição"),
      texto("Combustível"),
      texto("Demais variáveis"),
      texto("Custos fixos"),
      texto("Extras"),
      texto("Custo total"),
      texto("Preço sugerido")
    )];
    var i;
    for (i = 0; i < fretes.length; i += 1) {
      linhasFretes.push(linhaFrete(fretes[i]));
      linhasDetalhe.push(linha(
        texto(fretes[i].entrada.descricao || ""),
        moeda(fretes[i].resultado.combustivel),
        moeda(fretes[i].resultado.demaisVariaveis),
        moeda(fretes[i].resultado.custoFixo),
        moeda(fretes[i].resultado.extras),
        moeda(fretes[i].resultado.custoTotal),
        moeda(fretes[i].resultado.precoSugerido)
      ));
    }
    var configuracao = veiculo ? montarPlanilhaConfiguracao(veiculo) : {
      nome: "Configuracoes",
      larguras: [{ wch: 40 }],
      linhas: [linha(texto("Nenhuma configuração de veículo salva neste navegador."))]
    };
    return [
      { nome: "Fretes", larguras: cabecalhoLista().map(function () { return { wch: 20 }; }), linhas: linhasFretes },
      { nome: "Detalhamento", larguras: [{ wch: 28 }, { wch: 18 }, { wch: 20 }, { wch: 18 }, { wch: 16 }, { wch: 18 }, { wch: 18 }], linhas: linhasDetalhe },
      configuracao
    ];
  }

  function montarLinhasPdf(registro) {
    var c = calculos();
    var entrada = registro.entrada;
    var resultado = registro.resultado;
    var salvo = registro.salvo !== false;
    return [
      { secao: "Identificação" },
      { rotulo: "Veículo", valor: nomeVeiculo(registro) },
      { rotulo: "Serviço", valor: entrada.descricao || "Sem descrição" },
      { rotulo: "Criado em", valor: c.formatarDataHora(registro.criadoEm) },
      { rotulo: "Atualizado em", valor: c.formatarDataHora(registro.atualizadoEm) },
      { secao: "Distâncias" },
      { rotulo: "Ida", valor: c.formatarNumero(entrada.distanciaIda, 2) + " km" },
      { rotulo: "Retorno", valor: c.formatarNumero(entrada.distanciaRetorno, 2) + " km" + (entrada.retornoVazio ? " (retorno vazio)" : "") },
      { rotulo: "Total considerado", valor: c.formatarNumero(resultado.kmTotal, 2) + " km" },
      { secao: "Custos" },
      { rotulo: "Combustível", valor: c.formatarMoeda(resultado.combustivel) },
      { rotulo: "Demais custos variáveis", valor: c.formatarMoeda(resultado.demaisVariaveis) },
      { rotulo: "Custos fixos rateados", valor: c.formatarMoeda(resultado.custoFixo) },
      { rotulo: "Pedágios", valor: c.formatarMoeda(entrada.pedagios) },
      { rotulo: "Ajudante", valor: c.formatarMoeda(entrada.ajudante) },
      { rotulo: "Carga e descarga", valor: c.formatarMoeda(entrada.cargaDescarga) },
      { rotulo: "Outras despesas", valor: c.formatarMoeda(entrada.outrasDespesas) },
      { rotulo: "Despesas extras", valor: c.formatarMoeda(resultado.extras) },
      { rotulo: "Custo total estimado", valor: c.formatarMoeda(resultado.custoTotal) },
      { secao: "Preço" },
      { rotulo: "Margem informada", valor: c.formatarPercentual(entrada.margemPercentual) },
      { rotulo: "Preço sugerido", valor: c.formatarMoeda(resultado.precoSugerido) },
      { rotulo: "Lucro estimado", valor: c.formatarMoeda(resultado.lucro) },
      { rotulo: "Margem efetiva", valor: c.formatarPercentual(resultado.margemEfetiva) },
      { rotulo: "Custo por km", valor: resultado.custoPorKm == null ? "—" : c.formatarMoeda(resultado.custoPorKm) },
      { rotulo: "Preço sugerido por km", valor: resultado.precoPorKm == null ? "—" : c.formatarMoeda(resultado.precoPorKm) },
      { secao: "Observações" },
      { rotulo: "Natureza do cálculo", valor: c.OBSERVACAO },
      { rotulo: "Situação", valor: salvo ? "Valores salvos neste navegador no momento da exportação." : "Valores calculados na tela e ainda não salvos neste navegador." },
      { rotulo: "Mínimo", valor: resultado.minimoAplicado ? "O valor mínimo ficou acima do preço calculado pela margem. A margem efetiva foi recalculada sobre o preço final." : "O preço sugerido veio da margem informada." }
    ];
  }

  function valorDaLinha(planilha, rotulo) {
    var i;
    for (i = 0; i < planilha.linhas.length; i += 1) {
      if (planilha.linhas[i][0] && planilha.linhas[i][0].v === rotulo) return planilha.linhas[i][1];
    }
    return null;
  }

  function baixarBlob(blob, nome) {
    var url = root.URL.createObjectURL(blob);
    var link = root.document.createElement("a");
    link.href = url;
    link.download = nome;
    link.rel = "noopener";
    root.document.body.appendChild(link);
    link.click();
    link.remove();
    root.setTimeout(function () {
      root.URL.revokeObjectURL(url);
    }, 1000);
  }

  function escreverPlanilha(planilha) {
    var XLSX = root.XLSX;
    var matriz = planilha.linhas.map(function (linhaAtual) {
      return linhaAtual.map(function (celula) { return celula.v; });
    });
    var folha = XLSX.utils.aoa_to_sheet(matriz);
    planilha.linhas.forEach(function (linhaAtual, r) {
      linhaAtual.forEach(function (celula, c) {
        if (celula.t !== "n") return;
        var endereco = XLSX.utils.encode_cell({ r: r, c: c });
        if (!folha[endereco]) return;
        folha[endereco].t = "n";
        folha[endereco].v = celula.v;
        if (celula.z) folha[endereco].z = celula.z;
      });
    });
    folha["!cols"] = planilha.larguras;
    return folha;
  }

  function exportarXlsx(planilhas, nomeArquivo) {
    if (!root.XLSX || !root.XLSX.utils) return { ok: false, erro: MENSAGEM_XLSX };
    var livro = root.XLSX.utils.book_new();
    var i;
    for (i = 0; i < planilhas.length; i += 1) {
      root.XLSX.utils.book_append_sheet(livro, escreverPlanilha(planilhas[i]), planilhas[i].nome);
    }
    root.XLSX.writeFile(livro, nomeArquivo);
    return { ok: true };
  }

  function exportarPdf(registro, nomeArquivo) {
    if (!root.jspdf || typeof root.jspdf.jsPDF !== "function") {
      return { ok: false, erro: MENSAGEM_PDF };
    }
    var doc = new root.jspdf.jsPDF({ unit: "mm", format: "a4" });
    var linhas = montarLinhasPdf(registro);
    var margem = 16;
    var largura = 210 - margem * 2;
    var y = 18;

    function garantirEspaco(altura) {
      if (y + altura <= 282) return;
      doc.addPage();
      y = 18;
    }

    doc.setFillColor(31, 78, 121);
    doc.rect(0, 0, 210, 24, "F");
    doc.setTextColor(247, 249, 251);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Fiorino", margem, 11);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Orçamento de frete", margem, 18);
    y = 34;
    doc.setTextColor(26, 35, 50);

    var i;
    for (i = 0; i < linhas.length; i += 1) {
      var item = linhas[i];
      if (item.secao) {
        garantirEspaco(12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(31, 78, 121);
        doc.text(item.secao, margem, y);
        y += 7;
        doc.setTextColor(26, 35, 50);
        continue;
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      var valorQuebrado = doc.splitTextToSize(String(item.valor), largura - 62);
      var altura = Math.max(6, valorQuebrado.length * 5);
      garantirEspaco(altura + 2);
      doc.setFont("helvetica", "bold");
      doc.text(String(item.rotulo), margem, y);
      doc.setFont("helvetica", "normal");
      doc.text(valorQuebrado, margem + 62, y);
      y += altura + 1.5;
    }

    doc.save(nomeArquivo);
    return { ok: true, linhas: linhas };
  }

  function slug(textoBruto) {
    var base = String(textoBruto || "frete")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);
    return base || "frete";
  }

  function nomeArquivo(prefixo, descricao, extensao) {
    var dia = new Date().toISOString().slice(0, 10);
    return prefixo + "-" + slug(descricao) + "-" + dia + "." + extensao;
  }

  root.CalculadoraFrete = root.CalculadoraFrete || {};
  root.CalculadoraFrete.exportacao = {
    MENSAGEM_PDF: MENSAGEM_PDF,
    MENSAGEM_XLSX: MENSAGEM_XLSX,
    montarPlanilhasOrcamento: montarPlanilhasOrcamento,
    montarPlanilhasLista: montarPlanilhasLista,
    montarPlanilhaConfiguracao: montarPlanilhaConfiguracao,
    montarLinhasPdf: montarLinhasPdf,
    valorDaLinha: valorDaLinha,
    exportarXlsx: exportarXlsx,
    exportarPdf: exportarPdf,
    baixarBlob: baixarBlob,
    nomeArquivo: nomeArquivo
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
