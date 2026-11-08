const express = require('express');
const app = express();

app.use(express.json());

// Banco de dados em memória do servidor (armazena key, expiresAt, deviceId e paused)
const licenses = new Map();

// Rota raiz para teste de status
app.get('/', (req, res) => {
    res.status(200).json({ status: 'online', message: 'API de Licenças rodando perfeitamente!' });
});

// 1. ROTA DE GERAR KEY (Suporte a segundos, minutos, horas e dias)
app.post('/license/create', (req, res) => {
    try {
        const { key, tempo, tipo, dias } = req.body;
        
        if (!key) {
            return res.status(400).json({ status: 'error', message: 'Informe a chave (key).' });
        }

        let milissegundos = 0;
        const qtd = parseFloat(tempo) || parseFloat(dias) || 1;
        const t = (tipo || '').toLowerCase().trim();

        // Cálculo exato de tempo em milissegundos
        if (t.includes('min') || t === 'm') {
            milissegundos = qtd * 60 * 1000; // Minutos
        } else if (t.includes('hor') || t === 'h' || t.includes('hora')) {
            milissegundos = qtd * 60 * 60 * 1000; // Horas
        } else if (t.includes('seg') || t === 's') {
            milissegundos = qtd * 1000; // Segundos (ótimo para testes rápidos)
        } else {
            milissegundos = qtd * 24 * 60 * 60 * 1000; // Dias (padrão)
        }

        const expiresAt = Date.now() + milissegundos;

        licenses.set(key, {
            expiresAt,
            deviceId: null, // Banco de dados do dispositivo começa livre
            paused: false   // Chave começa ativa
        });

        return res.status(200).json({
            status: 'success',
            message: 'Chave criada com sucesso!',
            key,
            expiresAt,
            expiraEm: `${qtd} ${tipo || 'dias'}`
        });
    } catch (error) {
        console.error('Erro ao criar chave:', error);
        return res.status(500).json({ status: 'error', message: 'Erro interno ao criar chave' });
    }
});

// 2. ROTA DE PAUSAR / DESPAUSAR KEY
app.post('/license/toggle', (req, res) => {
    try {
        const { key, paused } = req.body;

        if (!key) {
            return res.status(400).json({ status: 'error', message: 'Chave não informada.' });
        }

        const licenseData = licenses.get(key);
        
        if (!licenseData) {
            return res.status(404).json({ status: 'error', message: 'Chave inválida ou não encontrada.' });
        }

        licenseData.paused = paused !== undefined ? paused : !licenseData.paused;

        return res.status(200).json({
            status: 'success',
            message: licenseData.paused ? 'Chave pausada com sucesso!' : 'Chave despausada com sucesso!',
            key,
            paused: licenseData.paused
        });
    } catch (error) {
        console.error('Erro ao pausar chave:', error);
        return res.status(500).json({ status: 'error', message: 'Erro interno.' });
    }
});

// 3. ROTA DE DESATIVAR / REMOVER KEY
app.post('/license/disable', (req, res) => {
    try {
        const { key } = req.body;

        if (!key) {
            return res.status(400).json({ status: 'error', message: 'Chave não informada.' });
        }

        const licenseData = licenses.get(key);
        
        if (!licenseData) {
            return res.status(404).json({ status: 'error', message: 'Chave inválida ou já desativada.' });
        }

        licenses.delete(key);

        return res.status(200).json({
            status: 'success',
            message: 'Chave desativada e removida com sucesso!',
            key
        });
    } catch (error) {
        console.error('Erro ao desativar chave:', error);
        return res.status(500).json({ status: 'error', message: 'Erro interno.' });
    }
});

// 4. ROTA DE VALIDAÇÃO (Relógio de Expiração + Banco de Dados de Dispositivos 1 para 1)
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
            return res.status(404).json({ status: 'error', message: 'Chave inválida, expirada ou não encontrada.' });
        }

        // Verifica se a chave foi pausada manualmente
        if (licenseData.paused) {
            return res.status(400).json({ status: 'error', message: 'Esta chave está pausada no momento!' });
        }

        // Relógio de Expiração: Se passou do tempo, deleta a key e barra o acesso
        if (Date.now() > licenseData.expiresAt) {
            licenses.delete(key);
            return res.status(400).json({ status: 'error', message: 'Esta chave expirou e foi desativada!' });
        }

        // Banco de Dados de Dispositivos: 1 Key = 1 Aparelho fixo
        if (!licenseData.deviceId) {
            // Se tá livre, vincula o primeiro aparelho que usou
            licenseData.deviceId = deviceId;
        } else if (licenseData.deviceId !== deviceId) {
            // Se um segundo aparelho tentar usar a mesma key, bloqueia na hora!
            return res.status(400).json({ 
                status: 'error', 
                message: 'Esta chave já está vinculada a outro dispositivo!' 
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Licença válida e dispositivo vinculado!',
            expiresAt: licenseData.expiresAt,
            deviceId: licenseData.deviceId
        });

    } catch (error) {
        console.error('Erro na validação:', error);
        return res.status(500).json({ status: 'error', message: 'Erro interno.' });
    }
});

// Proteção contra crash global
process.on('uncaughtException', (err) => {
    console.error('Erro não tratado:', err);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
