const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Banco de dados em memória (Armazena as chaves, dias, status, data de criação e o device_id vinculado)
const bancoChaves = {
  // Exemplo de chave criada com 30 dias de validade
  "CHAVE-VIP-30DIAS": {
    diasValidade: 30,
    criadoEm: new Date().toISOString(),
    status: "ativo", // "ativo", "pausado", "desativado"
    device_id: null
  },
  // Exemplo de chave criada com 7 dias de validade
  "TESTE-7DIAS": {
    diasValidade: 7,
    criadoEm: new Date().toISOString(),
    status: "ativo",
    device_id: null
  }
};

// Rota inicial de teste
app.get('/', (req, res) => {
  res.json({ status: 'API rodando perfeitamente!' });
});

// Rota para validar a chave (O app chama essa rota)
app.post('/api/license/validate', (req, res) => {
  const { key, chave, device_id, deviceId } = req.body;
  const keyInformada = key || chave; 
  const idDispositivo = device_id || deviceId; 

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

  // Verifica se a chave está pausada ou desativada
  if (licenca.status === 'pausado') {
    return res.status(403).json({ valid: false, message: 'Esta chave está pausada no momento.' });
  }
  if (licenca.status === 'desativado') {
    return res.status(403).json({ valid: false, message: 'Esta chave foi desativada permanentemente.' });
  }

  // Lógica de cálculo de expiração (Validade)
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

  // Lógica de Vínculo de Dispositivo único (1 Key = 1 Aparelho)
  if (idDispositivo) {
    if (licenca.device_id) {
      if (licenca.device_id !== idDispositivo) {
        return res.status(403).json({ 
          valid: false, 
          message: 'Chave ou dispositivo não autorizado! Esta chave já está em uso em outro aparelho.' 
        });
      }
    } else {
      // Se ainda não tem dono, vincula permanentemente a este dispositivo
      licenca.device_id = idDispositivo;
    }
  }

  const diasRestantes = Math.ceil(licenca.diasValidade - diasDecorridos);

  return res.json({ 
    valid: true, 
    message: `Acesso liberado! Restam ${diasRestantes} dia(s).` 
  });
});

// Rota padrão exigida pelo APK (/api/license/verify)
app.post('/api/license/verify', (req, res) => {
  return app._router.handle(Object.assign(req, { url: '/api/license/validate', method: 'POST' }), res);
});

// Rota para você criar novas chaves
app.post('/api/license/create', (req, res) => {
  const { key, dias } = req.body;

  if (!key || !dias) {
    return res.status(400).json({ erro: 'Informe a chave (key) e os dias de validade (dias).' });
  }

  bancoChaves[key] = {
    diasValidade: Number(dias),
    criadoEm: new Date().toISOString(),
    status: "ativo",
    device_id: null
  };

  return res.json({ 
    sucesso: true, 
    mensagem: `Chave '${key}' criada com sucesso por ${dias} dias!` 
  });
});

// Rota para Pausar a Key
app.post('/api/license/pause', (req, res) => {
  const { key, chave } = req.body;
  const keyInformada = key || chave;

  if (!keyInformada || !bancoChaves[keyInformada]) {
    return res.status(404).json({ sucesso: false, mensagem: 'Chave não encontrada.' });
  }

  bancoChaves[keyInformada].status = 'pausado';
  return res.json({ sucesso: true, mensagem: 'Chave pausada com sucesso!' });
});

// Rota para Desativar a Key
app.post('/api/license/disable', (req, res) => {
  const { key, chave } = req.body;
  const keyInformada = key || chave;

  if (!keyInformada || !bancoChaves[keyInformada]) {
    return res.status(404).json({ sucesso: false, mensagem: 'Chave não encontrada.' });
  }

  bancoChaves[keyInformada].status = 'desativado';
  return res.json({ sucesso: true, mensagem: 'Chave desativada com sucesso!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
