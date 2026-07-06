const form = document.getElementById('note-form');
const grid = document.getElementById('notes-grid');

async function loadNotes() {
  const res = await fetch('/api/notes');
  const notes = await res.json();
  renderNotes(notes);
}

function renderNotes(notes) {
  if (notes.length === 0) {
    grid.innerHTML = '<div class="empty-state"><p>No notes yet. Pin your first thought!</p></div>';
    return;
  }

  grid.innerHTML = notes
    .map(
      (note) => `
    <div class="note-card" data-id="${note.id}">
      <button class="delete-btn" data-id="${note.id}">&times;</button>
      <h3>${escapeHtml(note.title)}</h3>
      <p>${escapeHtml(note.content)}</p>
      <span class="time">${new Date(note.createdAt).toLocaleString()}</span>
    </div>
  `
    )
    .join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const title = document.getElementById('title').value;
  const content = document.getElementById('content').value;

  const res = await fetch('/api/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content }),
  });

  if (res.ok) {
    form.reset();
    loadNotes();
  }
});

grid.addEventListener('click', async (e) => {
  if (!e.target.classList.contains('delete-btn')) return;

  const id = e.target.dataset.id;
  const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });

  if (res.ok) {
    loadNotes();
  }
});

loadNotes();
