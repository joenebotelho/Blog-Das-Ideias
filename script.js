const API_BASE = 'https://joenebotelho.github.io/Blog-Das-Ideias/api/posts';
let state = { posts: [] };
let sortMode = 'hot';
let user = localStorage.getItem('mini_reddit_user_name') || null;

const feed = document.getElementById('feed');
const q = document.getElementById('q');
const composer = document.getElementById('composer');
const newPostBtn = document.getElementById('newPostBtn');
const loginLogoutBtn = document.getElementById('loginLogoutBtn');
const registerBtn = document.getElementById('registerBtn');
const searchBtn = document.getElementById('searchBtn');

document.addEventListener('DOMContentLoaded', () => {
  updateUserStatus();
  loadPosts().then(() => render());
});

document.getElementById('postBtn').addEventListener('click', async () => {
  const text = composer.value.trim();
  if (!user) {
    return alert('Você precisa estar logado para publicar.');
  }
  if (!text) {
    return alert('Escreva algo antes de publicar.');
  }
  await createPostAjax(text);
  composer.value = '';
});

document.querySelector('.clear-btn').addEventListener('click', () => composer.value = '');
newPostBtn.addEventListener('click', () => composer.focus());

loginLogoutBtn.addEventListener('click', () => {
  const name = localStorage.getItem('mini_reddit_user_name');
  if (name) {
    localStorage.removeItem('mini_reddit_user_name');
    localStorage.removeItem('mini_reddit_user_email');
    window.location.reload();
  } else {
    window.location.href = 'login.html';
  }
});

registerBtn.addEventListener('click', () => {
  window.location.href = 'register.html';
});

// Evento para a busca ao digitar
q.addEventListener('input', () => render());

// Evento para o botão de busca
searchBtn.addEventListener('click', () => render());

document.querySelectorAll('[data-sort]').forEach(b =>
  b.addEventListener('click', e => {
    sortMode = e.target.dataset.sort;
    render();
  })
);

function updateUserStatus() {
  const name = localStorage.getItem('mini_reddit_user_name');
  const userStatus = document.getElementById('userStatus');
  const loginLogoutBtn = document.getElementById('loginLogoutBtn');
  const registerBtn = document.getElementById('registerBtn');
  
  if (name) {
    userStatus.textContent = `Olá, ${name}`;
    userStatus.style.display = 'inline';
    loginLogoutBtn.textContent = 'Sair';
    registerBtn.style.display = 'none';
    user = name;
  } else {
    // Apenas mude esta linha para o texto que você deseja exibir
    userStatus.textContent = 'Deslogado';
    userStatus.style.display = 'inline'; // Certifique-se de que o elemento está visível
    loginLogoutBtn.textContent = 'Entrar';
    registerBtn.style.display = 'inline';
    user = null;
  }
}

async function loadPosts() {
  try {
    const res = await fetch(API_BASE);
    if (res.ok) {
      state.posts = await res.json();
    } else {
      console.error('Erro ao carregar posts:', res.statusText);
      state.posts = [];
    }
  } catch (error) {
    console.error('Erro na requisição de posts:', error);
    state.posts = [];
  }
}

function now() {
  return new Date().toISOString();
}

async function createPostAjax(text) {
  const post = {
    title: text.split('\n')[0].slice(0, 80),
    body: text,
    author: user,
    createdAt: now()
  };
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(post)
  });
  if (res.ok) {
    await loadPosts();
    render();
  }
}

async function voteAjax(postId, dir) {
  const email = localStorage.getItem('mini_reddit_user_email');
  if (!email) {
    return alert('Você precisa estar logado para votar.');
  }
  const res = await fetch(`${API_BASE}/${postId}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dir, email })
  });
  if (res.ok) {
    await loadPosts();
    render();
  } else {
    const errorData = await res.json();
    alert(`Erro ao votar: ${errorData.erro}`);
  }
}

async function addCommentAjax(postId, text) {
  if (!text || !postId || !user) return;
  await fetch(`${API_BASE}/${postId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, author: user })
  });
  await loadPosts();
  render();
}

function render() {
  const term = q.value.trim().toLowerCase();
  let posts = state.posts.slice();
  if (term) posts = posts.filter(p => (p.title + p.body + p.author).toLowerCase().includes(term));

  // Lógica de ordenação corrigida
  if (sortMode === 'new') {
    posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (sortMode === 'top') {
    posts.sort((a, b) => b.votes - a.votes);
  } else { // 'hot' é o padrão
    // Exemplo de ordenação "hot": combina votos e tempo.
    // Quanto mais votos e mais recente, mais "hot"
    posts.sort((a, b) => b.votes - a.votes || (new Date(b.createdAt) - new Date(a.createdAt)));
  }

  feed.innerHTML = posts.length ? '' : '<div class="card muted">Nenhum post encontrado.</div>';

  const email = localStorage.getItem('mini_reddit_user_email');
  const sanitizedEmail = email ? email.replace(/\./g, '_') : null;

  posts.forEach(p => {
    const commentsArr = Array.isArray(p.comments) ? p.comments : [];
    const userVote = (p.voters && p.voters[sanitizedEmail]) ? p.voters[sanitizedEmail] : 0;
    
    const upvoteClass = userVote === 1 ? 'voted' : '';
    const downvoteClass = userVote === -1 ? 'voted' : '';

    const el = document.createElement('article');
    el.className = 'post card';
    el.innerHTML = `
      <div class="votes">
        <button class="${upvoteClass}" data-vote="${p._id}" data-dir="1">▲</button>
        <div>${p.votes}</div>
        <button class="${downvoteClass}" data-vote="${p._id}" data-dir="-1">▼</button>
      </div>
      <div class="post-body">
        <h3>${escapeHtml(p.title)}</h3>
        <div class="meta">por <strong>${escapeHtml(p.author)}</strong> • <span class="muted">${timeAgo(p.createdAt)}</span></div>
        <div class="content">${renderMarkdownPreview(p.body)}</div>
        <br>
        <div class="controls">
          <div class="small" data-comment-toggle="${p._id}">💬 ${commentsArr.length} comentários</div>
          <div class="small" data-comment-add="${p._id}">➕ Comentar</div>
          <div class="small" data-copy="${p._id}">🔗 Compartilhar</div>
          ${user === p.author ? `<div class="small" data-delete="${p._id}">🗑️ Excluir</div>` : ''}
        </div>

        <div class="comment-area" id="comments-${p._id}" style="display:none;">
          <div class="comment-list">
            ${commentsArr.map(c => `<div class='comment'><strong>${escapeHtml(c.author)}</strong> <span class='muted' style='font-size:12px'>• ${timeAgo(c.createdAt)}</span><div>${escapeHtml(c.text)}</div></div>`).join('')}
          </div>
          <div class="row" style="margin-top:8px;">
            <input placeholder="Escreva um comentário..." data-input="${p._id}" style="flex:1; padding:8px; border-radius:8px; border:1px solid rgba(255,255,255,0.04); background:transparent; color:inherit;">
            <button class="btn" data-send="${p._id}">Enviar</button>
          </div>
        </div>
      </div>
    `;
    feed.appendChild(el);
  });

  document.querySelectorAll('[data-vote]').forEach(b => b.addEventListener('click', handleVoteClick));
  document.querySelectorAll('[data-comment-toggle]').forEach(b => b.addEventListener('click', handleCommentToggle));
  document.querySelectorAll('[data-comment-add]').forEach(b => b.addEventListener('click', handleCommentAdd));
  document.querySelectorAll('[data-send]').forEach(b => b.addEventListener('click', handleCommentSend));
  document.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', handleCopy));
  document.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', handleDelete));
}

async function handleVoteClick(e) {
  const postId = e.currentTarget.dataset.vote;
  const dir = parseInt(e.currentTarget.dataset.dir, 10);
  await voteAjax(postId, dir);
}

async function handleCommentToggle(e) {
  const area = document.getElementById('comments-' + e.currentTarget.dataset.commentToggle);
  if (area) area.style.display = area.style.display === 'none' ? 'block' : 'none';
}

async function handleCommentAdd(e) {
  const area = document.getElementById('comments-' + e.currentTarget.dataset.commentAdd);
  if (area) {
    area.style.display = 'block';
    area.querySelector(`[data-input="${e.currentTarget.dataset.commentAdd}"]`).focus();
  }
}

async function handleCommentSend(e) {
  const input = document.querySelector(`[data-input="${e.currentTarget.dataset.send}"]`);
  if (!input) return;
  await addCommentAjax(e.currentTarget.dataset.send, input.value.trim());
  input.value = '';
}

async function handleCopy(e) {
  navigator.clipboard?.writeText(location.href + '#post=' + e.currentTarget.dataset.copy)
    .then(() => alert('Link copiado!'), () => alert('Não foi possível copiar'));
}

async function handleDelete(e) {
  if (confirm('Deseja realmente excluir este post?')) {
    await fetch(`${API_BASE}/${e.currentTarget.dataset.delete}`, { method: 'DELETE' });
    await loadPosts();
    render();
  }
}

function escapeHtml(s) {
  s = s || '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return sec + 's';
  const m = Math.floor(sec / 60);
  if (m < 60) return m + 'm';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h';
  const d = Math.floor(h / 24);
  if (d < 7) return d + 'd';
  return new Date(iso).toLocaleDateString();
}

function renderMarkdownPreview(s) {
  let t = escapeHtml(s);
  t = t.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/\*(.*?)\*/g, '<em>$1</em>');
  t = t.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');
  return t.replace(/\n/g, '<br>');
}