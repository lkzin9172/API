const express = require('express');
const app = express();

app.use(express.json());

// Banco de dados em memória para exemplo (pode substituir por um banco real ou arquivo)
const licenses = new Map();

// Rota POST para criar a licença
app.post('/api/license/create', (req, res) => {
    const { key, dias } = req.body;

    if (!key || !dias) {
        return res.status(400).json({ sucesso: false, mensagem: 'Chave e dias são obrigatórios!' });
    }

    if (licenses.has(key)) {
        return res.status(400).json({ sucesso: false, mensagem: 'Essa chave já existe!' });
    }

    // Salva a licença com o deviceId vazio (ainda não vinculada)
    licenses.set(key, {
        dias: dias,
        deviceId: null,
        criadoEm: new Date()
    
    },
    return res.status(201).json({
        sucesso: true,
        mensagem: 'Licença criada com sucesso!',
        dados: { key, dias }
    });
});

// Rota POST para validar/ativar a licença no celular
app.post('/api/license/verify', (req, res) => {
    const { key, deviceId } = req.body;

    if (!key || !deviceId) {
        return res.status(400).json({ sucesso: false, mensagem: 'Chave e ID do dispositivo são obrigatórios!' });
    }

    const license = licenses.get(key);

    if (!license) {
        return res.status(404).json({ sucesso: false, mensagem: 'Chave inválida!' });
    }

    // Se a chave já está vinculada a outro celular
    if (license.deviceId && license.deviceId !== deviceId) {
        return res.status(403).json({ 
            sucesso: false, 
            mensagem: 'Erro: Esta chave já está ativada em outro dispositivo e não pode ser transferida!' 
        });
    }

    // Se é o primeiro acesso, vincula permanentemente a este celular
    if (!license.deviceId) {
        license.deviceId = deviceId;
    }

    return res.json({
        sucesso: true,
        mensagem: 'Licença autorizada com sucesso!',
        dias: license.dias,
        deviceIdVinculado: license.deviceId
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
