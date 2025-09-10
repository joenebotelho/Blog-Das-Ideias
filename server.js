const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const app = express();
const PORT = 3000;

mongoose.connection.once('open', () => {
  console.log('Conectado ao MongoDB!');
});
mongoose.connection.on('error', err => {
  console.error('Erro ao conectar ao MongoDB:', err.message);
});

// Conexão com MongoDB
mongoose.connect('mongodb+srv://joenesbotelho_db_user:rfRafGhMLZexH36h@cluster0.fqbwieh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  name: String,
  password: String
});

const User = mongoose.model('User', userSchema);

const commentSchema = new mongoose.Schema({
  text: String,
  author: String,
  createdAt: String
}, { _id: false });

const postSchema = new mongoose.Schema({
  title: String,
  body: String,
  author: String,
  createdAt: String,
  votes: { type: Number, default: 0 },
  voters: { type: Map, of: Number, default: {} },
  comments: { type: [commentSchema], default: [] }
});

const Post = mongoose.model('Post', postSchema);

app.use(cors());
app.use(express.json());

// Rotas de Usuário
app.post('/api/register', async (req, res) => {
  const { email, name, password } = req.body;
  if (!email || !name || !password) return res.status(400).json({ error: 'Preencha todos os campos' });
try {
    const user = new User({ email, name, password });
    await user.save();
    res.status(201).json({ ok: true });
  } catch (err) {
    // Altere 'error' para 'erro'
    res.status(400).json({ erro: 'E-mail já cadastrado' }); 
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, password });
  if (!user) return res.status(401).json({ erro: 'E-mail ou senha inválidos' }); // Altere 'error' para 'erro'
  res.json({ ok: true, email, name: user.name });
});

// Rotas de Posts
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    console.error('Erro ao buscar posts:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/api/posts', async (req, res) => {
  const { title, body, author, createdAt } = req.body;
  const post = new Post({ title, body, author, createdAt });
  await post.save();
  res.status(201).json(post);
});

// Rota de Votação Corrigida
app.post('/api/posts/:id/vote', async (req, res) => {
  const { dir, email } = req.body;
  const post = await Post.findById(req.params.id);

  if (!post || !email || ![-1, 1].includes(dir)) {
    return res.status(400).json({ erro: "Dados inválidos" });
  }

  const sanitizedEmail = email.replace(/\./g, '_');
  const currentVote = post.voters.get(sanitizedEmail) || 0;
  
  let newDir;
  if (dir === currentVote) {
    newDir = 0;
  } else {
    newDir = dir;
  }

  // Ajusta o total de votos de forma incremental com a diferença
  post.votes += (newDir - currentVote);

  if (newDir === 0) {
    post.voters.delete(sanitizedEmail);
  } else {
    post.voters.set(sanitizedEmail, newDir);
  }

  await post.save();
  res.json(post);
});

app.post('/api/posts/:id/comments', async (req, res) => {
  const { text, author } = req.body;
  const post = await Post.findById(req.params.id);
  if (!post || !text || !author) return res.status(400).end();

  const comment = {
    text,
    author,
    createdAt: new Date().toISOString()
  };

  post.comments.push(comment);
  await post.save();
  res.status(201).json(comment);
});

app.delete('/api/posts/:id', async (req, res) => {
  const post = await Post.findByIdAndDelete(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post não encontrado' });
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Backend rodando em http://localhost:${PORT}`);
});