// TeaSocial Music - Sarki Yaz Modülü
// song-writing.js

// ─── Yardımcı: Yıldız render ───────────────────────────────────────────────
function renderStars(rating, type, writingId, interactive) {
  let html = `<div class="star-row" style="display:inline-flex;gap:4px;align-items:center;">`;
  for (let i = 1; i <= 5; i++) {
    const filled = i <= Math.round(rating);
    const color  = filled ? '#1db954' : '#555';
    if (interactive) {
      html += `<span
        onclick="rateWriting(${writingId},'${type}',${i})"
        style="cursor:pointer;font-size:22px;color:${color};transition:color .15s;"
        onmouseover="this.style.color='#1db954'"
        onmouseout="this.style.color='${color}'"
        title="${i} yıldız">&#9733;</span>`;
    } else {
      html += `<span style="font-size:18px;color:${color};">&#9733;</span>`;
    }
  }
  html += `</div>`;
  return html;
}

// ─── Kart render ───────────────────────────────────────────────────────────
function renderWritingCard(w) {
  const hasBeat = !!w.beat_url;
  const beatBadge = hasBeat
    ? `<span style="background:#1db954;color:#000;font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;margin-left:6px;">BEAT</span>`
    : '';
  const genre = w.genre
    ? `<span style="background:rgba(255,255,255,0.08);color:#aaa;font-size:11px;padding:2px 8px;border-radius:20px;">${w.genre}</span>`
    : '';
  const avgBeat   = w.avg_beat_rating   ? parseFloat(w.avg_beat_rating).toFixed(1)   : '—';
  const avgLyrics = w.avg_lyrics_rating ? parseFloat(w.avg_lyrics_rating).toFixed(1) : '—';

  return `
    <div onclick="openWritingDetail(${w.id})" style="
      background:var(--yt-spec-raised-background,#1e1e1e);
      border-radius:14px;
      padding:16px;
      cursor:pointer;
      transition:transform .15s,box-shadow .15s;
      border:1px solid rgba(255,255,255,0.07);
    "
    onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 24px rgba(0,0,0,0.4)'"
    onmouseout="this.style.transform='';this.style.boxShadow=''">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;flex-wrap:wrap;">
        <div style="flex:1;min-width:0;">
          <p style="font-size:16px;font-weight:700;margin:0 0 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${w.title}${beatBadge}
          </p>
          <p style="font-size:13px;color:#aaa;margin:0 0 8px;">
            <i class="fas fa-user" style="margin-right:4px;"></i>${w.artist_name || 'Bilinmiyor'}
          </p>
        </div>
        ${genre}
      </div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:#888;margin-top:4px;">
        <span><i class="fas fa-music" style="color:#1db954;margin-right:4px;"></i>Beat: <b style="color:#fff;">${avgBeat}</b></span>
        <span><i class="fas fa-pen" style="color:#1db954;margin-right:4px;"></i>Sözler: <b style="color:#fff;">${avgLyrics}</b></span>
        <span><i class="fas fa-comment" style="color:#1db954;margin-right:4px;"></i>${w.comment_count || 0} yorum</span>
      </div>
    </div>`;
}

// ─── Sarki Yaz Modal ────────────────────────────────────────────────────────
function showWriteSongModal() {
  if (!currentUser) { showToast('Giriş yapmalısın.'); return; }

  const genres = ['Pop','Hip-Hop','R&B','Rock','Electronic','Jazz','Classical','Folk','Reggae','Diğer'];
  const opts = genres.map(g => `<option value="${g}">${g}</option>`).join('');

  showModal(`
    <div style="padding:4px 0;">
      <h2 style="margin:0 0 20px;font-size:20px;font-weight:700;">
        <i class="fas fa-pen-nib" style="color:#1db954;margin-right:8px;"></i>Şarkı Yaz
      </h2>

      <label style="display:block;margin-bottom:6px;font-size:13px;color:#aaa;">Başlık *</label>
      <input id="sw-title" type="text" placeholder="Şarkı başlığı..." maxlength="120" style="
        width:100%;box-sizing:border-box;background:#111;border:1px solid #333;
        border-radius:8px;padding:10px 12px;color:#fff;font-size:15px;margin-bottom:14px;
        outline:none;
      " onfocus="this.style.borderColor='#1db954'" onblur="this.style.borderColor='#333'">

      <label style="display:block;margin-bottom:6px;font-size:13px;color:#aaa;">Şarkı Sözleri *</label>
      <textarea id="sw-lyrics" placeholder="Şarkı sözlerini buraya yaz..." rows="8" style="
        width:100%;box-sizing:border-box;background:#111;border:1px solid #333;
        border-radius:8px;padding:10px 12px;color:#fff;font-size:15px;
        resize:vertical;font-family:inherit;line-height:1.6;margin-bottom:14px;
        outline:none;
      " onfocus="this.style.borderColor='#1db954'" onblur="this.style.borderColor='#333'"></textarea>

      <label style="display:block;margin-bottom:6px;font-size:13px;color:#aaa;">Tür</label>
      <select id="sw-genre" style="
        width:100%;box-sizing:border-box;background:#111;border:1px solid #333;
        border-radius:8px;padding:10px 12px;color:#fff;font-size:15px;margin-bottom:14px;
        outline:none;
      ">
        <option value="">Seç (opsiyonel)</option>
        ${opts}
      </select>

      <label style="display:block;margin-bottom:6px;font-size:13px;color:#aaa;">Beat Dosyası (MP3/WAV)</label>
      <div style="
        border:2px dashed #333;border-radius:8px;padding:16px;text-align:center;
        margin-bottom:20px;cursor:pointer;transition:border-color .2s;
      " onclick="document.getElementById('sw-beat').click()"
         onmouseover="this.style.borderColor='#1db954'" onmouseout="this.style.borderColor='#333'">
        <i class="fas fa-cloud-upload-alt" style="font-size:24px;color:#555;margin-bottom:8px;display:block;"></i>
        <p id="sw-beat-label" style="margin:0;color:#888;font-size:13px;">Dosya seç veya buraya tıkla</p>
      </div>
      <input id="sw-beat" type="file" accept="audio/*" style="display:none"
        onchange="document.getElementById('sw-beat-label').textContent = this.files[0]?.name || 'Dosya seç'">

      <div style="display:flex;gap:10px;justify-content:flex-end;align-items:center;">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:#aaa;">
          <input type="checkbox" id="sw-allow-rating" checked style="width:16px;height:16px;accent-color:#1db954;cursor:pointer;" />
          Puanlamaya açık
        </label>
        <button onclick="closeModal()" style="
          background:rgba(255,255,255,0.08);border:none;color:#fff;
          padding:10px 20px;border-radius:8px;cursor:pointer;font-size:14px;
        ">İptal</button>
        <button onclick="submitSongWriting()" style="
          background:#1db954;border:none;color:#000;font-weight:700;
          padding:10px 24px;border-radius:8px;cursor:pointer;font-size:14px;
        ">Paylaş</button>
      </div>
    </div>
  `);
}

// ─── Form Submit ────────────────────────────────────────────────────────────
async function submitSongWriting() {
  const title  = document.getElementById('sw-title')?.value.trim();
  const lyrics = document.getElementById('sw-lyrics')?.value.trim();
  const genre  = document.getElementById('sw-genre')?.value;
  const beatFile = document.getElementById('sw-beat')?.files[0];

  if (!title)  { showToast('Başlık zorunlu.'); return; }
  if (!lyrics) { showToast('Şarkı sözleri zorunlu.'); return; }

  const fd = new FormData();
  fd.append('userId', currentUser.id);
  fd.append('title', title);
  fd.append('lyrics', lyrics);
  if (genre) fd.append('genre', genre);
  if (beatFile) {
    fd.append('beatName', beatFile.name);
    fd.append('beat', beatFile);
  }
  fd.append('allowRating', document.getElementById('sw-allow-rating')?.checked ? '1' : '0');

  try {
    const res = await fetch(`${API_URL}/music/writing`, { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hata');
    closeModal();
    showToast('Şarkı paylaşıldı!');
    loadSongWritingsPage();
  } catch (e) {
    showToast(e.message || 'Bir hata oluştu.');
  }
}

// ─── Tüm Yazılar Sayfası ────────────────────────────────────────────────────
async function loadSongWritingsPage() {
  const container = document.getElementById('song-writings-content');
  if (!container) return;

  container.innerHTML = `<div style="text-align:center;padding:40px;color:#888;">
    <i class="fas fa-spinner fa-spin" style="font-size:28px;"></i>
  </div>`;

  try {
    const uid = currentUser ? `?userId=${currentUser.id}` : '';
    const res  = await fetch(`${API_URL}/music/writings${uid}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hata');

    const writings = data.writings || data;
    if (!writings.length) {
      container.innerHTML = `<div style="text-align:center;padding:60px 20px;color:#888;">
        <i class="fas fa-pen-nib" style="font-size:40px;margin-bottom:12px;display:block;color:#333;"></i>
        <p style="font-size:16px;">Henüz şarkı yok. İlk şarkıyı sen yaz!</p>
        ${currentUser ? `<button onclick="showWriteSongModal()" style="
          margin-top:16px;background:#1db954;border:none;color:#000;font-weight:700;
          padding:10px 24px;border-radius:20px;cursor:pointer;font-size:14px;">
          <i class="fas fa-plus" style="margin-right:6px;"></i>Şarkı Yaz
        </button>` : ''}
      </div>`;
      return;
    }

    container.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;padding:4px 0;">
        ${writings.map(w => renderWritingCard(w)).join('')}
      </div>`;
  } catch (e) {
    container.innerHTML = `<div style="text-align:center;padding:40px;color:#f44;">
      <i class="fas fa-exclamation-circle" style="font-size:28px;margin-bottom:8px;display:block;"></i>
      ${e.message}
    </div>`;
  }
}

// ─── Kendi Yazılarım ────────────────────────────────────────────────────────
async function showMyWritings() {
  if (!currentUser) { showToast('Giriş yapmalısın.'); return; }
  const container = document.getElementById('my-writings-content');
  if (!container) return;

  container.innerHTML = `<div style="text-align:center;padding:40px;color:#888;">
    <i class="fas fa-spinner fa-spin" style="font-size:28px;"></i>
  </div>`;

  try {
    const res  = await fetch(`${API_URL}/music/writings/my/${currentUser.id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hata');

    const writings = data.writings || data;
    if (!writings.length) {
      container.innerHTML = `<div style="text-align:center;padding:60px 20px;color:#888;">
        <i class="fas fa-pen-nib" style="font-size:40px;margin-bottom:12px;display:block;color:#333;"></i>
        <p style="font-size:16px;">Henüz şarkı yazmadın.</p>
        <button onclick="showWriteSongModal()" style="
          margin-top:16px;background:#1db954;border:none;color:#000;font-weight:700;
          padding:10px 24px;border-radius:20px;cursor:pointer;font-size:14px;">
          <i class="fas fa-plus" style="margin-right:6px;"></i>Şarkı Yaz
        </button>
      </div>`;
      return;
    }

    container.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;padding:4px 0;">
        ${writings.map(w => renderMyWritingCard(w)).join('')}
      </div>`;
  } catch (e) {
    container.innerHTML = `<div style="text-align:center;padding:40px;color:#f44;">${e.message}</div>`;
  }
}

function renderMyWritingCard(w) {
  const base = renderWritingCard(w);
  // Sil butonunu kartın altına ekle — onclick propagation'ı durdur
  return base.replace(
    '</div>',
    `<div style="margin-top:10px;text-align:right;">
      <button onclick="event.stopPropagation();deleteWriting(${w.id})" style="
        background:rgba(244,67,54,0.15);border:1px solid rgba(244,67,54,0.4);
        color:#f44336;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:12px;
      "><i class="fas fa-trash" style="margin-right:4px;"></i>Sil</button>
    </div></div>`
  );
}

// ─── Detay Sayfası ──────────────────────────────────────────────────────────
async function openWritingDetail(id) {
  // Sayfayı göster
  ['song-writings-page','my-writings-page','writing-detail-page'].forEach(eid => {
    const el = document.getElementById(eid);
    if (el) el.style.display = 'none';
  });
  const wdPage = document.getElementById('writing-detail-page');
  if (wdPage) wdPage.style.display = 'block';
  document.getElementById('pageContent').innerHTML = '';

  const container = document.getElementById('writing-detail-content');
  if (!container) return;

  container.innerHTML = `<div style="text-align:center;padding:60px;color:#888;">
    <i class="fas fa-spinner fa-spin" style="font-size:28px;"></i>
  </div>`;

  try {
    const uid = currentUser ? `?userId=${currentUser.id}` : '';
    const res  = await fetch(`${API_URL}/music/writing/${id}${uid}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hata');

    const w        = data.writing || data;
    const comments = data.comments || [];
    const isOwner  = currentUser && currentUser.id === w.user_id;

    const avgBeat   = w.avg_beat_rating   ? parseFloat(w.avg_beat_rating).toFixed(1)   : null;
    const avgLyrics = w.avg_lyrics_rating ? parseFloat(w.avg_lyrics_rating).toFixed(1) : null;

    // Beat player
    let beatSection = '';
    if (w.beat_url) {
      beatSection = `
        <div id="beat-player-wrap" style="
          background:#111;border-radius:12px;padding:16px;margin-bottom:20px;
          border:1px solid rgba(29,185,84,0.3);
        ">
          <p style="margin:0 0 10px;font-size:13px;color:#1db954;font-weight:600;">
            <i class="fas fa-headphones" style="margin-right:6px;"></i>Beat
          </p>
          <audio id="beat-audio" src="${w.beat_url}" preload="metadata" style="display:none;"></audio>
          <div style="display:flex;align-items:center;gap:12px;">
            <button id="beat-play-btn" onclick="toggleBeatPlay()" style="
              width:44px;height:44px;border-radius:50%;background:#1db954;border:none;
              color:#000;font-size:16px;cursor:pointer;flex-shrink:0;
              display:flex;align-items:center;justify-content:center;
            "><i class="fas fa-play"></i></button>
            <div style="flex:1;">
              <input id="beat-seek" type="range" min="0" max="100" value="0"
                oninput="seekBeat(this.value)"
                style="width:100%;accent-color:#1db954;cursor:pointer;">
              <div style="display:flex;justify-content:space-between;font-size:11px;color:#888;margin-top:2px;">
                <span id="beat-cur">0:00</span>
                <span id="beat-dur">0:00</span>
              </div>
            </div>
          </div>
        </div>`;
    }

    // Puanlama bölümü
    let ratingSection = '';
    if (currentUser && !isOwner) {
      if (w.allow_rating === 0) {
        ratingSection = `<div style="background:#111;border-radius:12px;padding:12px 16px;margin-bottom:20px;border:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;gap:8px;">
          <i class="fas fa-lock" style="color:#888;"></i>
          <span style="font-size:13px;color:#888;">Bu şarkı için puanlama kapalı</span>
        </div>`;
      } else {
        ratingSection = `
          <div style="background:#111;border-radius:12px;padding:16px;margin-bottom:20px;border:1px solid rgba(255,255,255,0.07);">
            <p style="margin:0 0 12px;font-size:14px;font-weight:600;">Puanla</p>
            <div style="display:flex;flex-wrap:wrap;gap:20px;">
              <div>
                <p style="margin:0 0 6px;font-size:12px;color:#aaa;">Sözler</p>
                ${renderStars(w.user_lyrics_rating || 0, 'lyrics', id, true)}
              </div>
              ${w.beat_url ? `<div>
                <p style="margin:0 0 6px;font-size:12px;color:#aaa;">Beat</p>
                ${renderStars(w.user_beat_rating || 0, 'beat', id, true)}
              </div>` : ''}
            </div>
          </div>`;
      }
    }

    // Ortalama puanlar
    const avgSection = `
      <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:20px;">
        <div style="background:#111;border-radius:10px;padding:12px 16px;flex:1;min-width:120px;border:1px solid rgba(255,255,255,0.07);">
          <p style="margin:0 0 4px;font-size:11px;color:#aaa;">Ortalama Sözler</p>
          <div style="display:flex;align-items:center;gap:8px;">
            ${renderStars(avgLyrics || 0, 'lyrics', id, false)}
            <span style="font-size:18px;font-weight:700;color:#1db954;">${avgLyrics || '—'}</span>
          </div>
        </div>
        ${w.beat_url ? `<div style="background:#111;border-radius:10px;padding:12px 16px;flex:1;min-width:120px;border:1px solid rgba(255,255,255,0.07);">
          <p style="margin:0 0 4px;font-size:11px;color:#aaa;">Ortalama Beat</p>
          <div style="display:flex;align-items:center;gap:8px;">
            ${renderStars(avgBeat || 0, 'beat', id, false)}
            <span style="font-size:18px;font-weight:700;color:#1db954;">${avgBeat || '—'}</span>
          </div>
        </div>` : ''}
      </div>`;

    // Yorumlar
    const commentsHtml = comments.length
      ? comments.map(c => renderComment(c, id)).join('')
      : `<p style="color:#888;font-size:14px;text-align:center;padding:20px 0;">Henüz yorum yok.</p>`;

    const commentInput = currentUser ? `
      <div style="display:flex;gap:8px;margin-top:14px;">
        <input id="wd-comment-input" type="text" placeholder="Yorum yaz..."
          onkeydown="if(event.key==='Enter')submitWritingComment(${id})"
          style="flex:1;background:#111;border:1px solid #333;border-radius:8px;
          padding:10px 12px;color:#fff;font-size:14px;outline:none;"
          onfocus="this.style.borderColor='#1db954'" onblur="this.style.borderColor='#333'">
        <button onclick="submitWritingComment(${id})" style="
          background:#1db954;border:none;color:#000;font-weight:700;
          padding:10px 16px;border-radius:8px;cursor:pointer;font-size:14px;white-space:nowrap;
        ">Gönder</button>
      </div>` : '';

    container.innerHTML = `
      <div style="max-width:720px;margin:0 auto;padding:0 4px;">

        <!-- Başlık -->
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:20px;flex-wrap:wrap;">
          <div>
            <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;">${w.title}</h1>
            <p style="margin:0;color:#aaa;font-size:14px;">
              <i class="fas fa-user" style="margin-right:4px;color:#1db954;"></i>${w.username || 'Bilinmiyor'}
              ${w.genre ? `&nbsp;·&nbsp;<span style="color:#1db954;">${w.genre}</span>` : ''}
            </p>
          </div>
          ${isOwner ? `<button onclick="deleteWriting(${id})" style="
            background:rgba(244,67,54,0.15);border:1px solid rgba(244,67,54,0.4);
            color:#f44336;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:13px;flex-shrink:0;
          "><i class="fas fa-trash" style="margin-right:4px;"></i>Sil</button>` : ''}
        </div>

        <!-- Beat Player -->
        ${beatSection}

        <!-- Ortalama Puanlar -->
        ${avgSection}

        <!-- Puanlama -->
        ${ratingSection}

        <!-- Şarkı Sözleri -->
        <div style="
          background:#fff;color:#111;border-radius:12px;padding:24px;
          margin-bottom:20px;white-space:pre-wrap;font-size:16px;
          line-height:1.8;font-family:'Courier New',monospace;
          box-shadow:0 2px 12px rgba(0,0,0,0.3);
        ">${escapeHtml(w.lyrics)}</div>

        <!-- Yorumlar -->
        <div style="background:#111;border-radius:12px;padding:16px;border:1px solid rgba(255,255,255,0.07);">
          <p style="margin:0 0 14px;font-size:15px;font-weight:600;">
            <i class="fas fa-comments" style="color:#1db954;margin-right:6px;"></i>Yorumlar
          </p>
          <div id="wd-comments-list">${commentsHtml}</div>
          ${commentInput}
        </div>

      </div>`;

    // Audio event listeners
    if (w.beat_url) {
      const audio = document.getElementById('beat-audio');
      if (audio) {
        audio.addEventListener('timeupdate', updateBeatProgress);
        audio.addEventListener('loadedmetadata', () => {
          document.getElementById('beat-dur').textContent = formatTime(audio.duration);
        });
        audio.addEventListener('ended', () => {
          const btn = document.getElementById('beat-play-btn');
          if (btn) btn.innerHTML = '<i class="fas fa-play"></i>';
        });
      }
    }

  } catch (e) {
    container.innerHTML = `<div style="text-align:center;padding:40px;color:#f44;">${e.message}</div>`;
  }
}

function renderComment(c, writingId) {
  const canDelete = currentUser && (currentUser.id === c.user_id || currentUser.role === 'admin');
  return `
    <div style="display:flex;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
      <div style="flex:1;min-width:0;">
        <p style="margin:0 0 3px;font-size:13px;font-weight:600;color:#1db954;">${c.username || 'Kullanıcı'}</p>
        <p style="margin:0;font-size:14px;color:#ddd;word-break:break-word;">${escapeHtml(c.comment)}</p>
      </div>
      ${canDelete ? `<button onclick="deleteWritingComment(${c.id},${writingId})" style="
        background:none;border:none;color:#888;cursor:pointer;font-size:14px;
        padding:4px 6px;flex-shrink:0;align-self:flex-start;
      " title="Sil"><i class="fas fa-times"></i></button>` : ''}
    </div>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Beat Player Yardımcıları ───────────────────────────────────────────────
function toggleBeatPlay() {
  const audio = document.getElementById('beat-audio');
  const btn   = document.getElementById('beat-play-btn');
  if (!audio || !btn) return;

  if (audio.paused) {
    audio.play();
    btn.innerHTML = '<i class="fas fa-pause"></i>';
  } else {
    audio.pause();
    btn.innerHTML = '<i class="fas fa-play"></i>';
  }
}

function seekBeat(val) {
  const audio = document.getElementById('beat-audio');
  if (!audio || !audio.duration) return;
  audio.currentTime = (val / 100) * audio.duration;
}

function updateBeatProgress() {
  const audio = document.getElementById('beat-audio');
  const seek  = document.getElementById('beat-seek');
  const cur   = document.getElementById('beat-cur');
  if (!audio) return;
  if (seek && audio.duration) seek.value = (audio.currentTime / audio.duration) * 100;
  if (cur) cur.textContent = formatTime(audio.currentTime);
}

function formatTime(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Puanlama ───────────────────────────────────────────────────────────────
async function rateWriting(id, type, value) {
  if (!currentUser) { showToast('Giriş yapmalısın.'); return; }

  const body = { userId: currentUser.id };
  if (type === 'beat')   body.beatRating   = value;
  if (type === 'lyrics') body.lyricsRating = value;

  try {
    const res  = await fetch(`${API_URL}/music/writing/${id}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hata');

    showToast('Puanın kaydedildi!');
    // Detay sayfasını yenile
    openWritingDetail(id);
  } catch (e) {
    showToast(e.message || 'Bir hata oluştu.');
  }
}

// ─── Yorum Gönder ───────────────────────────────────────────────────────────
async function submitWritingComment(id) {
  if (!currentUser) { showToast('Giriş yapmalısın.'); return; }
  const input   = document.getElementById('wd-comment-input');
  const comment = input?.value.trim();
  if (!comment) { showToast('Yorum boş olamaz.'); return; }

  try {
    const res  = await fetch(`${API_URL}/music/writing/${id}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, comment }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hata');

    if (input) input.value = '';
    // Yorum listesini güncelle
    const newComment = data.comment || { id: data.id, user_id: currentUser.id, username: currentUser.username, comment };
    const list = document.getElementById('wd-comments-list');
    if (list) {
      const empty = list.querySelector('p');
      if (empty) empty.remove();
      list.insertAdjacentHTML('beforeend', renderComment(newComment, id));
    }
  } catch (e) {
    showToast(e.message || 'Bir hata oluştu.');
  }
}

// ─── Yorum Sil ──────────────────────────────────────────────────────────────
async function deleteWritingComment(commentId, writingId) {
  if (!currentUser) return;
  if (!confirm('Yorumu silmek istiyor musun?')) return;

  try {
    const res  = await fetch(`${API_URL}/music/writing/comment/${commentId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hata');

    showToast('Yorum silindi.');
    openWritingDetail(writingId);
  } catch (e) {
    showToast(e.message || 'Bir hata oluştu.');
  }
}

// ─── Şarkı Sil ──────────────────────────────────────────────────────────────
async function deleteWriting(id) {
  if (!currentUser) return;
  if (!confirm('Bu şarkıyı silmek istiyor musun?')) return;

  try {
    const res  = await fetch(`${API_URL}/music/writing/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hata');

    showToast('Şarkı silindi.');
    // Yazılar sayfasına dön
    ['song-writings-page','my-writings-page','writing-detail-page'].forEach(eid => {
      const el = document.getElementById(eid); if (el) el.style.display = 'none';
    });
    const swPage = document.getElementById('song-writings-page');
    if (swPage) { swPage.style.display = 'block'; loadSongWritingsPage(); }
    else showPage('ts-music');
  } catch (e) {
    showToast(e.message || 'Bir hata oluştu.');
  }
}
