const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Banco de dados em memória (armazena as chaves, dias de validade e o deviceId)
const bancoChaves = {
  // Exemplo de chave criada com 30 dias de validade
  "CHAVE-VIP-30DIAS": {
    diasValidade: 30,
    criadoEm: new Date().toISOString(),
    deviceId: null // Vinculado no primeiro acesso
  },
  // Exemplo de chave criada com 7 dias de validade
  "TESTE-70IAS": {
    diasValidade: 7,
    criadoEm: new Date().toISOString(),
    deviceId: null // Vinculado no primeiro acesso
  }
};

// Rota inicial de teste
app.get('/', (req, res) => {
  res.json({ status: "API rodando perfeitamente!" });
});

// Rota para validar a chave e vincular ao dispositivo
app.post('/api/license/validate', (req, res) => {
  const { key, deviceId } = req.body;
  const keyInformativa = key; // Aceita 'key' ou 'chave'

  if (!keyInformativa) {
    return res.status(400).json({
      success: false,
      message: "Nenhuma chave foi fornecida."
    });
  }

  if (!deviceId) {
    return res.status(400).json({
      success: false,
      message: "Nenhum ID de dispositivo fornecido."
    });
  }

  const chaveDados = bancoChaves[keyInformativa];

  if (!chaveDados) {
    return res.status(404).json({
      success: false,
      message: "Chave inválida."
    });
  }

  // Se a chave já tem um deviceId vinculado, verifica se é o mesmo
  if (chaveDados.deviceId && chaveDados.deviceId !== deviceId) {
    return res.status(403).json({
      success: false,
      message: "Esta chave já está em uso em outro dispositivo."
    });
  }

  // Se não tem deviceId vinculado, vincula agora
  if (!chaveDados.deviceId) {
    chaveDados.deviceId = deviceId;
  }

  // Calcula a data de expiração com base nos dias de validade
  const dataCriacao = new Date(chaveDados.criadoEm);
  const dataExpiracao = new Date(dataCriacao.getTime() + chaveDados.diasValidade * 24 * 60 * 60 * 1000);
  const agora = new Date();

  if (agora > dataExpiracao) {
    return res.status(403).json({
      success: false,
      message: "Chave expirada."
    });
  }

  return res.json({
    success: true,
    message: "Licença validada com sucesso!",
    expiresAt: dataExpiracao.toISOString()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
