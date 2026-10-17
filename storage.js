(function (root) {
  "use strict";

  var CHAVE_VEICULO = "fiorino-frete:veiculo";
  var CHAVE_FRETES = "fiorino-frete:fretes";
  var VERSAO = 1;
  var MAX_FRETES = 1000;

  function calculos() {
    return root.CalculadoraFrete.calculos;
  }

  function mensagemAcesso(erro) {
    var nome = erro && erro.name;
    if (nome === "QuotaExceededError" || nome === "NS_ERROR_DOM_QUOTA_REACHED") {
      return "Não há espaço suficiente neste navegador para salvar os dados.";
    }
    return "Não foi possível acessar o armazenamento deste navegador. Os cálculos continuam disponíveis, mas os dados não serão mantidos ao fechar a página.";
  }

  function novoId() {
    if (root.crypto && typeof root.crypto.randomUUID === "function") {
      return root.crypto.randomUUID();
    }
    return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function dataValida(valor) {
    if (typeof valor !== "string") return new Date().toISOString();
    var data = new Date(valor);
    if (Number.isNaN(data.getTime())) return new Date().toISOString();
    return data.toISOString();
  }

  function criarArmazenamento(backend) {
    var store = backend;
    if (!store) {
      try {
        store = root.localStorage;
      } catch (erro) {
        store = null;
      }
    }

    function lerTexto(chave) {
      if (!store) return { ok: false, erro: mensagemAcesso() };
      try {
        return { ok: true, texto: store.getItem(chave) };
      } catch (erro) {
        return { ok: false, erro: mensagemAcesso(erro) };
      }
    }

    function lerJson(chave) {
      var lido = lerTexto(chave);
      if (!lido.ok) return lido;
      if (lido.texto == null || lido.texto === "") return { ok: true, valor: null };
      try {
        return { ok: true, valor: JSON.parse(lido.texto) };
      } catch (erro) {
        return {
          ok: false,
          corrompido: true,
          erro: "Os dados salvos neste navegador estão corrompidos e não foram carregados."
        };
      }
    }

    function gravarJson(chave, valor) {
      if (!store) return { ok: false, erro: mensagemAcesso() };
      try {
        store.setItem(chave, JSON.stringify(valor));
        return { ok: true };
      } catch (erro) {
        return { ok: false, erro: mensagemAcesso(erro) };
      }
    }

    function remover(chave) {
      if (!store) return { ok: false, erro: mensagemAcesso() };
      try {
        store.removeItem(chave);
        return { ok: true };
      } catch (erro) {
        return { ok: false, erro: mensagemAcesso(erro) };
      }
    }

    function lerVeiculo() {
      var lido = lerJson(CHAVE_VEICULO);
      if (!lido.ok) return lido;
      if (lido.valor == null) return { ok: true, valor: null };
      var validado = calculos().validarVeiculo(lido.valor);
      if (!validado.ok) {
        return {
          ok: false,
          corrompido: true,
          erro: "A configuração salva do veículo está inválida e não foi carregada."
        };
      }
      var custos = calculos().calcularCustosVeiculo(validado.valores);
      return { ok: true, valor: validado.valores, custos: custos.custos };
    }

    function salvarVeiculo(fonte) {
      var validado = calculos().validarVeiculo(fonte);
      if (!validado.ok) {
        return { ok: false, erros: validado.erros, erro: "A configuração do veículo tem campos inválidos." };
      }
      var gravado = gravarJson(CHAVE_VEICULO, validado.valores);
      if (!gravado.ok) return gravado;
      return { ok: true, valor: validado.valores };
    }

    function normalizarLista(valor) {
      if (valor == null) return { ok: true, valor: [] };
      if (!Array.isArray(valor)) {
        return {
          ok: false,
          corrompido: true,
          erro: "A lista de fretes salva está inválida e não foi carregada."
        };
      }
      return { ok: true, valor: valor };
    }

    function lerFretes() {
      var lido = lerJson(CHAVE_FRETES);
      if (!lido.ok) return lido;
      var lista = normalizarLista(lido.valor);
      if (!lista.ok) return lista;
      var saida = [];
      var i;
      for (i = 0; i < lista.valor.length; i += 1) {
        var item = lista.valor[i];
        if (!item || typeof item !== "object" || !item.resultado || !item.entrada) {
          return {
            ok: false,
            corrompido: true,
            erro: "A lista de fretes salva está inválida e não foi carregada."
          };
        }
        saida.push(item);
      }
      saida.sort(function (a, b) {
        return String(b.atualizadoEm).localeCompare(String(a.atualizadoEm));
      });
      return { ok: true, valor: saida };
    }

    function fotoVeiculo(calculado) {
      var v = calculado.veiculo.valores;
      return {
        nome: v.nome,
        precoCombustivel: v.precoCombustivel,
        consumoKmPorLitro: v.consumoKmPorLitro,
        manutencaoPorKm: v.manutencaoPorKm,
        pneusPorKm: v.pneusPorKm,
        consumiveisPorKm: v.consumiveisPorKm,
        seguroMensal: v.seguroMensal,
        ipvaAnual: v.ipvaAnual,
        licenciamentoAnual: v.licenciamentoAnual,
        custosFinanceirosMensais: v.custosFinanceirosMensais,
        outrasDespesasFixasMensais: v.outrasDespesasFixasMensais,
        kmMensal: v.kmMensal,
        margemPercentual: v.margemPercentual,
        valorMinimoFrete: v.valorMinimoFrete,
        custos: calculado.veiculo.custos
      };
    }

    function salvarFrete(registro) {
      if (!registro || !registro.entrada || !registro.veiculoUtilizado) {
        return { ok: false, erro: "O orçamento não tem os dados necessários para ser salvo." };
      }
      var calculado = calculos().calcularFrete(registro.veiculoUtilizado, registro.entrada);
      if (!calculado.ok) {
        return { ok: false, erro: "O orçamento tem valores inválidos e não foi salvo." };
      }
      var lista = lerFretes();
      if (!lista.ok) return lista;
      var fretes = lista.valor.slice();
      var id = registro.id && /^[A-Za-z0-9-]{8,80}$/.test(registro.id) ? registro.id : novoId();
      var existente = null;
      var i;
      for (i = 0; i < fretes.length; i += 1) {
        if (fretes[i].id === id) existente = fretes[i];
      }
      var gravavel = {
        id: id,
        criadoEm: existente ? existente.criadoEm : dataValida(registro.criadoEm),
        atualizadoEm: new Date().toISOString(),
        entrada: calculado.entrada,
        veiculoUtilizado: fotoVeiculo(calculado),
        resultado: calculado.resultado
      };
      var proxima = [];
      var substituiu = false;
      for (i = 0; i < fretes.length; i += 1) {
        if (fretes[i].id === id) {
          proxima.push(gravavel);
          substituiu = true;
        } else {
          proxima.push(fretes[i]);
        }
      }
      if (!substituiu) proxima.push(gravavel);
      if (proxima.length > MAX_FRETES) {
        return { ok: false, erro: "O histórico chegou ao limite de 1.000 fretes neste navegador." };
      }
      var gravado = gravarJson(CHAVE_FRETES, proxima);
      if (!gravado.ok) return gravado;
      return { ok: true, frete: gravavel, atualizado: substituiu };
    }

    function excluirFrete(id) {
      var lista = lerFretes();
      if (!lista.ok) return lista;
      var proxima = [];
      var removeu = false;
      var i;
      for (i = 0; i < lista.valor.length; i += 1) {
        if (lista.valor[i].id === id) removeu = true;
        else proxima.push(lista.valor[i]);
      }
      if (!removeu) return { ok: false, erro: "Orçamento não encontrado neste navegador." };
      var gravado = gravarJson(CHAVE_FRETES, proxima);
      if (!gravado.ok) return gravado;
      return { ok: true };
    }

    function exportarBackup() {
      var veiculo = lerVeiculo();
      if (!veiculo.ok) return veiculo;
      var fretes = lerFretes();
      if (!fretes.ok) return fretes;
      return {
        ok: true,
        backup: {
          versao: VERSAO,
          exportadoEm: new Date().toISOString(),
          veiculo: veiculo.valor,
          fretes: fretes.valor
        }
      };
    }

    function normalizarFreteImportado(item, veiculoBackup) {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return { ok: false, erro: "Há um frete com formato inválido no backup." };
      }
      if (!item.entrada || typeof item.entrada !== "object" || Array.isArray(item.entrada)) {
        return { ok: false, erro: "Há um frete sem os dados de entrada no backup." };
      }
      var veiculoFonte = item.veiculoUtilizado || veiculoBackup;
      if (!veiculoFonte || typeof veiculoFonte !== "object") {
        return { ok: false, erro: "Há um frete sem a configuração do veículo usada no cálculo." };
      }
      var calculado = calculos().calcularFrete(veiculoFonte, item.entrada);
      if (!calculado.ok) {
        return { ok: false, erro: "Há um frete com valores inválidos no backup." };
      }
      var id = typeof item.id === "string" && /^[A-Za-z0-9-]{8,80}$/.test(item.id)
        ? item.id
        : novoId();
      return {
        ok: true,
        frete: {
          id: id,
          criadoEm: dataValida(item.criadoEm),
          atualizadoEm: dataValida(item.atualizadoEm),
          entrada: calculado.entrada,
          veiculoUtilizado: fotoVeiculo(calculado),
          resultado: calculado.resultado
        }
      };
    }

    function validarBackup(dados) {
      if (!dados || typeof dados !== "object" || Array.isArray(dados)) {
        return { ok: false, erro: "O arquivo não tem a estrutura de um backup desta calculadora." };
      }
      if (dados.versao !== VERSAO) {
        return { ok: false, erro: "A versão do backup não é compatível com esta calculadora." };
      }
      if (!Array.isArray(dados.fretes)) {
        return { ok: false, erro: "O backup precisa conter a lista de fretes." };
      }
      if (dados.fretes.length > MAX_FRETES) {
        return { ok: false, erro: "O backup tem fretes demais para este aplicativo (máximo de 1.000)." };
      }
      var veiculoNormalizado = null;
      if (dados.veiculo != null) {
        if (typeof dados.veiculo !== "object" || Array.isArray(dados.veiculo)) {
          return { ok: false, erro: "A configuração do veículo no backup é inválida." };
        }
        var veiculo = calculos().validarVeiculo(dados.veiculo);
        if (!veiculo.ok) {
          return { ok: false, erro: "A configuração do veículo no backup é inválida." };
        }
        veiculoNormalizado = veiculo.valores;
      }
      var fretes = [];
      var i;
      for (i = 0; i < dados.fretes.length; i += 1) {
        var frete = normalizarFreteImportado(dados.fretes[i], veiculoNormalizado);
        if (!frete.ok) return frete;
        fretes.push(frete.frete);
      }
      return { ok: true, veiculo: veiculoNormalizado, fretes: fretes };
    }

    function importarBackup(dados, modo) {
      var validado = validarBackup(dados);
      if (!validado.ok) return validado;
      if (modo !== "mesclar" && modo !== "substituir") {
        return { ok: false, erro: "Escolha mesclar os fretes ou substituir os dados deste navegador." };
      }

      if (modo === "substituir") {
        if (validado.veiculo) {
          var veiculoGravado = gravarJson(CHAVE_VEICULO, validado.veiculo);
          if (!veiculoGravado.ok) return veiculoGravado;
        } else {
          var veiculoRemovido = remover(CHAVE_VEICULO);
          if (!veiculoRemovido.ok) return veiculoRemovido;
        }
        var fretesGravados = gravarJson(CHAVE_FRETES, validado.fretes);
        if (!fretesGravados.ok) return fretesGravados;
        return {
          ok: true,
          modo: modo,
          fretes: validado.fretes.length,
          substituiuVeiculo: Boolean(validado.veiculo)
        };
      }

      var atuais = lerFretes();
      if (!atuais.ok) return atuais;
      var ids = {};
      var i;
      for (i = 0; i < atuais.valor.length; i += 1) ids[atuais.valor[i].id] = true;
      var proxima = atuais.valor.slice();
      var incluidos = 0;
      var ignorados = 0;
      for (i = 0; i < validado.fretes.length; i += 1) {
        if (ids[validado.fretes[i].id]) {
          ignorados += 1;
        } else {
          proxima.push(validado.fretes[i]);
          ids[validado.fretes[i].id] = true;
          incluidos += 1;
        }
      }
      if (proxima.length > MAX_FRETES) {
        return { ok: false, erro: "A mesclagem passaria de 1.000 fretes neste navegador." };
      }
      var mesclado = gravarJson(CHAVE_FRETES, proxima);
      if (!mesclado.ok) return mesclado;
      return { ok: true, modo: modo, incluidos: incluidos, ignorados: ignorados };
    }

    function apagarTudo() {
      var veiculo = remover(CHAVE_VEICULO);
      if (!veiculo.ok) return veiculo;
      var fretes = remover(CHAVE_FRETES);
      if (!fretes.ok) return fretes;
      return { ok: true };
    }

    return {
      lerVeiculo: lerVeiculo,
      salvarVeiculo: salvarVeiculo,
      lerFretes: lerFretes,
      salvarFrete: salvarFrete,
      excluirFrete: excluirFrete,
      exportarBackup: exportarBackup,
      validarBackup: validarBackup,
      importarBackup: importarBackup,
      apagarTudo: apagarTudo
    };
  }

  root.CalculadoraFrete = root.CalculadoraFrete || {};
  root.CalculadoraFrete.criarArmazenamento = criarArmazenamento;
})(typeof globalThis !== "undefined" ? globalThis : this);
