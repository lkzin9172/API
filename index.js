const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const bancoChaves = {
  "CHAVE-VIP-30DIAS": {
    diasValidade: 30,
    criadoEm: new Date().toISOString(),
    deviceId: null
  },
  "TESTE-7DIAS": {
    diasValidade: 7,
    criadoEm: new Date().toISOString(),
    deviceId: null
  }
};

app.get('/', (req, res) => {
  return res.json({ status: "API rodando perfeitamente!" });
});

app.post('/api/license/validate', (req, res) => {
  const { key, deviceId } = req.body;
  const keyInformativa = key;

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

  if (chaveDados.deviceId && chaveDados.deviceId !== deviceId) {
    return res.status(403).json({
      success: false,
      message: "Esta chave já está em uso em outro dispositivo."
    });
  }

  if (!chaveDados.deviceId) {
    chaveDados.deviceId = deviceId;
  }

  const dataCriacao = new Date(chaveDados.criadoEm);
  const dataExpiracao = new Date(dataCriacao.getTime() + (chaveDados.diasValidade * 24 * 60 * 60 * 1000));
  const agora = new Date();

  if (agora > dataExpiracao) {
    return res.status(403).json({
      success: false,
      message: "Chave expirada!"
    });
  }

  return res.json({
    success: true,
    message: "Acesso liberado!"
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
