const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Banco de dados em memória (armazenas as chaves, dias de validade e o deviceId vinculado)
const bancoChaves = {
    // Exemplo de chave criada com 30 dias de validade
    "CHAVE-VIP-30DIAS": {
        diasValidade: 30,
        criadoEm: new Date().toISOString(),
        deviceId: null // Vinculado no primeiro acesso
    },
    // Exemplo de chave criada com 7 dias de validade
    "TESTE-7DIAS": {
        diasValidade: 7,
        criadoEm: new Date().toISOString(),
        deviceId: null // Vinculado no primeiro acesso
    }
};

// Rota inicial de teste
app.get('/', (req, res) => {
    res.json({ status: 'API rodando perfeitamente!' });
};

// Rota para validar a chave e vincular ao dispositivo
app.post('/api/license/validate', (req, res) => {
    const { key, deviceId } = req.body;
    const keyInformativa = key; // Aceita 'key' ou 'chave'

    if (!keyInformativa) {
        return res.status(400).json({
            valid: false,
            message: "Nenhuma chave foi fornecida."
        });
    }

    if (!deviceId) {
        return res.status(400).json({
            valid: false,
            message: "Nenhum ID de dispositivo fornecido."
        });
    }

    const licenca = bancoChaves[keyInformativa];

    if (!licenca) {
        return res.status(400).json({
            valid: false,
            message: "Chave inválida ou não encontrada."
        });
    }

    // Se a chave ainda não tem um dispositivo vinculado, vincula o atual
    if (!licenca.deviceId) {
        licenca.deviceId = deviceId;
    } 
    // Se já tiver um dispositivo vinculado e for diferente, bloqueia o acesso
    else if (licenca.deviceId !== deviceId) {
        return res.status(400).json({
            valid: false,
            message: "Esta chave já está sendo usada em outro dispositivo!"
        });
    }

    // Lógica de cálculo de expiração
    const dataCriacao = new Date(licenca.criadoEm);
    const dataAtual = new Date();
    const diferenca = (dataAtual - dataCriacao) / (1000 * 60 * 60 * 24); // dias

    if (diferenca > licenca.diasValidade) {
        return res.status(400).json({
            valid: false,
            message: "Chave expirada!"
        });
    }

    return res.json({
        valid: true,
        message: "Acesso liberado!"
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
