(() => {
  const STORAGE_KEY = 'flashcards.deck.v1';
  const $ = (id) => document.getElementById(id);

  // ---------- Storage ----------
  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(deck));
    } catch {
      alert('Could not save: browser storage is unavailable or full.');
    }
  }

  let deck = load(); // [{ id, q, a, status: 'new' | 'known' | 'learning' }]
  let editingId = null;
  let session = null; // { queue: [card ids], index, flipped, known, learning }

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  // ---------- Tabs ----------
  function showTab(name) {
    const review = name === 'review';
    $('deck-view').hidden = review;
    $('review-view').hidden = !review;
    $('tab-deck').classList.toggle('active', !review);
    $('tab-review').classList.toggle('active', review);
    if (review) resetReview();
    else renderDeck();
  }
  $('tab-deck').addEventListener('click', () => showTab('deck'));
  $('tab-review').addEventListener('click', () => showTab('review'));

  // ---------- Deck ----------
  $('add-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = $('add-q').value.trim();
    const a = $('add-a').value.trim();
    if (!q || !a) return;
    deck.push({ id: uid(), q, a, status: 'new' });
    save();
    e.target.reset();
    $('add-q').focus();
    renderDeck();
  });

  function el(tag, props = {}, ...children) {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...children);
    return node;
  }

  function renderDeck() {
    const list = $('card-list');
    list.replaceChildren();
    $('empty').hidden = deck.length > 0;

    const known = deck.filter((c) => c.status === 'known').length;
    const learning = deck.filter((c) => c.status === 'learning').length;
    $('stats').textContent = deck.length
      ? `${deck.length} cards · ${known} known · ${learning} still learning`
      : '';

    for (const card of deck) {
      list.append(card.id === editingId ? editItem(card) : viewItem(card));
    }
  }

  function viewItem(card) {
    const label = { new: 'New', known: 'Known', learning: 'Still learning' }[card.status] || 'New';
    const cls = card.status === 'known' || card.status === 'learning' ? card.status : '';
    return el('li', {},
      el('p', { className: 'q', textContent: card.q }),
      el('p', { className: 'a', textContent: card.a }),
      el('div', { className: 'row' },
        el('span', { className: `badge ${cls}`, textContent: label }),
        el('span', { className: 'spacer' }),
        el('button', { type: 'button', textContent: 'Edit', onclick: () => { editingId = card.id; renderDeck(); } }),
        el('button', {
          type: 'button', className: 'danger', textContent: 'Delete',
          onclick: () => {
            if (!confirm('Delete this card?')) return;
            deck = deck.filter((c) => c.id !== card.id);
            save();
            renderDeck();
          },
        }),
      ),
    );
  }

  function editItem(card) {
    const q = el('textarea', { rows: 2, value: card.q });
    const a = el('textarea', { rows: 2, value: card.a });
    const commit = () => {
      const nq = q.value.trim();
      const na = a.value.trim();
      if (!nq || !na) return;
      card.q = nq;
      card.a = na;
      editingId = null;
      save();
      renderDeck();
    };
    const li = el('li', { className: 'editing' },
      el('label', {}, 'Question', q),
      el('label', {}, 'Answer', a),
      el('div', { className: 'row' },
        el('button', { type: 'button', className: 'primary', textContent: 'Save', onclick: commit }),
        el('button', { type: 'button', textContent: 'Cancel', onclick: () => { editingId = null; renderDeck(); } }),
      ),
    );
    queueMicrotask(() => q.focus());
    return li;
  }

  // ---------- Review ----------
  function resetReview() {
    session = null;
    $('review-setup').hidden = false;
    $('review-session').hidden = true;
    $('review-done').hidden = true;
    const learningCount = deck.filter((c) => c.status === 'learning').length;
    $('only-learning').disabled = learningCount === 0;
    if (learningCount === 0) $('only-learning').checked = false;
    $('start-review').disabled = deck.length === 0;
    $('start-review').title = deck.length ? '' : 'Add some cards first';
  }

  function startReview() {
    const only = $('only-learning').checked;
    const queue = deck.filter((c) => !only || c.status === 'learning').map((c) => c.id);
    if (!queue.length) return;
    session = { queue, index: 0, flipped: false, known: 0, learning: 0 };
    $('review-setup').hidden = true;
    $('review-done').hidden = true;
    $('review-session').hidden = false;
    renderCard();
    $('card').focus();
  }

  function currentCard() {
    return session && deck.find((c) => c.id === session.queue[session.index]);
  }

  function renderCard() {
    const card = currentCard();
    if (!card) return finishReview();
    $('progress').textContent = `Card ${session.index + 1} of ${session.queue.length}`;
    $('card').classList.toggle('flipped', session.flipped);
    $('card-side').textContent = session.flipped ? 'Answer' : 'Question';
    $('card-text').textContent = session.flipped ? card.a : card.q;
  }

  function flip() {
    if (!session) return;
    session.flipped = !session.flipped;
    renderCard();
  }

  function mark(status) {
    const card = currentCard();
    if (!card) return;
    card.status = status;
    session[status]++;
    save();
    session.index++;
    session.flipped = false;
    renderCard();
    // A focused Known/Still learning button would treat the next Space as a click
    // (marking again) instead of a flip, so hand focus back to the card.
    $('card').focus();
  }

  function finishReview() {
    const { known, learning } = session;
    $('review-session').hidden = true;
    $('review-done').hidden = false;
    $('done-summary').textContent = `${known} known · ${learning} still learning`;
    session = null;
  }

  $('start-review').addEventListener('click', startReview);
  $('restart').addEventListener('click', resetReview);
  $('card').addEventListener('click', flip);
  $('btn-known').addEventListener('click', () => mark('known'));
  $('btn-learning').addEventListener('click', () => mark('learning'));

  document.addEventListener('keydown', (e) => {
    if (!session || $('review-view').hidden) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = e.target.tagName;
    if (tag === 'TEXTAREA' || tag === 'INPUT') return;
    // Let focused buttons handle their own Space/Enter; the card itself is handled here.
    if (e.code === 'Space') {
      if (tag === 'BUTTON') return;
      e.preventDefault();
      flip();
    } else if (e.key === 'Enter' && e.target.id === 'card') {
      flip();
    } else if (e.key.toLowerCase() === 'k') {
      mark('known');
    } else if (e.key.toLowerCase() === 'l') {
      mark('learning');
    }
  });

  renderDeck();
})();
