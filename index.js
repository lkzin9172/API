const express = require('express');
const app = express();

app.use(express.json());

// Armazena as chaves: key -> { expiresAt, deviceId }
const licenses = new Map();

// Rota de teste raiz
app.get('/', (req, res) => {
    res.status(200).json({ status: 'online', message: 'API rodando perfeitamente!' });
});

// Rota para criar a chave com suporte a minutos, horas ou dias
app.post('/license/create', (req, res) => {
    try {
        const { key, tempo, tipo } = req.body;
        
        if (!key) {
            return res.status(400).json({ status: 'error', message: 'A chave é obrigatória.' });
        }

        const quantidade = parseFloat(tempo) || 1;
        let milissegundos = 0;

        // Define o tempo com base no tipo informado (minuto, hora ou dia)
        if (tipo === 'minuto' || tipo === 'minutos' || tipo === 'm') {
            milissegundos = quantidade * 60 * 1000;
        } else if (tipo === 'hora' || tipo === 'horas' || tipo === 'h') {
            milissegundos = quantidade * 60 * 60 * 1000;
        } else {
            // Padrão é dias (compatível com o que você estava testando)
            milissegundos = quantidade * 24 * 60 * 60 * 1000;
        }

        const expiresAt = Date.now() + milissegundos;

        licenses.set(key, {
            expiresAt,
            deviceId: null
        });

        return res.status(200).json({
            status: 'success',
            message: 'Chave criada com sucesso!',
            key,
            expiresAt,
            expiraEmMinutos: (milissegundos / 60000).toFixed(1)
        });
    } catch (error) {
        console.error('Erro ao criar chave:', error);
        return res.status(500).json({ status: 'error', message: 'Erro interno ao criar chave' });
    }
});

// Rota de validação que verifica rigorosamente se expirou
app.post('/license/validate', (req, res) => {
    try {
        const { key, deviceId } = req.body;

        if (!key) {
            return res.status(400).json({ status: 'error', message: 'Chave não informada.' });
        }

        const licenseData = licenses.get(key);
        
        // Verifica se a chave existe
        if (!licenseData) {
            return res.status(404).json({ status: 'error', message: 'Chave inválida ou não encontrada.' });
        }

        // VERIFICAÇÃO DE EXPIRAÇÃO: Compara o horário atual com o momento que ela vence
        if (Date.now() > licenseData.expiresAt) {
            // Remove a chave expirada da memória
            licenses.delete(key);
            return res.status(400).json({ status: 'error', message: 'Esta chave expirou!' });
        }

        // Vincula o deviceId se necessário
        if (!licenseData.deviceId && deviceId) {
            licenseData.deviceId = deviceId;
        }

        if (licenseData.deviceId && deviceId && licenseData.deviceId !== deviceId) {
            return res.status(400).json({ status: 'error', message: 'Chave vinculada a outro aparelho.' });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Licença válida e ativa!',
            expiresAt: licenseData.expiresAt
        });

    } data_error => {
        console.error('Erro na validação:', error);
        return res.status(500).json({ status: 'error', message: 'Erro interno no servidor.' });
    }
});

// Proteção contra crash
process.on('uncaughtException', (err) => {
    console.error('Erro não tratado:', err);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
