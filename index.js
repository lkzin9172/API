const express = require('express');
const app = express();

app.use(express.json());

// "Banco de keys" em memória: armazena todas as chaves criadas, status, dias e o device_id vinculado
let licensesDB = [];

// 1. Rota para Criar/Gerar Key
app.post('/api/license/create', (req, res) => {
    const { key, days } = req.body;

    if (!key || !days) {
        return res.status(400).json({ sucesso: false, mensagem: 'Chave e dias são obrigatórios.' });
    }

    // Verifica se a chave já existe no banco de keys
    const existing = licensesDB.find(l => l.key === key);
    if (existing) {
        return res.status(400).json({ sucesso: false, mensagem: 'Esta chave já existe.' });
    }

    const newLicense = {
        key,
        days: Number(days),
        status: 'ativo', // 'ativo', 'pausado', 'desativado'
        device_id: null
    };

    licensesDB.push(newLicense);

    return res.status(201).json({
        sucesso: true,
        mensagem: 'Chave criada com sucesso!',
        dados: newLicense
    });
});

// 2. Rota para Verificar, Ativar e Vincular a Key ao Dispositivo
app.post('/api/license/verify', (req, res) => {
    const { key, device_id } = req.body;

    if (!key || !device_id) {
        return res.status(400).json({ sucesso: false, mensagem: 'Key ou device_id ausente.' });
    }

    const license = licensesDB.find(l => l.key === key);

    if (!license) {
        return res.status(404).json({ sucesso: false, mensagem: 'Chave inválida ou não encontrada.' });
    }

    if (license.status === 'pausado') {
        return res.status(403).json({ sucesso: false, mensagem: 'Esta chave está pausada no momento.' });
    }
    if (license.status === 'desativado') {
        return res.status(403).json({ sucesso: false, mensagem: 'Esta chave foi desativada permanentemente.' });
    }

    // Se a key já foi usada por algum dispositivo
    if (license.device_id) {
        if (license.device_id === device_id) {
            return res.json({ sucesso: true, mensagem: 'Dispositivo autorizado com sucesso!' });
        } else {
            return res.status(403).json({ sucesso: false, mensagem: 'Chave já está em uso em outro aparelho!' });
        }
    }

    // Se é a primeira vez, vincula permanentemente ao device_id que ativou
    license.device_id = device_id;

    return res.json({ sucesso: true, mensagem: 'Chave ativada e vinculada a este dispositivo com sucesso!' });
});

// 3. Rota para Pausar a Key
app.post('/api/license/pause', (req, res) => {
    const { key } = req.body;
    if (!key) return res.status(400).json({ sucesso: false, mensagem: 'Informe a chave.' });

    const license = licensesDB.find(l => l.key === key);
    if (!license) {
        return res.status(404).json({ sucesso: false, mensagem: 'Chave não encontrada.' });
    }

    license.status = 'pausado';
    return res.json({ sucesso: true, mensagem: 'Chave pausada com sucesso!' });
});

// 4. Rota para Desativar a Key
app.post('/api/license/disable', (req, res) => {
    const { key } = req.body;
    if (!key) return res.status(400).json({ sucesso: false, mensagem: 'Informe a chave.' });

    const license = licensesDB.find(l => l.key === key);
    if (!license) {
        return res.status(404).json({ sucesso: false, mensagem: 'Chave não encontrada.' });
    }

    license.status = 'desativado';
    return res.json({ sucesso: true, mensagem: 'Chave desativada com sucesso!' });
});

// 5. Rota opcional para listar todas as keys salvas (bom para acompanhar o banco de keys)
app.get('/api/license/list', (req, res) => {
    return res.json({ sucesso: true, total: licensesDB.length, keys: licensesDB });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor de keys rodando na porta ${PORT}`);
});
