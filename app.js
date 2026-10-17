(function () {
  "use strict";

  var calc = CalculadoraFrete.calculos;
  var exportacao = CalculadoraFrete.exportacao;
  var armazenamento = CalculadoraFrete.criarArmazenamento();

  var IDS_VEICULO = {
    nome: "veiculo-nome",
    precoCombustivel: "preco-combustivel",
    consumoKmPorLitro: "consumo",
    manutencaoPorKm: "manutencao",
    pneusPorKm: "pneus",
    consumiveisPorKm: "consumiveis",
    seguroMensal: "seguro",
    ipvaAnual: "ipva",
    licenciamentoAnual: "licenciamento",
    custosFinanceirosMensais: "financeiros",
    outrasDespesasFixasMensais: "outras-fixas",
    kmMensal: "km-mensal",
    margemPercentual: "margem-veiculo",
    valorMinimoFrete: "minimo-veiculo"
  };

  var IDS_FRETE = {
    descricao: "descricao",
    distanciaIda: "distancia-ida",
    distanciaRetorno: "distancia-retorno",
    pedagios: "pedagios",
    ajudante: "ajudante",
    cargaDescarga: "carga-descarga",
    outrasDespesas: "outras-despesas",
    margemPercentual: "margem-frete",
    valorMinimoFrete: "minimo-frete"
  };

  var CHAVE_POR_ID = {};
  Object.keys(IDS_VEICULO).forEach(function (chave) {
    CHAVE_POR_ID[IDS_VEICULO[chave]] = { grupo: "veiculo", chave: chave };
  });
  Object.keys(IDS_FRETE).forEach(function (chave) {
    CHAVE_POR_ID[IDS_FRETE[chave]] = { grupo: "frete", chave: chave };
  });

  var estado = {
    editando: null,
    exemplo: false,
    freteTocado: false,
    tentou: { veiculo: false, frete: false },
    tocados: {},
    backup: null,
    veiculoSalvo: null
  };

  var temporizadorStatus;

  function $(id) {
    return document.getElementById(id);
  }

  function el(tag, classe, texto) {
    var nodo = document.createElement(tag);
    if (classe) nodo.className = classe;
    if (texto != null) nodo.textContent = texto;
    return nodo;
  }

  function limpar(nodo) {
    while (nodo.firstChild) nodo.removeChild(nodo.firstChild);
  }

  function mostrarStatus(mensagem, tipo) {
    var caixa = $("status");
    caixa.hidden = false;
    caixa.dataset.tipo = tipo || "info";
    caixa.textContent = mensagem;
    window.clearTimeout(temporizadorStatus);
    if (tipo === "ok") {
      temporizadorStatus = window.setTimeout(function () {
        caixa.hidden = true;
      }, 8000);
    }
  }

  function lerTextos(mapa) {
    var saida = {};
    Object.keys(mapa).forEach(function (chave) {
      saida[chave] = $(mapa[chave]).value;
    });
    return saida;
  }

  function lerFrete() {
    var dados = lerTextos(IDS_FRETE);
    dados.retornoVazio = $("retorno-vazio").checked;
    return dados;
  }

  function textoNumero(valor, mostrarZero) {
    if (valor == null || !Number.isFinite(valor)) return "";
    if (valor === 0 && !mostrarZero) return "";
    return calc.formatarNumero(valor, 2);
  }

  function preencherMapa(mapa, valores, mostrarZero) {
    Object.keys(mapa).forEach(function (chave) {
      var campo = $(mapa[chave]);
      if (chave === "nome" || chave === "descricao") {
        campo.value = valores[chave] || "";
        return;
      }
      var obrigatorio = campo.dataset.opcional !== "true";
      campo.value = textoNumero(valores[chave], mostrarZero || obrigatorio);
    });
  }

  function limparInteracao(grupo) {
    estado.tentou[grupo] = false;
    Object.keys(estado.tocados).forEach(function (chave) {
      if (chave.indexOf(grupo + ":") === 0) delete estado.tocados[chave];
    });
  }

  function exibirErros(erros, ids, grupo, brutos) {
    Object.keys(ids).forEach(function (chave) {
      var id = ids[chave];
      var campo = $(id);
      var alvo = $("erro-" + id);
      if (!campo || !alvo) return;
      var mensagem = erros[chave] || "";
      var preenchido = String(brutos[chave] || "").trim() !== "";
      var mostrar = Boolean(mensagem) && (estado.tentou[grupo] || estado.tocados[grupo + ":" + chave] || preenchido);
      alvo.hidden = !mostrar;
      alvo.textContent = mostrar ? mensagem : "";
      if (mostrar) campo.setAttribute("aria-invalid", "true");
      else campo.removeAttribute("aria-invalid");
    });
  }

  function focarPrimeiroErro(erros, ids) {
    var chaves = Object.keys(erros);
    var i;
    for (i = 0; i < chaves.length; i += 1) {
      var campo = $(ids[chaves[i]]);
      if (campo && campo.getAttribute("aria-invalid") === "true") {
        campo.focus();
        return true;
      }
    }
    return false;
  }

  function formatarTaxa(valor) {
    if (valor == null || !Number.isFinite(valor)) return "—";
    return "R$ " + calc.formatarNumero(calc.roundHalfUp(valor, 6), 2, 6);
  }

  function formatarPorKm(valor) {
    if (valor == null || !Number.isFinite(valor)) return "—";
    return "R$ " + calc.formatarNumero(calc.roundHalfUp(valor, 4), 2, 4) + "/km";
  }

  function veiculoAtualDifere() {
    var atual = calc.validarVeiculo(lerTextos(IDS_VEICULO));
    if (!atual.ok || !estado.veiculoSalvo) return atual.ok && !estado.veiculoSalvo;
    return JSON.stringify(atual.valores) !== JSON.stringify(estado.veiculoSalvo);
  }

  function atualizarTela() {
    var brutosVeiculo = lerTextos(IDS_VEICULO);
    var brutosFrete = lerFrete();
    var veiculo = calc.calcularCustosVeiculo(brutosVeiculo);
    var frete = calc.calcularFrete(brutosVeiculo, brutosFrete);
    estado.calculoVeiculo = veiculo;
    estado.calculoFrete = frete;
    exibirErros(veiculo.erros || {}, IDS_VEICULO, "veiculo", brutosVeiculo);
    exibirErros(frete.errosFrete || {}, IDS_FRETE, "frete", brutosFrete);
    renderizarResumo(veiculo);
    renderizarRomaneio(frete, veiculo);
    $("salvar-frete").textContent = estado.editando ? "Atualizar orçamento" : "Salvar orçamento";
  }

  function renderizarResumo(veiculo) {
    var vazio = $("resumo-vazio");
    var lista = $("resumo-lista");
    var nota = $("nota-duplicidade");
    if (!veiculo.ok) {
      vazio.hidden = false;
      lista.hidden = true;
      nota.hidden = true;
    } else {
      var custos = veiculo.custos;
      vazio.hidden = true;
      lista.hidden = false;
      $("resumo-fixos").textContent = calc.formatarMoeda(custos.custosFixosMensais);
      $("resumo-fixo-km").textContent = formatarTaxa(custos.custoFixoPorKm);
      $("resumo-combustivel-km").textContent = formatarTaxa(custos.custoCombustivelPorKm);
      $("resumo-variavel-km").textContent = formatarTaxa(custos.custoVariavelPorKm);
      var memoria = [
        "Seguro " + calc.formatarMoeda(custos.seguroMensal),
        "IPVA e licenciamento " + calc.formatarMoeda(custos.ipvaLicenciamentoMensal)
      ];
      if (custos.custosFinanceirosMensais) {
        memoria.push("custos financeiros " + calc.formatarMoeda(custos.custosFinanceirosMensais));
      }
      memoria.push("outras despesas " + calc.formatarMoeda(custos.outrasDespesasFixasMensais));
      $("resumo-memoria-fixos").textContent = memoria.join(" + ") + ".";
      $("resumo-memoria-variavel").textContent = "Combustível "
        + formatarTaxa(custos.custoCombustivelPorKm)
        + " + manutenção "
        + formatarTaxa(custos.manutencaoPorKm)
        + " + pneus "
        + formatarTaxa(custos.pneusPorKm)
        + " + consumíveis "
        + formatarTaxa(custos.consumiveisPorKm)
        + ".";
      var avisos = [];
      if (custos.custosFinanceirosMensais > 0 && custos.outrasDespesasFixasMensais > 0) {
        avisos.push("Custos financeiros e outras despesas fixas estão preenchidos. Confira se o financiamento não entrou nos dois.");
      }
      if (custos.pneusPorKm > 0 && custos.manutencaoPorKm > 0) {
        avisos.push("Pneus e manutenção estão preenchidos. Confira se o pneu não entrou nos dois.");
      }
      if (custos.consumiveisPorKm > 0 && custos.manutencaoPorKm > 0) {
        avisos.push("Consumíveis e manutenção estão preenchidos. Confira se o óleo não entrou nos dois.");
      }
      nota.hidden = avisos.length === 0;
      nota.textContent = avisos.join(" ");
    }
    var salvo = $("nota-veiculo-salvo");
    if (!estado.veiculoSalvo) {
      salvo.textContent = "Nenhuma configuração salva neste navegador.";
    } else if (veiculoAtualDifere()) {
      salvo.textContent = "Há alterações que ainda não foram salvas neste navegador.";
    } else {
      salvo.textContent = "Configuração salva neste navegador.";
    }
  }

  function renderizarRomaneio(frete) {
    var detalhe = $("detalhe-frete");
    if (!frete.ok) {
      $("preco-sugerido").textContent = "—";
      $("preco-sub").textContent = "Informe o veículo e as distâncias para calcular.";
      $("linha-distancia").hidden = true;
      $("linha-distancia").textContent = "";
      detalhe.hidden = true;
      $("nota-minimo").hidden = true;
      $("nota-edicao").hidden = true;
    } else {
      var r = frete.resultado;
      var e = frete.entrada;
      detalhe.hidden = false;
      $("preco-sugerido").textContent = calc.formatarMoeda(r.precoSugerido);
      $("preco-sub").textContent = calc.formatarNumero(r.kmTotal, 2) + " km considerados";
      $("linha-distancia").hidden = false;
      $("linha-distancia").textContent = calc.formatarNumero(e.distanciaIda, 2)
        + " km de ida + "
        + calc.formatarNumero(e.distanciaRetorno, 2)
        + " km de retorno"
        + (e.retornoVazio ? " · retorno vazio" : "");
      $("linha-combustivel").textContent = calc.formatarMoeda(r.combustivel);
      $("linha-demais").textContent = calc.formatarMoeda(r.demaisVariaveis);
      $("linha-fixos").textContent = calc.formatarMoeda(r.custoFixo);
      $("linha-extras").textContent = calc.formatarMoeda(r.extras);
      $("linha-custo").textContent = calc.formatarMoeda(r.custoTotal);
      $("linha-lucro").textContent = calc.formatarMoeda(r.lucro);
      $("linha-margem").textContent = calc.formatarPercentual(r.margemEfetiva);
      $("linha-custo-km").textContent = formatarPorKm(r.custoPorKm);
      $("linha-preco-km").textContent = formatarPorKm(r.precoPorKm);
      var minimo = $("nota-minimo");
      minimo.hidden = !r.minimoAplicado;
      minimo.textContent = r.minimoAplicado
        ? "O valor mínimo ficou acima do preço calculado pela margem. A margem efetiva foi recalculada."
        : "";
      var edicao = $("nota-edicao");
      if (!estado.editando) {
        edicao.hidden = true;
      } else {
        edicao.hidden = false;
        var precoSalvo = calc.formatarMoeda(estado.editando.resultado.precoSugerido);
        if (calc.centavos(estado.editando.resultado.precoSugerido) === calc.centavos(r.precoSugerido)) {
          edicao.textContent = "Orçamento salvo em " + calc.formatarDataHora(estado.editando.atualizadoEm) + ".";
        } else {
          edicao.textContent = "Salvo em " + calc.formatarDataHora(estado.editando.atualizadoEm)
            + " por " + precoSalvo + ". O preço abaixo usa os dados que estão na tela.";
        }
      }
    }
    var nome = frete.ok && frete.veiculo.valores.nome ? frete.veiculo.valores.nome : "Fiorino";
    var origem = "Usando a configuração atual";
    origem += frete.ok && frete.veiculo.valores.nome ? " de " + nome : " do veículo";
    origem += estado.veiculoSalvo && !veiculoAtualDifere()
      ? ", salva neste navegador."
      : ". Ela ainda pode não estar salva.";
    $("nota-origem-veiculo").textContent = origem;
  }

  function sincronizarRetorno() {
    var retorno = $("distancia-retorno");
    var marcado = $("retorno-vazio").checked;
    retorno.readOnly = marcado;
    if (marcado) retorno.value = $("distancia-ida").value;
  }

  function garantirPadroesFrete() {
    if (estado.freteTocado) return;
    var veiculo = calc.validarVeiculo(lerTextos(IDS_VEICULO));
    if (!veiculo.ok) return;
    if ($("margem-frete").value.trim() === "") {
      $("margem-frete").value = calc.formatarNumero(veiculo.valores.margemPercentual, 2);
    }
    if ($("minimo-frete").value.trim() === "" && veiculo.valores.valorMinimoFrete) {
      $("minimo-frete").value = calc.formatarNumero(veiculo.valores.valorMinimoFrete, 2);
    }
  }

  function definirVisao(visao) {
    ["veiculo", "frete", "historico"].forEach(function (nome) {
      $("painel-" + nome).hidden = nome !== visao;
      var botao = document.querySelector('[data-visao="' + nome + '"]');
      if (nome === visao) botao.setAttribute("aria-current", "page");
      else botao.removeAttribute("aria-current");
    });
    if (visao === "frete") garantirPadroesFrete();
    if (visao === "historico") renderizarHistorico();
    atualizarTela();
  }

  function irPara(visao) {
    if (location.hash !== "#" + visao) location.hash = visao;
    else definirVisao(visao);
  }

  function registroDaTela() {
    var frete = estado.calculoFrete;
    var agora = new Date().toISOString();
    var base = estado.editando;
    var igual = false;
    if (base && frete.ok) {
      igual = calc.centavos(base.resultado.precoSugerido) === calc.centavos(frete.resultado.precoSugerido)
        && base.entrada.descricao === frete.entrada.descricao
        && base.entrada.distanciaIda === frete.entrada.distanciaIda
        && base.entrada.distanciaRetorno === frete.entrada.distanciaRetorno;
    }
    return {
      id: base ? base.id : undefined,
      criadoEm: base ? base.criadoEm : agora,
      atualizadoEm: base ? base.atualizadoEm : agora,
      salvo: igual,
      entrada: frete.entrada,
      veiculoUtilizado: frete.veiculo.valores,
      resultado: frete.resultado
    };
  }

  function exigirFreteValido() {
    estado.tentou.frete = true;
    estado.tentou.veiculo = true;
    atualizarTela();
    if (estado.calculoFrete.ok) return true;
    if (!focarPrimeiroErro(estado.calculoFrete.errosVeiculo || {}, IDS_VEICULO)) {
      if (!focarPrimeiroErro(estado.calculoFrete.errosFrete || {}, IDS_FRETE)) {
        irPara("veiculo");
        focarPrimeiroErro(estado.calculoFrete.errosVeiculo || {}, IDS_VEICULO);
      }
    }
    mostrarStatus("O frete ainda tem campos para corrigir.", "erro");
    return false;
  }

  function salvarConfiguracao(evento) {
    evento.preventDefault();
    estado.tentou.veiculo = true;
    atualizarTela();
    var gravado = armazenamento.salvarVeiculo(lerTextos(IDS_VEICULO));
    if (!gravado.ok) {
      exibirErros(gravado.erros || {}, IDS_VEICULO, "veiculo", lerTextos(IDS_VEICULO));
      focarPrimeiroErro(gravado.erros || {}, IDS_VEICULO);
      mostrarStatus(gravado.erro, "erro");
      return;
    }
    estado.veiculoSalvo = gravado.valor;
    atualizarTela();
    mostrarStatus(
      estado.exemplo
        ? "Exemplo demonstrativo salvo neste navegador. Remova o exemplo se estes não forem os seus dados."
        : "Configuração salva neste navegador.",
      "ok"
    );
  }

  function restaurarVeiculo() {
    var lido = armazenamento.lerVeiculo();
    if (!lido.ok) {
      mostrarStatus(lido.erro, "erro");
      return;
    }
    if (!lido.valor) {
      mostrarStatus("Não há configuração salva neste navegador.", "erro");
      return;
    }
    estado.veiculoSalvo = lido.valor;
    limparInteracao("veiculo");
    preencherMapa(IDS_VEICULO, lido.valor, false);
    estado.exemplo = false;
    atualizarBanner();
    atualizarTela();
    mostrarStatus("Valores salvos restaurados.", "ok");
  }

  function limparVeiculo() {
    limparCamposVeiculo();
    estado.exemplo = false;
    atualizarBanner();
    atualizarTela();
    mostrarStatus("Campos limpos. A configuração salva neste navegador permanece até você salvar de novo.", "ok");
  }

  function preencherExemplo() {
    var veiculo = calc.exemploVeiculo();
    var frete = calc.exemploFrete();
    limparInteracao("veiculo");
    limparInteracao("frete");
    preencherMapa(IDS_VEICULO, veiculo, true);
    preencherMapa(IDS_FRETE, frete, true);
    $("retorno-vazio").checked = false;
    sincronizarRetorno();
    estado.exemplo = true;
    estado.freteTocado = true;
    estado.editando = null;
    atualizarBanner();
    atualizarTela();
    mostrarStatus("Exemplo demonstrativo preenchido. Nada foi salvo ainda.", "ok");
  }

  function exemploConfere(valores, referencia) {
    var chaves = Object.keys(referencia);
    var i;
    for (i = 0; i < chaves.length; i += 1) {
      if (valores[chaves[i]] !== referencia[chaves[i]]) return false;
    }
    return true;
  }

  function limparCamposVeiculo() {
    Object.keys(IDS_VEICULO).forEach(function (chave) {
      $(IDS_VEICULO[chave]).value = "";
    });
    limparInteracao("veiculo");
  }

  function removerExemplo() {
    var referencia = calc.exemploVeiculo();
    var veiculoExemplo = estado.veiculoSalvo && exemploConfere(estado.veiculoSalvo, referencia);
    var fretes = armazenamento.lerFretes();
    var exemplos = [];
    if (fretes.ok) {
      exemplos = fretes.valor.filter(function (frete) {
        return frete.entrada.descricao === "Entrega exemplo"
          && frete.entrada.distanciaIda === 50
          && frete.entrada.distanciaRetorno === 50;
      });
    }
    if ((veiculoExemplo || exemplos.length) && !window.confirm("Apagar os dados de exemplo salvos neste navegador?")) {
      return;
    }
    if (veiculoExemplo) {
      var restante = armazenamento.exportarBackup();
      if (!restante.ok) {
        mostrarStatus(restante.erro, "erro");
        return;
      }
      restante.backup.veiculo = null;
      restante.backup.fretes = (restante.backup.fretes || []).filter(function (frete) {
        return !(frete.entrada.descricao === "Entrega exemplo" && frete.entrada.distanciaIda === 50);
      });
      var substituido = armazenamento.importarBackup(restante.backup, "substituir");
      if (!substituido.ok) {
        mostrarStatus(substituido.erro, "erro");
        return;
      }
    } else if (exemplos.length) {
      var i;
      for (i = 0; i < exemplos.length; i += 1) armazenamento.excluirFrete(exemplos[i].id);
    }
    var lido = armazenamento.lerVeiculo();
    estado.veiculoSalvo = lido.ok ? lido.valor : null;
    limparCamposVeiculo();
    if (estado.veiculoSalvo) preencherMapa(IDS_VEICULO, estado.veiculoSalvo, false);
    estado.exemplo = false;
    atualizarBanner();
    novoFrete(true);
    mostrarStatus("Exemplo removido.", "ok");
  }

  function atualizarBanner() {
    $("banner-exemplo").hidden = !estado.exemplo;
  }

  function salvarOrcamento(evento) {
    if (evento) evento.preventDefault();
    if (!exigirFreteValido()) return;
    var gravado = armazenamento.salvarFrete(registroDaTela());
    if (!gravado.ok) {
      mostrarStatus(gravado.erro, "erro");
      return;
    }
    estado.editando = gravado.frete;
    atualizarTela();
    mostrarStatus(gravado.atualizado ? "Orçamento atualizado neste navegador." : "Orçamento salvo neste navegador.", "ok");
  }

  function novoFrete(silencioso) {
    Object.keys(IDS_FRETE).forEach(function (chave) {
      $(IDS_FRETE[chave]).value = "";
    });
    $("retorno-vazio").checked = false;
    sincronizarRetorno();
    estado.editando = null;
    estado.freteTocado = false;
    limparInteracao("frete");
    garantirPadroesFrete();
    atualizarTela();
    if (!silencioso) mostrarStatus("Formulário pronto para um novo orçamento.", "ok");
  }

  function abrirFrete(frete) {
    limparInteracao("frete");
    preencherMapa(IDS_FRETE, frete.entrada, true);
    $("retorno-vazio").checked = Boolean(frete.entrada.retornoVazio);
    sincronizarRetorno();
    estado.editando = frete;
    estado.freteTocado = true;
    estado.exemplo = false;
    atualizarBanner();
    irPara("frete");
    atualizarTela();
    $("romaneio").focus();
  }

  function pedirExclusao(frete) {
    var nome = frete.entrada.descricao || "este orçamento";
    if (!window.confirm("Excluir " + nome + "? Esta ação não pode ser desfeita.")) return;
    var excluido = armazenamento.excluirFrete(frete.id);
    if (!excluido.ok) {
      mostrarStatus(excluido.erro, "erro");
      return;
    }
    if (estado.editando && estado.editando.id === frete.id) {
      estado.editando = null;
      atualizarTela();
    }
    renderizarHistorico();
    mostrarStatus("Orçamento excluído. A configuração do veículo permanece neste navegador.", "ok");
  }

  function criarAcoes(frete) {
    var caixa = el("div", "acoes-linha");
    caixa.appendChild(elBotao("Abrir", "botao botao-secundario", function () { abrirFrete(frete); }));
    caixa.appendChild(elBotao("PDF", "botao botao-secundario", function () { baixarPdf(frete, true); }));
    caixa.appendChild(elBotao("XLSX", "botao botao-secundario", function () { baixarXlsxFrete(frete, true); }));
    caixa.appendChild(elBotao("Excluir", "botao botao-perigo", function () { pedirExclusao(frete); }));
    return caixa;
  }

  function elBotao(rotulo, classe, aoClicar) {
    var botao = el("button", classe, rotulo);
    botao.type = "button";
    botao.addEventListener("click", aoClicar);
    return botao;
  }

  function renderizarHistorico() {
    var lista = armazenamento.lerFretes();
    var cards = $("historico-cards");
    var corpo = $("historico-corpo");
    limpar(cards);
    limpar(corpo);
    if (!lista.ok) {
      $("contagem-fretes").textContent = lista.erro;
      $("historico-vazio").hidden = false;
      return;
    }
    var fretes = lista.valor;
    $("historico-vazio").hidden = fretes.length !== 0;
    $("contagem-fretes").textContent = fretes.length
      ? fretes.length + (fretes.length === 1 ? " frete salvo neste navegador." : " fretes salvos neste navegador.")
      : "Nenhum frete salvo neste navegador.";
    fretes.forEach(function (frete) {
      var card = el("article", "frete-card");
      card.appendChild(el("h3", "titulo-card", frete.entrada.descricao || "Sem descrição"));
      card.appendChild(el("p", "preco-lista", calc.formatarMoeda(frete.resultado.precoSugerido)));
      card.appendChild(el(
        "p",
        "meta-card",
        calc.formatarNumero(frete.resultado.kmTotal, 2) + " km · " + calc.formatarDataHora(frete.atualizadoEm)
      ));
      card.appendChild(criarAcoes(frete));
      cards.appendChild(card);

      var linha = el("tr");
      linha.appendChild(el("td", null, frete.entrada.descricao || "Sem descrição"));
      linha.appendChild(el("td", null, calc.formatarDataHora(frete.atualizadoEm)));
      var km = el("td", "num", calc.formatarNumero(frete.resultado.kmTotal, 2));
      var preco = el("td", "num", calc.formatarMoeda(frete.resultado.precoSugerido));
      var acoes = el("td");
      acoes.appendChild(criarAcoes(frete));
      linha.appendChild(km);
      linha.appendChild(preco);
      linha.appendChild(acoes);
      corpo.appendChild(linha);
    });
  }

  function baixarPdf(registro, salvo) {
    var saida = exportacao.exportarPdf(
      Object.assign({}, registro, { salvo: Boolean(salvo) }),
      exportacao.nomeArquivo("frete-fiorino", registro.entrada.descricao, "pdf")
    );
    mostrarStatus(saida.ok ? "PDF exportado." : saida.erro, saida.ok ? "ok" : "erro");
  }

  function baixarXlsxFrete(registro, salvo) {
    var saida = exportacao.exportarXlsx(
      exportacao.montarPlanilhasOrcamento(Object.assign({}, registro, { salvo: Boolean(salvo) })),
      exportacao.nomeArquivo("frete-fiorino", registro.entrada.descricao, "xlsx")
    );
    mostrarStatus(saida.ok ? "XLSX exportado." : saida.erro, saida.ok ? "ok" : "erro");
  }

  function exportarDaTela(tipo) {
    if (!exigirFreteValido()) return;
    var registro = registroDaTela();
    if (tipo === "pdf") baixarPdf(registro, registro.salvo);
    else baixarXlsxFrete(registro, registro.salvo);
  }

  function exportarConfiguracao() {
    estado.tentou.veiculo = true;
    atualizarTela();
    if (!estado.calculoVeiculo.ok) {
      focarPrimeiroErro(estado.calculoVeiculo.erros, IDS_VEICULO);
      mostrarStatus("A configuração tem campos para corrigir.", "erro");
      return;
    }
    var fonte = Object.assign({}, estado.calculoVeiculo.valores, { custos: estado.calculoVeiculo.custos });
    var saida = exportacao.exportarXlsx(
      [exportacao.montarPlanilhaConfiguracao(fonte)],
      exportacao.nomeArquivo("configuracao-fiorino", fonte.nome, "xlsx")
    );
    mostrarStatus(saida.ok ? "Configurações exportadas com os valores da tela." : saida.erro, saida.ok ? "ok" : "erro");
  }

  function exportarTodos() {
    var fretes = armazenamento.lerFretes();
    if (!fretes.ok) {
      mostrarStatus(fretes.erro, "erro");
      return;
    }
    var veiculo = armazenamento.lerVeiculo();
    if (!veiculo.ok) {
      mostrarStatus(veiculo.erro, "erro");
      return;
    }
    var fonte = veiculo.valor ? Object.assign({}, veiculo.valor, { custos: veiculo.custos }) : null;
    var saida = exportacao.exportarXlsx(
      exportacao.montarPlanilhasLista(fretes.valor, fonte),
      exportacao.nomeArquivo("fretes-fiorino", "historico", "xlsx")
    );
    mostrarStatus(saida.ok ? "Planilha dos fretes salvos exportada." : saida.erro, saida.ok ? "ok" : "erro");
  }

  function exportarBackup() {
    var backup = armazenamento.exportarBackup();
    if (!backup.ok) {
      mostrarStatus(backup.erro, "erro");
      return;
    }
    var blob = new Blob([JSON.stringify(backup.backup, null, 2)], { type: "application/json" });
    exportacao.baixarBlob(blob, exportacao.nomeArquivo("backup-fiorino", "dados", "json"));
    mostrarStatus("Backup JSON exportado. Ele vale só como arquivo seu, sem sincronização.", "ok");
  }

  function lerArquivoBackup(evento) {
    var arquivo = evento.target.files && evento.target.files[0];
    estado.backup = null;
    $("resumo-backup").hidden = true;
    if (!arquivo) return;
    if (arquivo.size > 2000000) {
      mostrarStatus("O arquivo é grande demais para este backup.", "erro");
      return;
    }
    var leitor = new FileReader();
    leitor.onload = function () {
      var dados;
      try {
        dados = JSON.parse(String(leitor.result));
      } catch (erro) {
        mostrarStatus("O arquivo não é um JSON válido.", "erro");
        return;
      }
      var validado = armazenamento.validarBackup(dados);
      if (!validado.ok) {
        mostrarStatus(validado.erro, "erro");
        return;
      }
      estado.backup = dados;
      $("texto-backup").textContent = "Backup válido: "
        + (validado.veiculo ? "configuração do veículo" : "sem configuração de veículo")
        + " e "
        + validado.fretes.length
        + (validado.fretes.length === 1 ? " frete." : " fretes.")
        + " Escolha mesclar os fretes ou substituir os dados deste navegador.";
      $("resumo-backup").hidden = false;
    };
    leitor.onerror = function () {
      mostrarStatus("Não foi possível ler o arquivo.", "erro");
    };
    leitor.readAsText(arquivo);
  }

  function aplicarBackup(modo) {
    if (!estado.backup) {
      mostrarStatus("Escolha um arquivo de backup válido.", "erro");
      return;
    }
    if (modo === "substituir" && !window.confirm("Substituir a configuração e os fretes deste navegador pelos dados do backup?")) {
      return;
    }
    var resultado = armazenamento.importarBackup(estado.backup, modo);
    if (!resultado.ok) {
      mostrarStatus(resultado.erro, "erro");
      return;
    }
    var veiculo = armazenamento.lerVeiculo();
    estado.veiculoSalvo = veiculo.ok ? veiculo.valor : null;
    if (estado.veiculoSalvo) preencherMapa(IDS_VEICULO, estado.veiculoSalvo, false);
    estado.backup = null;
    $("arquivo-backup").value = "";
    $("resumo-backup").hidden = true;
    renderizarHistorico();
    atualizarTela();
    if (modo === "mesclar") {
      mostrarStatus("Mesclagem concluída: " + resultado.incluidos + " fretes incluídos e " + resultado.ignorados + " já existentes.", "ok");
    } else {
      mostrarStatus("Dados deste navegador substituídos pelo backup.", "ok");
    }
  }

  function apagarDados() {
    if (!$("confirmar-apagar").checked) return;
    if (!window.confirm("Apagar a configuração e os fretes salvos neste navegador?")) return;
    var apagado = armazenamento.apagarTudo();
    if (!apagado.ok) {
      mostrarStatus(apagado.erro, "erro");
      return;
    }
    estado.veiculoSalvo = null;
    estado.editando = null;
    estado.exemplo = false;
    $("confirmar-apagar").checked = false;
    $("apagar-dados").disabled = true;
    limparVeiculo();
    novoFrete(true);
    renderizarHistorico();
    mostrarStatus("Configuração e fretes apagados deste navegador.", "ok");
  }

  function aplicarTema(tema) {
    if (tema) document.documentElement.setAttribute("data-theme", tema);
    else document.documentElement.removeAttribute("data-theme");
    var escuro = document.documentElement.getAttribute("data-theme") === "dark"
      || (!document.documentElement.getAttribute("data-theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    $("rotulo-tema").textContent = escuro ? "Tema claro" : "Tema escuro";
  }

  function alternarTema() {
    var atual = document.documentElement.getAttribute("data-theme");
    var escuroAgora = atual === "dark" || (!atual && window.matchMedia("(prefers-color-scheme: dark)").matches);
    var proximo = escuroAgora ? "light" : "dark";
    try {
      localStorage.setItem("fiorino-frete:tema", proximo);
    } catch (erro) {
      mostrarStatus("Não foi possível guardar a preferência de tema neste navegador.", "erro");
    }
    aplicarTema(proximo);
  }

  function avisarBibliotecas() {
    var pdf = Boolean(window.jspdf && window.jspdf.jsPDF);
    var xlsx = Boolean(window.XLSX && window.XLSX.utils);
    if (pdf && xlsx) return;
    var aviso = $("aviso-bibliotecas");
    aviso.hidden = false;
    aviso.dataset.tipo = "erro";
    var faltas = [];
    if (!pdf) faltas.push("PDF");
    if (!xlsx) faltas.push("XLSX");
    aviso.textContent = "A exportação em " + faltas.join(" e ")
      + " está indisponível porque a biblioteca não carregou. Os cálculos e os dados salvos neste navegador continuam funcionando.";
  }

  function marcarToque(evento) {
    var mapa = CHAVE_POR_ID[evento.target.id];
    if (!mapa) return;
    estado.tocados[mapa.grupo + ":" + mapa.chave] = true;
    if (mapa.grupo === "frete") estado.freteTocado = true;
    if (estado.exemplo && evento.isTrusted) {
      estado.exemplo = false;
      atualizarBanner();
    }
  }

  function aoDigitar(evento) {
    marcarToque(evento);
    if (evento.target.id === "distancia-ida" || evento.target.id === "retorno-vazio") sincronizarRetorno();
    atualizarTela();
  }

  function aoSair(evento) {
    var campo = evento.target;
    if (!campo.dataset || !campo.dataset.casas) return;
    if (campo.value.trim() === "") return;
    var lido = calc.parseNumeroBr(campo.value);
    if (!lido.ok) return;
    campo.value = calc.formatarNumero(lido.valor, Number(campo.dataset.casas));
    if (campo.id === "distancia-ida") sincronizarRetorno();
    atualizarTela();
  }

  function marcarAjudaAberta(botao, aberta) {
    var campo = botao.closest(".campo");
    var grupo = botao.closest(".grupo");
    if (campo) campo.classList.toggle("ajuda-aberta", aberta);
    if (grupo) grupo.classList.toggle("ajuda-aberta", aberta);
  }

  function fecharAjudas(exceto) {
    var abertos = document.querySelectorAll(".duvida[aria-expanded='true']");
    var i;
    for (i = 0; i < abertos.length; i += 1) {
      if (abertos[i] === exceto) continue;
      abertos[i].setAttribute("aria-expanded", "false");
      marcarAjudaAberta(abertos[i], false);
      var painel = document.getElementById(abertos[i].getAttribute("aria-controls"));
      if (painel) painel.hidden = true;
    }
  }

  function alternarAjuda(botao) {
    var aberto = botao.getAttribute("aria-expanded") === "true";
    fecharAjudas(botao);
    var painel = document.getElementById(botao.getAttribute("aria-controls"));
    botao.setAttribute("aria-expanded", aberto ? "false" : "true");
    marcarAjudaAberta(botao, !aberto);
    if (painel) painel.hidden = aberto;
  }

  function aoFocar(evento) {
    var alvo = evento.target;
    if (!(alvo instanceof HTMLInputElement) && !(alvo instanceof HTMLTextAreaElement)) return;
    if (window.innerWidth > 800) return;
    var reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(function () {
      alvo.scrollIntoView({ block: "center", behavior: reduzir ? "auto" : "smooth" });
    }, 80);
  }

  function iniciar() {
    var veiculo = armazenamento.lerVeiculo();
    if (!veiculo.ok) mostrarStatus(veiculo.erro, "erro");
    else if (veiculo.valor) {
      estado.veiculoSalvo = veiculo.valor;
      preencherMapa(IDS_VEICULO, veiculo.valor, false);
    }
    var fretes = armazenamento.lerFretes();
    if (!fretes.ok) mostrarStatus(fretes.erro, "erro");

    $("form-veiculo").addEventListener("submit", salvarConfiguracao);
    $("form-frete").addEventListener("submit", salvarOrcamento);
    $("form-veiculo").addEventListener("input", aoDigitar);
    $("form-frete").addEventListener("input", aoDigitar);
    $("form-veiculo").addEventListener("focusout", aoSair);
    $("form-frete").addEventListener("focusout", aoSair);
    document.addEventListener("focusin", aoFocar);
    document.addEventListener("click", function (evento) {
      var botao = evento.target.closest(".duvida");
      if (botao) {
        evento.preventDefault();
        alternarAjuda(botao);
        return;
      }
      if (!evento.target.closest(".rotulo .ajuda")) fecharAjudas();
    });
    document.addEventListener("keydown", function (evento) {
      if (evento.key === "Escape") fecharAjudas();
    });

    $("restaurar-veiculo").addEventListener("click", restaurarVeiculo);
    $("preencher-exemplo").addEventListener("click", preencherExemplo);
    $("limpar-veiculo").addEventListener("click", limparVeiculo);
    $("remover-exemplo").addEventListener("click", removerExemplo);
    $("exportar-configuracao").addEventListener("click", exportarConfiguracao);
    $("copiar-padroes").addEventListener("click", function () {
      var veiculo = calc.validarVeiculo(lerTextos(IDS_VEICULO));
      if (!veiculo.ok) {
        estado.tentou.veiculo = true;
        atualizarTela();
        irPara("veiculo");
        focarPrimeiroErro(veiculo.erros, IDS_VEICULO);
        mostrarStatus("Preencha a configuração do veículo antes de copiar a margem.", "erro");
        return;
      }
      $("margem-frete").value = calc.formatarNumero(veiculo.valores.margemPercentual, 2);
      $("minimo-frete").value = veiculo.valores.valorMinimoFrete
        ? calc.formatarNumero(veiculo.valores.valorMinimoFrete, 2)
        : "";
      estado.freteTocado = true;
      atualizarTela();
      mostrarStatus("Margem e mínimo copiados da configuração atual do veículo.", "ok");
    });
    $("ver-preco").addEventListener("click", function () {
      if (!exigirFreteValido()) return;
      $("romaneio").focus();
    });
    $("novo-frete").addEventListener("click", function () { novoFrete(false); });
    $("exportar-pdf").addEventListener("click", function () { exportarDaTela("pdf"); });
    $("exportar-xlsx").addEventListener("click", function () { exportarDaTela("xlsx"); });
    $("exportar-backup").addEventListener("click", exportarBackup);
    $("exportar-todos").addEventListener("click", exportarTodos);
    $("arquivo-backup").addEventListener("change", lerArquivoBackup);
    $("mesclar-backup").addEventListener("click", function () { aplicarBackup("mesclar"); });
    $("substituir-backup").addEventListener("click", function () { aplicarBackup("substituir"); });
    $("confirmar-apagar").addEventListener("change", function () {
      $("apagar-dados").disabled = !$("confirmar-apagar").checked;
    });
    $("apagar-dados").addEventListener("click", apagarDados);
    $("alternar-tema").addEventListener("click", alternarTema);
    $("retorno-vazio").addEventListener("change", function () {
      estado.freteTocado = true;
      sincronizarRetorno();
      atualizarTela();
    });

    document.querySelectorAll("[data-visao]").forEach(function (botao) {
      botao.addEventListener("click", function () {
        irPara(botao.getAttribute("data-visao"));
      });
    });
    window.addEventListener("hashchange", function () {
      var visao = (location.hash || "#veiculo").replace("#", "");
      if (visao !== "veiculo" && visao !== "frete" && visao !== "historico") visao = "veiculo";
      definirVisao(visao);
    });

    aplicarTema(document.documentElement.getAttribute("data-theme"));
    avisarBibliotecas();
    var inicial = (location.hash || "").replace("#", "");
    if (inicial !== "veiculo" && inicial !== "frete" && inicial !== "historico") {
      inicial = estado.veiculoSalvo ? "frete" : "veiculo";
      history.replaceState(null, "", "#" + inicial);
    }
    definirVisao(inicial);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
