const express = require('express');
const app = express();

app.use(express.json());

// 1. BANCO DE DADOS DE KEYS (Guarda relógio, expiração e pausa)
const licenses = new Map();

// 2. BANCO DE DADOS DE DISPOSITIVOS SEPARADO (Guarda estritamente qual deviceId usa qual key: Key -> DeviceId)
const deviceDatabase = new Map();

app.get('/', (req, res) => {
    res.status(200).json({ status: 'online', message: 'API rodando perfeitamente!' });
});

// Rota de Gerar Key
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

        // Salva a key no banco de keys
        licenses.set(key, {
            expiresAt,
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
        return res.status(500).json({ status: 'error', message: 'Erro interno ao criar chave' });
    }
});

// Rota para Pausar / Despausar Key
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
        return res.status(500).json({ status: 'error', message: 'Erro interno.' });
    }
});

// Rota para Desativar / Remover Key e limpar o vínculo do dispositivo
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
        deviceDatabase.delete(key); // Remove também do banco de dispositivos

        return res.status(200).json({
            status: 'success',
            message: 'Chave desativada e removida com sucesso!',
            key
        });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: 'Erro interno.' });
    }
});

// Rota de Validação (Usa o Banco de Keys para o relógio e o Banco de Dispositivos Separado para travar 1 Key = 1 Aparelho)
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
            deviceDatabase.delete(key);
            return res.status(400).json({ status: 'error', message: 'Esta chave expirou!' });
        }

        // BANCO DE DADOS DE DISPOSITIVOS SEPARADO:
        // Puxa o aparelho registrado para essa key no banco de dispositivos
        const registeredDevice = deviceDatabase.get(key);

        if (!registeredDevice) {
            // Se nenhum aparelho usou ainda, salva automaticamente o deviceId atual neste banco separado
            deviceDatabase.set(key, deviceId);
        } else if (registeredDevice !== deviceId) {
            // Se o aparelho que está tentando entrar for diferente do que está salvo no banco de dispositivos, bloqueia!
            return res.status(400).json({ 
                status: 'error', 
                message: 'Esta chave já está vinculada a outro dispositivo!' 
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Licença válida e dispositivo vinculado com sucesso!',
            expiresAt: licenseData.expiresAt,
            deviceId: deviceDatabase.get(key)
        });

    } catch (error) {
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
