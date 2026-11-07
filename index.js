const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();

app.use(express.json());

// Configuração do Banco de Dados SQLite (salva as keys e status no disco)
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Erro ao abrir o banco de dados', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
    }
});

// Criação da tabela de licenças se não existir
db.run(`CREATE TABLE IF NOT EXISTS licenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE,
    days INTEGER,
    status TEXT DEFAULT 'ativo', -- 'ativo', 'pausado', 'desativado'
    device_id TEXT
)`, (err) => {
    if (!err) {
        console.log('Tabela "licenses" verificada/criada com sucesso.');
    }
});

// 1. Rota para Gerar Key
app.post('/api/license/create', (req, res) => {
    const { key, days } = req.body;

    if (!key || !days) {
        return res.status(400).json({ sucesso: false, mensagem: 'Chave e dias são obrigatórios.' });
    }

    const query = `INSERT INTO licenses (key, days, status, device_id) VALUES (?, ?, 'ativo', NULL)`;
    db.run(query, [key, days], function(err) {
        if (err) {
            return res.status(500).json({ sucesso: false, mensagem: 'Erro ao criar chave ou chave já existe.', erro: err.message });
        }
        return res.status(201).json({
            sucesso: true,
            mensagem: 'Licença criada com sucesso!',
            dados: { key, days, status: 'ativo' }
        });
    });
});

// 2. Rota para Verificar e Vincular a Key ao Dispositivo
app.post('/api/license/verify', (req, res) => {
    const { key, deviceId } = req.body;

    if (!key || !deviceId) {
        return res.status(400).json({ sucesso: false, mensagem: 'Key ou DeviceID ausente.' });
    }

    const query = `SELECT * FROM licenses WHERE key = ?`;
    db.get(query, [key], (err, license) => {
        if (err) {
            return res.status(500).json({ sucesso: false, mensagem: 'Erro no servidor.', erro: err.message });
        }

        if (!license) {
            return res.status(404).json({ sucesso: false, mensagem: 'Chave inválida ou não encontrada.' });
        }

        // Verifica se a chave está pausada ou desativada
        if (license.status === 'pausado') {
            return res.status(403).json({ sucesso: false, mensagem: 'Esta chave está pausada no momento.' });
        }
        if (license.status === 'desativado') {
            return res.status(403).json({ sucesso: false, mensagem: 'Esta chave foi desativada permanentemente.' });
        }

        // Se a key já tem um dispositivo vinculado
        if (license.device_id) {
            if (license.device_id === deviceId) {
                return res.json({ sucesso: true, mensagem: 'Dispositivo autorizado com sucesso!' });
            } else {
                return res.status(403).json({ sucesso: false, mensagem: 'Chave ou dispositivo não autorizado! Esta chave já está em uso em outro aparelho.' });
            }
        }

        // Se a key ainda não tem dispositivo, vincula ao primeiro que ativou
        const updateQuery = `UPDATE licenses SET device_id = ? WHERE key = ?`;
        db.run(updateQuery, [deviceId, key], (updateErr) => {
            if (updateErr) {
                return res.status(500).json({ sucesso: false, mensagem: 'Erro ao vincular o dispositivo à chave.' });
            }
            return res.json({ sucesso: true, mensagem: 'Chave ativada e vinculada a este dispositivo com sucesso!' });
        });
    });
});

// 3. Rota para Pausar a Key
app.post('/api/license/pause', (req, res) => {
    const { key } = req.body;
    if (!key) return res.status(400).json({ sucesso: false, mensagem: 'Informe a chave.' });

    db.run(`UPDATE licenses SET status = 'pausado' WHERE key = ?`, [key], function(err) {
        if (err || this.changes === 0) {
            return res.status(404).json({ sucesso: false, mensagem: 'Chave não encontrada ou erro ao pausar.' });
        }
        return res.json({ sucesso: true, mensagem: 'Chave pausada com sucesso!' });
    });
});

// 4. Rota para Desativar a Key
app.post('/api/license/disable', (req, res) => {
    const { key } = req.body;
    if (!key) return res.status(400).json({ sucesso: false, mensagem: 'Informe a chave.' });

    db.run(`UPDATE licenses SET status = 'desativado' WHERE key = ?`, [key], function(err) {
        if (err || this.changes === 0) {
            return res.status(404).json({ sucesso: false, mensagem: 'Chave não encontrada ou erro ao desativar.' });
        }
        return res.json({ sucesso: true, mensagem: 'Chave desativada com sucesso!' });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
