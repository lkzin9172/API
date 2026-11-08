const express = require('express');
const app = express();

app.use(express.json());

// Banco de dados em memória
const licenses = new Map();

// Rota raiz
app.get('/', (req, res) => {
    res.status(200).json({ status: 'online', message: 'API funcionando!' });
});

// Rota para criar chave com suporte a minutos, horas ou dias
app.post('/license/create', (req, res) => {
    try {
        const { key, tempo, tipo, dias } = req.body;
        
        if (!key) {
            return res.status(400).json({ erro: 'Informe a chave (key).' });
        }

        let milissegundos = 0;

        // Se mandar no formato novo (tempo + tipo)
        if (tempo !== undefined && tipo) {
            const qtd = parseFloat(tempo) || 1;
            const t = tipo.toLowerCase();

            if (t.startsWith('minuto')) {
                milissegundos = qtd * 60 * 1000;
            } else if (t.startsWith('hora')) {
                milissegundos = qtd * 60 * 60 * 1000;
            } else {
                milissegundos = qtd * 24 * 60 * 60 * 1000; // Dias
            }
        } 
        // Compatibilidade caso envie o campo antigo "dias"
        else if (dias !== undefined) {
            milissegundos = parseFloat(dias) * 24 * 60 * 60 * 1000;
        } 
        // Padrão se não mandar nada: 1 dia
        else {
            milissegundos = 24 * 60 * 60 * 1000;
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
            expiresAt
        });
    } catch (error) {
        console.error('Erro ao criar:', error);
        return res.status(500).json({ erro: 'Erro interno ao criar chave' });
    }
});

// Rota de validação com verificação estrita de expiração
app.post('/license/validate', (req, res) => {
    try {
        const { key, deviceId } = req.body;

        if (!key) {
            return res.status(400).json({ status: 'error', message: 'Chave não informada.' });
        }

        const licenseData = licenses.get(key);
        
        if (!licenseData) {
            return res.status(404).json({ status: 'error', message: 'Chave inválida ou não encontrada.' });
        }

        // Relógio checando se já passou do tempo de expiração
        if (Date.now() > licenseData.expiresAt) {
            licenses.delete(key);
            return res.status(400).json({ status: 'error', message: 'Esta chave expirou!' });
        }

        if (!licenseData.deviceId && deviceId) {
            licenseData.deviceId = deviceId;
        }

        return res.status(200).json({
            status: 'success',
            message: 'Licença válida!',
            expiresAt: licenseData.expiresAt
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
