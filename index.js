const express = require('express');
const app = express();

app.use(express.json());

// Banco de dados em memória do servidor (armazena chaves, relógio, pausa e deviceId)
const licenses = new Map();

// Rota raiz
app.get('/', (req, res) => {
    res.status(200).json({ status: 'online', message: 'API de Licenças rodando!' });
});

// 1. GERAR KEY (Com relógio para dias, horas, minutos, segundos)
app.post('/license/create', (req, res) => {
    try {
        const { key, tempo, tipo, dias } = req.body;
        
        if (!key) {
            return res.status(400).json({ status: 'error', message: 'Informe a chave (key).' });
        }

        let milissegundos = 0;
        const qtd = parseFloat(tempo) || parseFloat(dias) || 1;
        const t = (tipo || '').toLowerCase().trim();

        if (t.includes('min') || t === 'm') {
            milissegundos = qtd * 60 * 1000;
        } else if (t.includes('hor') || t === 'h' || t.includes('hora')) {
            milissegundos = qtd * 60 * 60 * 1000;
        } else if (t.includes('seg') || t === 's') {
            milissegundos = qtd * 1000;
        } else {
            milissegundos = qtd * 24 * 60 * 60 * 1000;
        }

        const expiresAt = Date.now() + milissegundos;

        licenses.set(key, {
            expiresAt,
            deviceId: null, // Salva o deviceId do usuário automaticamente no primeiro login
            paused: false
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

// 2. PAUSAR / DESPAUSAR KEY
app.post('/license/toggle', (req, res) => {
    try {
        const { key, paused } = req.body;

        if (!key) {
            return res.status(400).json({ status: 'error', message: 'Chave não informada.' });
        }

        const licenseData = licenses.get(key);
        
        if (!licenseData) {
            return res.status(404).json({ status: 'error', message: 'Chave não encontrada.' });
        }

        licenseData.paused = paused !== undefined ? paused : !licenseData.paused;

        return res.status(200).json({
            status: 'success',
            message: licenseData.paused ? 'Chave pausada!' : 'Chave despausada!',
            key,
            paused: licenseData.paused
        });
    } catch (error) {
        console.error('Erro ao pausar:', error);
        return res.status(500).json({ status: 'error', message: 'Erro interno.' });
    }
});

// 3. DESATIVAR / REMOVER KEY
app.post('/license/disable', (req, res) => {
    try {
        const { key } = req.body;

        if (!key) {
            return res.status(400).json({ status: 'error', message: 'Chave não informada.' });
        }

        const licenseData = licenses.get(key);
        
        if (!licenseData) {
            return res.status(404).json({ status: 'error', message: 'Chave não encontrada.' });
        }

        licenses.delete(key);

        return res.status(200).json({
            status: 'success',
            message: 'Chave desativada e removida com sucesso!',
            key
        });
    } catch (error) {
        console.error('Erro ao desativar:', error);
        return res.status(500).json({ status: 'error', message: 'Erro interno.' });
    }
});

// 4. VALIDAR KEY (Salva o deviceId automaticamente e trava 1 Key para 1 Aparelho)
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

        if (licenseData.paused) {
            return res.status(400).json({ status: 'error', message: 'Esta chave está pausada!' });
        }

        if (Date.now() > licenseData.expiresAt) {
            licenses.delete(key);
            return res.status(400).json({ status: 'error', message: 'Esta chave expirou!' });
        }

        // Salvamento automático do dispositivo: Vincula o primeiro aparelho que logar e trava permanentemente
        if (!licenseData.deviceId) {
            licenseData.deviceId = deviceId;
        } else if (licenseData.deviceId !== deviceId) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Esta chave já está vinculada a outro dispositivo!' 
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Licença válida e dispositivo vinculado com sucesso!',
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
