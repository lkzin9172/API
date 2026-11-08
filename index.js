const express = require('express');
const app = express();

app.use(express.json());

// Banco de dados em memória do servidor
const licenses = new Map();

// Rota raiz
app.get('/', (req, res) => {
    res.status(200).json({ status: 'online', message: 'API de Licenças rodando!' });
});

// Rota para criar a key (suporta minutos, horas e dias)
app.post('/license/create', (req, res) => {
    try {
        const { key, tempo, tipo, dias } = req.body;
        
        if (!key) {
            return res.status(400).json({ status: 'error', message: 'Informe a chave (key).' });
        }

        let milissegundos = 0;
        const qtd = parseFloat(tempo) || parseFloat(dias) || 1;
        const t = (tipo || '').toLowerCase();

        // Relógio calculando o tempo exato (segundos, minutos, horas, dias)
        if (t.includes('min') || t === 'm') {
            milissegundos = qtd * 60 * 1000; // Minutos
        } else if (t.includes('hor') || t === 'h' || t.includes('hora')) {
            milissegundos = qtd * 60 * 60 * 1000; // Horas
        } else if (t.includes('seg') || t === 's') {
            milissegundos = qtd * 1000; // Segundos (caso queira testar rápido)
        } else {
            milissegundos = qtd * 24 * 60 * 60 * 1000; // Dias (padrão)
        }

        const expiresAt = Date.now() + milissegundos;

        // Salva no banco de dados do servidor
        licenses.set(key, {
            expiresAt,
            deviceId: null // Fica livre até o primeiro aparelho usar
        });

        return res.status(200).json({
            status: 'success',
            message: 'Chave criada com sucesso!',
            key,
            expiresAt,
            expiraEm: `${qtd} ${tipo || 'dias'}`
        });
    } catch (error) {
        console.error('Erro ao criar:', error);
        return res.status(500).json({ status: 'error', message: 'Erro interno ao criar chave' });
    }
});

// Rota de validação automática (O servidor cuida do relógio e do vínculo do aparelho)
app.post('/license/validate', (req, res) => {
    try {
        const { key, deviceId } = req.body;

        if (!key) {
            return res.status(400).json({ status: 'error', message: 'Chave não informada.' });
        }

        if (!deviceId) {
            return res.status(400).json({ status: 'error', message: 'Device ID não informado.' });
        }

        const licenseData = licenses.get(key);
        
        if (!licenseData) {
            return res.status(404).json({ status: 'error', message: 'Chave inválida ou não encontrada.' });
        }

        // 1. RELÓGIO DE EXPIRAÇÃO: Verifica se o tempo estourou (segundos, minutos, horas ou dias)
        if (Date.now() > licenseData.expiresAt) {
            licenses.delete(key);
            return res.status(400).json({ status: 'error', message: 'Esta chave expirou!' });
        }

        // 2. BANCO DE DADOS DE DISPOSITIVOS: Vincula e protege automaticamente
        if (!licenseData.deviceId) {
            licenseData.deviceId = deviceId; // Vincula o primeiro aparelho que testar
        } else if (licenseData.deviceId !== deviceId) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Esta chave já está vinculada a outro dispositivo!' 
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Licença válida!',
            expiresAt: licenseData.expiresAt,
            deviceId: licenseData.deviceId
        });

    } catch (error) {
        console.error('Erro na validação:', error);
        return res.status(500).json({ status: 'error', message: 'Erro interno.' });
    }
});

process.on('uncaughtException', (err) => {
    console.error('Erro:', err);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
