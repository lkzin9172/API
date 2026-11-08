const express = require('express');
const app = express();

app.use(express.json());

// Banco de dados das chaves
const licenses = new Map();

app.get('/', (req, res) => {
    res.status(200).json({ status: 'online', message: 'API simplificada rodando!' });
});

// 1. GERAR KEY
app.post('/license/create', (req, res) => {
    try {
        const { key, tempo, tipo, dias } = req.body;
        
        if (!key) {
            return res.status(400).json({ status: 'error', message: 'Informe a chave.' });
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
            paused: false
        });

        return res.status(200).json({
            status: 'success',
            message: 'Chave criada com sucesso!',
            key,
            expiresAt
        });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: 'Erro interno.' });
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

        licenses.delete(key);

        return res.status(200).json({
            status: 'success',
            message: 'Chave desativada com sucesso!',
            key
        });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: 'Erro interno.' });
    }
});

// 4. VALIDAÇÃO DINÂMICA VIA SERVIDOR
app.post('/license/validate', (req, res) => {
    try {
        const { key } = req.body;

        if (!key) {
            return res.status(400).json({ status: 'error', message: 'Chave não informada.' });
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

        // Retorna o sucesso completo que o app espera para liberar a navegação
        return res.status(200).json({
            status: 'success',
            auth: true,
            action: 'redirect_main',
            message: 'Acesso liberado!',
            expiresAt: licenseData.expiresAt
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
