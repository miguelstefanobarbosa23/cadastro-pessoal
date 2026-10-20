// ===== Configuração =====
const API_CEP = "https://viacep.com.br/ws";

// ===== Referências aos elementos do DOM =====
const form = document.getElementById("form-cadastro");
const campoNome = document.getElementById("nome");
const campoEmail = document.getElementById("email");
const campoNascimento = document.getElementById("nascimento");
const campoCep = document.getElementById("cep");
const campoNumero = document.getElementById("numero");
const botaoEnviar = document.getElementById("botao-enviar");
const areaMensagem = document.getElementById("mensagem");
const areaResultado = document.getElementById("resultado");

// ===== Funções de interface =====

function mostrarMensagem(texto, tipo) {
  areaMensagem.textContent = texto; // textContent evita injeção de HTML
  areaMensagem.className = `mensagem ${tipo}`;
  areaMensagem.hidden = false;
}

function esconderMensagem() {
  areaMensagem.hidden = true;
  areaMensagem.textContent = "";
}

function limparMarcacoesDeErro() {
  [campoNome, campoEmail, campoNascimento, campoCep, campoNumero].forEach((c) =>
    c.classList.remove("invalido")
  );
}

// Máscara do CEP: transforma 13087000 em 13087-000 enquanto digita
campoCep.addEventListener("input", () => {
  const digitos = campoCep.value.replace(/\D/g, "").slice(0, 8);
  campoCep.value = digitos.length > 5 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos;
});

// ===== Validação dos campos do formulário =====
// Lança um Error (e marca o campo) se algo estiver errado
function validarFormulario() {
  limparMarcacoesDeErro();

  const nome = campoNome.value.trim();
  if (nome.split(/\s+/).length < 2 || nome.length < 5) {
    campoNome.classList.add("invalido");
    throw new Error("Informe seu nome completo (nome e sobrenome).");
  }

  const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!regexEmail.test(campoEmail.value.trim())) {
    campoEmail.classList.add("invalido");
    throw new Error("Digite um e-mail válido, como nome@email.com.");
  }

  if (!campoNascimento.value) {
    campoNascimento.classList.add("invalido");
    throw new Error("Informe a data de nascimento.");
  }
  const nascimento = new Date(campoNascimento.value + "T00:00:00");
  if (nascimento > new Date() || nascimento.getFullYear() < 1900) {
    campoNascimento.classList.add("invalido");
    throw new Error("A data de nascimento é inválida.");
  }

  const cep = campoCep.value.replace(/\D/g, "");
  if (cep.length !== 8) {
    campoCep.classList.add("invalido");
    throw new Error("O CEP deve ter 8 números. Exemplo: 13087-000.");
  }

  if (campoNumero.value.trim() === "") {
    campoNumero.classList.add("invalido");
    throw new Error("Informe o número do endereço (use S/N se não houver).");
  }

  return { nome, cep, nascimento };
}

// ===== Função principal: requisição assíncrona à API ViaCEP =====
async function buscarEndereco(cep) {
  // 1) Requisição com fetch
  const resposta = await fetch(`${API_CEP}/${cep}/json/`);

  // 2) Verifica se a resposta HTTP foi bem-sucedida (status 200–299)
  if (!resposta.ok) {
    throw new Error(`Erro ao consultar o serviço de CEP (código ${resposta.status}).`);
  }

  // 3) Converte o corpo da resposta de JSON para objeto JavaScript
  const dados = await resposta.json();

  // 4) A ViaCEP responde 200 com { "erro": true } quando o CEP não existe
  if (dados.erro) {
    campoCep.classList.add("invalido");
    throw new Error("CEP não encontrado. Confira os números digitados.");
  }

  return dados;
}

// ===== Montagem do card (DOM criado com createElement) =====

function criarLinha(rotulo, valor) {
  const div = document.createElement("div");
  div.className = "dado";
  const span = document.createElement("span");
  span.textContent = rotulo;
  const strong = document.createElement("strong");
  strong.textContent = valor || "—";
  div.append(span, strong);
  return div;
}

function calcularIdade(nascimento) {
  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const jaFezAniversario =
    hoje.getMonth() > nascimento.getMonth() ||
    (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() >= nascimento.getDate());
  if (!jaFezAniversario) idade--;
  return idade;
}

function renderizarCadastro(pessoa, endereco) {
  areaResultado.innerHTML = ""; // limpa o resultado anterior

  const card = document.createElement("article");
  card.className = "card";

  // Cabeçalho com inicial do nome
  const topo = document.createElement("div");
  topo.className = "card-topo";
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = pessoa.nome.charAt(0).toUpperCase();
  const titulos = document.createElement("div");
  const h2 = document.createElement("h2");
  h2.textContent = pessoa.nome;
  const small = document.createElement("small");
  small.textContent = "Cadastro realizado com sucesso";
  titulos.append(h2, small);
  topo.append(avatar, titulos);

  // Corpo com os dados
  const corpo = document.createElement("div");
  corpo.className = "card-corpo";

  const h3Pessoais = document.createElement("h3");
  h3Pessoais.textContent = "Dados pessoais";

  const dataFormatada = pessoa.nascimento.toLocaleDateString("pt-BR");
  const idade = calcularIdade(pessoa.nascimento);

  const h3Endereco = document.createElement("h3");
  h3Endereco.textContent = "Endereço (via CEP)";

  corpo.append(
    h3Pessoais,
    criarLinha("E-mail", pessoa.email),
    criarLinha("Nascimento", `${dataFormatada} (${idade} anos)`),
    h3Endereco,
    criarLinha("Rua", `${endereco.logradouro}, ${pessoa.numero}`),
    criarLinha("Bairro", endereco.bairro),
    criarLinha("Cidade/UF", `${endereco.localidade} - ${endereco.uf}`),
    criarLinha("CEP", endereco.cep)
  );

  card.append(topo, corpo);
  areaResultado.appendChild(card);
}

// ===== Evento de envio do formulário =====
form.addEventListener("submit", async (evento) => {
  evento.preventDefault(); // impede o recarregamento da página

  areaResultado.innerHTML = "";
  esconderMensagem();

  try {
    const { nome, cep, nascimento } = validarFormulario();

    mostrarMensagem("Consultando CEP...", "carregando");
    botaoEnviar.disabled = true;

    const endereco = await buscarEndereco(cep);

    esconderMensagem();
    renderizarCadastro(
      {
        nome,
        email: campoEmail.value.trim(),
        nascimento,
        numero: campoNumero.value.trim(),
      },
      endereco
    );
  } catch (erro) {
    // TypeError no fetch = problema de rede (sem internet, bloqueio etc.)
    if (erro instanceof TypeError) {
      mostrarMensagem("Falha de conexão. Verifique sua internet e tente de novo.", "erro");
    } else {
      mostrarMensagem(erro.message, "erro");
    }
    console.error("Erro no cadastro:", erro);
  } finally {
    botaoEnviar.disabled = false; // executa sempre, com sucesso ou erro
  }
});

/* ===================== CENÁRIOS DE TESTE =====================

   CENÁRIO 1 – ENTRADA VÁLIDA
   Preencha:
     Nome: Maria da Silva
     E-mail: maria@email.com
     Nascimento: 15/03/2008
     CEP: 01310-100   (Av. Paulista, São Paulo - SP)
     Número: 1000
   Resultado esperado: a API responde 200 (resposta.ok = true) e o card
   "Cadastro realizado com sucesso" aparece com e-mail, idade e o endereço
   completo (rua, bairro, cidade/UF) preenchido pela ViaCEP.

   CENÁRIO 2 – ENTRADA INVÁLIDA (simula erro)
   Teste A – CEP inexistente: use 99999-999.
     A ViaCEP responde 200 com { "erro": true } e aparece a mensagem
     vermelha "CEP não encontrado".
   Teste B – CEP incompleto: use 1234.
     A validação interrompe antes do fetch e mostra "O CEP deve ter 8 números".
   Teste C – E-mail inválido: use "maria@" e veja a mensagem de e-mail.
   Dica extra: no DevTools (F12) > Network, marque "Offline" e envie o
   formulário para ver a mensagem de falha de conexão.

   ============================================================= */
