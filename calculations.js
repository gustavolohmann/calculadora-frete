(function (root) {
  "use strict";

  // Precisão: as taxas por km permanecem em ponto flutuante.
  // Valores monetários de saída são arredondados half-up para centavos
  // a partir da representação decimal do número, para não usar o
  // arredondamento bancário de Math.round em metades.

  var LIMITE = 1000000000;

  function textoDecimal(absoluto) {
    if (absoluto === 0) return "0";
    var expoente = absoluto.toExponential(18);
    var partes = /^(\d)\.(\d+)e([+-]?\d+)$/.exec(expoente);
    if (!partes) return String(absoluto);
    var digitos = partes[1] + partes[2];
    var ponto = Number(partes[3]) + 1;
    if (ponto <= 0) return "0." + repetir("0", -ponto) + digitos;
    if (ponto >= digitos.length) return digitos + repetir("0", ponto - digitos.length);
    return digitos.slice(0, ponto) + "." + digitos.slice(ponto);
  }

  function repetir(caractere, vezes) {
    var texto = "";
    var i;
    for (i = 0; i < vezes; i += 1) texto += caractere;
    return texto;
  }

  function somarUm(digitos) {
    var lista = digitos.split("");
    var vai = 1;
    var i;
    for (i = lista.length - 1; i >= 0 && vai; i -= 1) {
      var soma = lista[i].charCodeAt(0) - 48 + vai;
      lista[i] = String(soma % 10);
      vai = soma >= 10 ? 1 : 0;
    }
    if (vai) lista.unshift("1");
    return lista.join("");
  }

  function roundHalfUp(valor, casas) {
    if (!Number.isFinite(valor)) return NaN;
    var decimais = casas === undefined ? 2 : casas;
    if (valor === 0) return 0;
    var negativo = valor < 0;
    var partes = textoDecimal(Math.abs(valor)).split(".");
    var inteiro = partes[0];
    var fracao = (partes[1] || "").padEnd ? (partes[1] || "") : partes[1] || "";
    fracao = (partes[1] || "") + repetir("0", decimais + 1);
    var manter = fracao.slice(0, decimais);
    var seguinte = fracao.charAt(decimais) || "0";
    var combinado = (inteiro + manter).replace(/^0+(?=\d)/, "");
    if (seguinte >= "5") combinado = somarUm(combinado);
    if (!decimais) {
      var inteiroFinal = Number(combinado);
      return negativo ? -inteiroFinal : inteiroFinal;
    }
    var corte = combinado.length - decimais;
    var saidaInteiro;
    var saidaFracao;
    if (corte <= 0) {
      saidaInteiro = "0";
      saidaFracao = repetir("0", -corte) + combinado;
    } else {
      saidaInteiro = combinado.slice(0, corte);
      saidaFracao = combinado.slice(corte);
    }
    var numero = Number(saidaInteiro + "." + saidaFracao);
    return negativo ? -numero : numero;
  }

  function centavos(valor) {
    if (!Number.isFinite(valor)) return NaN;
    var negativo = valor < 0;
    var partes = textoDecimal(Math.abs(valor)).split(".");
    var fracao = (partes[1] || "") + "000";
    var combinado = String(Number(partes[0])) + fracao.slice(0, 2);
    if (fracao.charAt(2) >= "5") combinado = somarUm(combinado);
    var inteiro = Number(combinado);
    return negativo ? -inteiro : inteiro;
  }

  // Percentual com duas casas, half-up, a partir de uma razão entre inteiros.
  function percentualDeInteiros(numerador, denominador) {
    if (!denominador) return null;
    var negativo = (numerador < 0) !== (denominador < 0);
    var num = Math.abs(numerador) * 10000;
    var den = Math.abs(denominador);
    var quociente = Math.floor(num / den);
    var resto = num % den;
    if (resto * 2 >= den) quociente += 1;
    var valor = quociente / 100;
    return negativo ? -valor : valor;
  }

  function reais(centavosInteiros) {
    return centavosInteiros / 100;
  }

  function parseNumeroBr(raw) {
    if (typeof raw === "number") {
      return Number.isFinite(raw)
        ? { ok: true, valor: raw }
        : { ok: false, erro: "Número inválido." };
    }
    if (raw != null && typeof raw !== "string") {
      return { ok: false, erro: "Número inválido." };
    }
    if (raw == null) return { ok: false, vazio: true, erro: "Informe um número." };
    var texto = String(raw).trim().replace(/\s/g, "").replace(/^R\$/i, "");
    if (texto === "") return { ok: false, vazio: true, erro: "Informe um número." };
    var sinal = 1;
    if (texto.charAt(0) === "+" || texto.charAt(0) === "-") {
      sinal = texto.charAt(0) === "-" ? -1 : 1;
      texto = texto.slice(1);
    }
    if (texto === "") return { ok: false, erro: "Informe um número." };

    var normalizado;
    if (texto.indexOf(",") !== -1) {
      if (!/^(\d{1,3}(\.\d{3})+|\d+),\d+$/.test(texto)) {
        return { ok: false, erro: "Informe um número válido. Exemplo de formato: 1.234,56." };
      }
      normalizado = texto.replace(/\./g, "").replace(",", ".");
    } else if ((texto.match(/\./g) || []).length > 1) {
      if (!/^\d{1,3}(\.\d{3})+$/.test(texto)) {
        return { ok: false, erro: "Informe um número válido. Exemplo de formato: 1.234,56." };
      }
      normalizado = texto.replace(/\./g, "");
    } else if (/^\d{1,3}\.\d{3}$/.test(texto)) {
      normalizado = texto.split(".")[0] === "0" ? texto : texto.replace(".", "");
    } else if (!/^\d+(\.\d+)?$/.test(texto)) {
      return { ok: false, erro: "Informe um número válido. Exemplo de formato: 1.234,56." };
    } else {
      normalizado = texto;
    }

    var valor = sinal * Number(normalizado);
    if (!Number.isFinite(valor)) return { ok: false, erro: "Número inválido." };
    return { ok: true, valor: valor };
  }

  function normalizarTexto(valor, limite) {
    if (valor == null) return "";
    return String(valor)
      .replace(/[\u0000-\u001F\u007F]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, limite);
  }

  function vazio(valor) {
    return valor == null || (typeof valor === "string" && valor.trim() === "");
  }

  function lerNumero(fonte, opcoes, erros) {
    if (vazio(fonte)) {
      if (opcoes.obrigatorio) {
        erros[opcoes.campo] = opcoes.vazio;
        return null;
      }
      return 0;
    }
    var lido = parseNumeroBr(fonte);
    if (!lido.ok) {
      erros[opcoes.campo] = "Informe um número válido. Exemplo de formato: 1.234,56.";
      return null;
    }
    if (lido.valor < 0) {
      erros[opcoes.campo] = opcoes.negativo || "O valor não pode ser negativo.";
      return null;
    }
    if (opcoes.maiorQueZero && lido.valor <= 0) {
      erros[opcoes.campo] = opcoes.zero;
      return null;
    }
    if (opcoes.menorQue != null && lido.valor >= opcoes.menorQue) {
      erros[opcoes.campo] = opcoes.teto;
      return null;
    }
    if (lido.valor > LIMITE) {
      erros[opcoes.campo] = "O valor é grande demais.";
      return null;
    }
    return lido.valor;
  }

  function validarVeiculo(fonte) {
    var dados = fonte || {};
    var erros = {};
    var valores = {
      nome: normalizarTexto(dados.nome, 80),
      precoCombustivel: lerNumero(dados.precoCombustivel, {
        campo: "precoCombustivel",
        obrigatorio: true,
        vazio: "Informe o preço do combustível."
      }, erros),
      consumoKmPorLitro: lerNumero(dados.consumoKmPorLitro, {
        campo: "consumoKmPorLitro",
        obrigatorio: true,
        maiorQueZero: true,
        vazio: "Informe o consumo médio.",
        zero: "O consumo precisa ser maior que zero."
      }, erros),
      manutencaoPorKm: lerNumero(dados.manutencaoPorKm, { campo: "manutencaoPorKm" }, erros),
      pneusPorKm: lerNumero(dados.pneusPorKm, { campo: "pneusPorKm" }, erros),
      consumiveisPorKm: lerNumero(dados.consumiveisPorKm, { campo: "consumiveisPorKm" }, erros),
      seguroMensal: lerNumero(dados.seguroMensal, { campo: "seguroMensal" }, erros),
      ipvaAnual: lerNumero(dados.ipvaAnual, { campo: "ipvaAnual" }, erros),
      licenciamentoAnual: lerNumero(dados.licenciamentoAnual, { campo: "licenciamentoAnual" }, erros),
      custosFinanceirosMensais: lerNumero(dados.custosFinanceirosMensais, {
        campo: "custosFinanceirosMensais"
      }, erros),
      outrasDespesasFixasMensais: lerNumero(dados.outrasDespesasFixasMensais, {
        campo: "outrasDespesasFixasMensais"
      }, erros),
      kmMensal: lerNumero(dados.kmMensal, {
        campo: "kmMensal",
        obrigatorio: true,
        maiorQueZero: true,
        vazio: "Informe a quilometragem mensal.",
        zero: "A quilometragem mensal precisa ser maior que zero."
      }, erros),
      margemPercentual: lerNumero(dados.margemPercentual, {
        campo: "margemPercentual",
        obrigatorio: true,
        menorQue: 100,
        vazio: "Informe a margem de lucro.",
        teto: "A margem precisa ser menor que 100%."
      }, erros),
      valorMinimoFrete: lerNumero(dados.valorMinimoFrete, { campo: "valorMinimoFrete" }, erros)
    };

    return {
      ok: Object.keys(erros).length === 0,
      erros: erros,
      valores: valores
    };
  }

  function calcularCustosVeiculo(fonte) {
    var validado = validarVeiculo(fonte);
    if (!validado.ok) return validado;
    var v = validado.valores;

    // Custos fixos mensais = seguro + (IPVA + licenciamento) / 12
    // + custos financeiros + outras despesas fixas.
    // O custo financeiro é uma saída de caixa, não depreciação.
    var ipvaLicenciamentoMensal = (v.ipvaAnual + v.licenciamentoAnual) / 12;
    var custosFixosMensaisPreciso = v.seguroMensal
      + ipvaLicenciamentoMensal
      + v.custosFinanceirosMensais
      + v.outrasDespesasFixasMensais;
    var custosFixosMensais = reais(centavos(custosFixosMensaisPreciso));
    var custoFixoPorKm = custosFixosMensaisPreciso / v.kmMensal;
    var custoCombustivelPorKm = v.precoCombustivel / v.consumoKmPorLitro;
    var custoVariavelPorKm = custoCombustivelPorKm
      + v.manutencaoPorKm
      + v.pneusPorKm
      + v.consumiveisPorKm;

    return {
      ok: true,
      erros: {},
      valores: v,
      custos: {
        seguroMensal: v.seguroMensal,
        ipvaLicenciamentoMensal: ipvaLicenciamentoMensal,
        custosFinanceirosMensais: v.custosFinanceirosMensais,
        outrasDespesasFixasMensais: v.outrasDespesasFixasMensais,
        custosFixosMensaisPreciso: custosFixosMensaisPreciso,
        custosFixosMensais: custosFixosMensais,
        custoFixoPorKm: custoFixoPorKm,
        custoCombustivelPorKm: custoCombustivelPorKm,
        manutencaoPorKm: v.manutencaoPorKm,
        pneusPorKm: v.pneusPorKm,
        consumiveisPorKm: v.consumiveisPorKm,
        custoVariavelPorKm: custoVariavelPorKm
      }
    };
  }

  function validarEntradaFrete(fonte, veiculo) {
    var dados = fonte || {};
    var erros = {};
    var margemFonte = vazio(dados.margemPercentual) && veiculo
      ? veiculo.margemPercentual
      : dados.margemPercentual;
    var minimoFonte = vazio(dados.valorMinimoFrete) && veiculo
      ? veiculo.valorMinimoFrete
      : dados.valorMinimoFrete;

    var valores = {
      descricao: normalizarTexto(dados.descricao, 120),
      distanciaIda: lerNumero(dados.distanciaIda, {
        campo: "distanciaIda",
        obrigatorio: true,
        vazio: "Informe a distância de ida."
      }, erros),
      distanciaRetorno: lerNumero(dados.distanciaRetorno, {
        campo: "distanciaRetorno",
        obrigatorio: true,
        vazio: "Informe a distância de retorno. Use 0 se não houver volta."
      }, erros),
      retornoVazio: Boolean(dados.retornoVazio),
      pedagios: lerNumero(dados.pedagios, { campo: "pedagios" }, erros),
      ajudante: lerNumero(dados.ajudante, { campo: "ajudante" }, erros),
      cargaDescarga: lerNumero(dados.cargaDescarga, { campo: "cargaDescarga" }, erros),
      outrasDespesas: lerNumero(dados.outrasDespesas, { campo: "outrasDespesas" }, erros),
      margemPercentual: lerNumero(margemFonte, {
        campo: "margemPercentual",
        obrigatorio: true,
        menorQue: 100,
        vazio: "Informe a margem de lucro.",
        teto: "A margem precisa ser menor que 100%."
      }, erros),
      valorMinimoFrete: lerNumero(minimoFonte, { campo: "valorMinimoFrete" }, erros)
    };

    return {
      ok: Object.keys(erros).length === 0,
      erros: erros,
      valores: valores
    };
  }

  function reconciliar(partes, totalCentavos) {
    var chaves = ["combustivel", "demaisVariaveis", "custoFixo", "extras"];
    var mapa = {};
    var soma = 0;
    var i;
    for (i = 0; i < chaves.length; i += 1) {
      mapa[chaves[i]] = centavos(partes[chaves[i]]);
      soma += mapa[chaves[i]];
    }
    var folga = totalCentavos - soma;
    if (folga !== 0) {
      var alvo = chaves[0];
      for (i = 1; i < chaves.length; i += 1) {
        if (Math.abs(mapa[chaves[i]]) > Math.abs(mapa[alvo])) alvo = chaves[i];
      }
      mapa[alvo] += folga;
    }
    return {
      combustivel: reais(mapa.combustivel),
      demaisVariaveis: reais(mapa.demaisVariaveis),
      custoFixo: reais(mapa.custoFixo),
      extras: reais(mapa.extras)
    };
  }

  function calcularFrete(veiculoFonte, freteFonte) {
    var veiculo = calcularCustosVeiculo(veiculoFonte);
    var entrada = validarEntradaFrete(freteFonte, veiculo.ok ? veiculo.valores : null);
    if (!veiculo.ok || !entrada.ok) {
      return {
        ok: false,
        errosVeiculo: veiculo.erros || {},
        errosFrete: entrada.erros || {}
      };
    }

    var e = entrada.valores;
    var custos = veiculo.custos;
    var kmTotal = e.distanciaIda + e.distanciaRetorno;
    var partes = {
      combustivel: kmTotal * custos.custoCombustivelPorKm,
      demaisVariaveis: kmTotal * (custos.manutencaoPorKm + custos.pneusPorKm + custos.consumiveisPorKm),
      custoFixo: kmTotal * custos.custoFixoPorKm,
      extras: e.pedagios + e.ajudante + e.cargaDescarga + e.outrasDespesas
    };
    var custoTotalPreciso = partes.combustivel + partes.demaisVariaveis + partes.custoFixo + partes.extras;
    var custoTotalCentavos = centavos(custoTotalPreciso);
    var componentes = reconciliar(partes, custoTotalCentavos);
    var custoTotal = reais(custoTotalCentavos);

    // Margem sobre o preço de venda: preço = custo / (1 - margem/100).
    var fator = 1 - e.margemPercentual / 100;
    var precoCalculadoCentavos = centavos(custoTotalPreciso / fator);
    var minimoCentavos = centavos(e.valorMinimoFrete);
    var precoSugeridoCentavos = Math.max(precoCalculadoCentavos, minimoCentavos);
    var precoCalculado = reais(precoCalculadoCentavos);
    var precoSugerido = reais(precoSugeridoCentavos);
    var minimoAplicado = minimoCentavos > precoCalculadoCentavos;
    var lucroCentavos = precoSugeridoCentavos - custoTotalCentavos;
    var lucro = reais(lucroCentavos);
    var margemEfetiva = percentualDeInteiros(lucroCentavos, precoSugeridoCentavos);

    return {
      ok: true,
      errosVeiculo: {},
      errosFrete: {},
      veiculo: veiculo,
      entrada: e,
      resultado: {
        kmTotal: kmTotal,
        distanciaIda: e.distanciaIda,
        distanciaRetorno: e.distanciaRetorno,
        retornoVazio: e.retornoVazio,
        combustivel: componentes.combustivel,
        demaisVariaveis: componentes.demaisVariaveis,
        custoVariavelViagem: reais(centavos(componentes.combustivel) + centavos(componentes.demaisVariaveis)),
        custoFixo: componentes.custoFixo,
        extras: componentes.extras,
        pedagios: e.pedagios,
        ajudante: e.ajudante,
        cargaDescarga: e.cargaDescarga,
        outrasDespesas: e.outrasDespesas,
        custoTotal: custoTotal,
        precoCalculado: precoCalculado,
        precoSugerido: precoSugerido,
        lucro: lucro,
        margemInformada: e.margemPercentual,
        margemEfetiva: margemEfetiva,
        minimoAplicado: minimoAplicado,
        custoPorKm: kmTotal > 0 ? custoTotal / kmTotal : null,
        precoPorKm: kmTotal > 0 ? precoSugerido / kmTotal : null,
        custoCombustivelPorKm: custos.custoCombustivelPorKm,
        custoVariavelPorKm: custos.custoVariavelPorKm,
        custoFixoPorKm: custos.custoFixoPorKm,
        custosFixosMensais: custos.custosFixosMensais
      }
    };
  }

  function formatarNumero(valor, casas, casasMax) {
    var minimo = casas == null ? 2 : casas;
    var maximo = casasMax == null ? minimo : casasMax;
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: minimo,
      maximumFractionDigits: maximo
    }).format(valor);
  }

  function formatarMoeda(valor) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(valor);
  }

  function formatarPercentual(valor) {
    if (valor == null || !Number.isFinite(valor)) return "—";
    return formatarNumero(valor, 2) + "%";
  }

  function formatarDataHora(iso) {
    var data = new Date(iso);
    if (Number.isNaN(data.getTime())) return "—";
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short"
    }).format(data);
  }

  function exemploVeiculo() {
    return {
      nome: "Fiorino exemplo",
      precoCombustivel: 6,
      consumoKmPorLitro: 10,
      manutencaoPorKm: 0.25,
      pneusPorKm: 0,
      consumiveisPorKm: 0,
      seguroMensal: 100,
      ipvaAnual: 1200,
      licenciamentoAnual: 120,
      custosFinanceirosMensais: 0,
      outrasDespesasFixasMensais: 1180,
      kmMensal: 3000,
      margemPercentual: 20,
      valorMinimoFrete: 0
    };
  }

  function exemploFrete() {
    return {
      descricao: "Entrega exemplo",
      distanciaIda: 50,
      distanciaRetorno: 50,
      retornoVazio: false,
      pedagios: 0,
      ajudante: 0,
      cargaDescarga: 0,
      outrasDespesas: 0,
      margemPercentual: 20,
      valorMinimoFrete: 0
    };
  }

  var api = {
    LIMITE: LIMITE,
    roundHalfUp: roundHalfUp,
    centavos: centavos,
    parseNumeroBr: parseNumeroBr,
    validarVeiculo: validarVeiculo,
    calcularCustosVeiculo: calcularCustosVeiculo,
    validarEntradaFrete: validarEntradaFrete,
    calcularFrete: calcularFrete,
    formatarNumero: formatarNumero,
    formatarMoeda: formatarMoeda,
    formatarPercentual: formatarPercentual,
    formatarDataHora: formatarDataHora,
    exemploVeiculo: exemploVeiculo,
    exemploFrete: exemploFrete,
    OBSERVACAO: "Estimativa operacional. O resultado depende dos dados informados e não representa tarifa oficial de frete."
  };

  root.CalculadoraFrete = root.CalculadoraFrete || {};
  root.CalculadoraFrete.calculos = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
