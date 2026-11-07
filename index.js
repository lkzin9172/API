const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Banco de dados em memória (Armazena as chaves, dias de validade e data de criação)
const bancoChaves = {
  // Exemplo de chave criada com 30 dias de validade
  "CHAVE-VIP-30DIAS": {
    diasValidade: 30,
    criadoEm: new Date().toISOString()
  },
  // Exemplo de chave criada com 7 dias de validade
  "TESTE-7DIAS": {
    diasValidade: 7,
    criadoEm: new Date().toISOString()
  }
};

// Rota inicial de teste
app.get('/', (req, res) => {
  res.json({ status: 'API rodando perfeitamente!' });
});

// Rota para validar a chave (O app chama essa rota)
app.post('/api/license/validate', (req, res) => {
  const { key, chave } = req.body;
  const keyInformada = key || chave; // Aceita 'key' ou 'chave' no corpo da requisição

  if (!keyInformada) {
    return res.status(400).json({ 
      valid: false, 
      message: 'Nenhuma chave foi fornecida.' 
    });
  }

  const licenca = bancoChaves[keyInformada];

  if (!licenca) {
    return res.status(401).json({ 
      valid: false, 
      message: 'Chave inválida ou não encontrada.' 
    });
  }

  // Lógica de cálculo de expiração
  const dataCriacao = new Date(licenca.criadoEm);
  const dataAtual = new Date();
  const diferencaTempo = dataAtual - dataCriacao;
  const diasDecorridos = diferencaTempo / (1000 * 60 * 60 * 24);

  if (diasDecorridos > licenca.diasValidade) {
    return res.status(401).json({ 
      valid: false, 
      message: 'Sua chave expirou.' 
    });
  }

  const diasRestantes = Math.ceil(licenca.diasValidade - diasDecorridos);

  return res.json({ 
    valid: true, 
    message: `Acesso liberado! Restam ${diasRestantes} dia(s).` 
  });
});

// Rota para você criar novas chaves (Exemplo de uso: enviar key e dias no JSON)
app.post('/api/license/create', (req, res) => {
  const { key, dias } = req.body;

  if (!key || !dias) {
    return res.status(400).json({ erro: 'Informe a chave (key) e os dias de validade (dias).' });
  }

  bancoChaves[key] = {
    diasValidade: Number(dias),
    criadoEm: new Date().toISOString()
  };

  return res.json({ 
    sucesso: true, 
    mensagem: `Chave '${key}' criada com sucesso por ${dias} dias!` 
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
