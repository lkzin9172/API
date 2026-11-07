const express = require('express');
const app = express();

app.use(express.json());

const licenses = new Map();

app.post('/api/license/create', (req, res) => {
    const { key, dias } = req.body;

    if (!key || !dias) {
        return res.status(400).json({ sucesso: false, mensagem: 'Chave e dias são obrigatórios.' });
    }

    if (licenses.has(key)) {
        return res.status(400).json({ sucesso: false, mensagem: 'Licença já existe.' });
    }

    licenses.set(key, {
        dias: dias,
        deviceId: null,
        criadoEm: new Date()
    });

    return res.status(201).json({
        sucesso: true,
        mensagem: 'Licença criada com sucesso!',
        dados: { key, dias }
    });

app.post('/api/license/verify', (req, res) => {
    const { key, deviceId } = req.body;

    if (!key || !deviceId) {
        return res.status(400).json({ sucesso: false, mensagem: 'Chave e deviceId são obrigatórios.' });
    }

    if (!licenses.has(key)) {
        return res.status(404).json({ sucesso: false, mensagem: 'Licença não encontrada.' });
    }

    const license = licenses.get(key);

    if (license.deviceId && license.deviceId !== deviceId) {
        return res.status(403).json({ sucesso: false, mensagem: 'Licença vinculada a outro dispositivo.' });
    }

    if (!license.deviceId) {
        license.deviceId = deviceId;
    }

    return res.status(200).json({
        sucesso: true,
        mensagem: 'Licença válida!',
        dados: license
    });
});

module.exports = app;

if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
    });
}
