const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Rota de teste
app.get('/', (req, res) => {
  res.json({ status: 'API online e funcionando!' });
});

// Exemplo de rota de validação de chave
app.post('/validar', (req, res) => {
  const { chave } = req.body;
  
  if (!chave) {
    return res.status(400).json({ erro: 'Nenhuma chave fornecida.' });
  }

  // Aqui entra a sua lógica de validação no banco
  if (chave === 'MINHA-CHAVE-VIP') {
    return res.json({ valido: true, mensagem: 'Acesso liberado!' });
  } else {
    return res.status(401).json({ valido: false, mensagem: 'Chave inválida.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
