(() => {
  const $ = s => document.querySelector(s);
  const rp = n => 'Rp ' + Number(n).toLocaleString('id-ID');
  const esc = t => String(t).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
  const IKON = '<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
  let barang = [], kategori = [], keranjang = muat();

  function muat() { try { return JSON.parse(localStorage.getItem('snaprent_keranjang')) || []; } catch { return []; } }
  function simpan() {
    try { localStorage.setItem('snaprent_keranjang', JSON.stringify(keranjang)); } catch {}
    $('#jumlah').textContent = keranjang.length;
    $('#jumlah').hidden = !keranjang.length;
  }

  const waktu = id => { const v = $(id).value; return v ? new Date(v) : null; };
  const rentang = () => { const m = waktu('#mulai'), s = waktu('#selesai'); return m && s && s > m ? [m, s] : null; };
  // Pembulatan ke atas per 24 jam, minimal 1 hari (sama dengan trigger di database)
  const hari = ([m, s]) => Math.max(1, Math.ceil((s - m) / 864e5));
  const namaKat = id => (kategori.find(k => k.id_kategori == id) || {}).nama_kategori || '';
  const bisa = b => {
    if (b.status_barang !== 'aktif') return false;
    const r = rentang();
    return !r || !b.jadwal.some(j => new Date(j.mulai) < r[1] && r[0] < new Date(j.kembali));
  };

  const kartu = b => {
    const ok = bisa(b);
    return `<li class="kartu">
      <div class="foto">${b.foto_barang ? `<img src="${esc(b.foto_barang)}" alt="${esc(b.nama_barang)}" loading="lazy">` : IKON}</div>
      <span class="kat">${esc(namaKat(b.id_kategori))}</span>
      <h3 class="nama">${esc(b.nama_barang)}</h3>
      <div class="harga">${rp(b.harga_sewa_per_hari)} <small>/ hari</small></div>
      <div class="status ${ok ? '' : 'no'}">${ok ? 'Tersedia' : 'Tidak tersedia'}</div>
      <button class="btn" data-id="${b.id_barang}">Detail &amp; Sewa</button></li>`;
  };

  function render() {
    const m = waktu('#mulai'), s = waktu('#selesai');
    $('#pesan').textContent = m && s && s <= m ? 'Waktu selesai harus setelah waktu mulai.' : '';
    const k = $('#kategori').value, q = $('#cari').value.trim().toLowerCase();
    const daftar = barang.filter(b => (!k || b.id_kategori == k) && b.nama_barang.toLowerCase().includes(q));
    $('#grid').innerHTML = daftar.length ? daftar.map(kartu).join('')
      : '<li class="kosong">Tidak ada kamera yang cocok. Coba ubah kategori atau kata kunci.</li>';
    $('#hasil').textContent = daftar.length + ' unit ditemukan';
  }

  function buka() { if (!$('#dlg').open) $('#dlg').showModal(); }

  function detail(id) {
    const b = barang.find(x => x.id_barang == id), ok = bisa(b), r = rentang(), ada = keranjang.includes(b.id_barang);
    $('#isi').innerHTML = `<h2>${esc(b.nama_barang)}</h2>
      <p class="sub" style="margin:0">${esc(namaKat(b.id_kategori))}</p>
      <div class="baris"><span>Harga sewa</span><b>${rp(b.harga_sewa_per_hari)} / hari</b></div>
      <div class="baris"><span>Status</span><b class="status ${ok ? '' : 'no'}">${ok ? 'Tersedia' : 'Tidak tersedia'}</b></div>
      ${b.kondisi_fisik ? `<div class="baris"><span>Kelengkapan</span><span>${esc(b.kondisi_fisik)}</span></div>` : ''}
      ${r ? `<div class="baris"><span>Lama sewa</span><b>${hari(r)} hari</b></div>
             <div class="baris"><span>Perkiraan biaya</span><b>${rp(hari(r) * b.harga_sewa_per_hari)}</b></div>`
          : '<p class="sub">Pilih tanggal mulai dan selesai untuk melihat perkiraan biaya.</p>'}
      <div class="aksi"><button class="btn garis" data-act="tutup">Tutup</button>
      <button class="btn" data-act="tambah" data-id="${b.id_barang}" ${ok && !ada ? '' : 'disabled'}>${ada ? 'Sudah di keranjang' : 'Tambah ke keranjang'}</button></div>`;
    buka();
  }

  function lihatKeranjang() {
    const r = rentang(), it = keranjang.map(id => barang.find(b => b.id_barang == id)).filter(Boolean);
    const total = it.reduce((t, b) => t + b.harga_sewa_per_hari * (r ? hari(r) : 1), 0);
    $('#isi').innerHTML = '<h2>Keranjang</h2>' + (it.length
      ? it.map(b => `<div class="baris"><span>${esc(b.nama_barang)}</span><button class="btn garis" data-act="hapus" data-id="${b.id_barang}">Hapus</button></div>`).join('')
        + `<div class="baris"><span>Perkiraan total ${r ? '(' + hari(r) + ' hari)' : '(per hari)'}</span><b>${rp(total)}</b></div>`
      : '<p class="sub">Keranjang masih kosong. Pilih kamera lalu tekan Detail &amp; Sewa.</p>')
      + '<div class="aksi"><button class="btn garis" data-act="tutup">Tutup</button></div>';
    buka();
  }

  $('#isi').addEventListener('click', e => {
    const { act, id } = e.target.dataset;
    if (act === 'tutup') $('#dlg').close();
    if (act === 'tambah') { keranjang.push(+id); simpan(); detail(id); render(); }
    if (act === 'hapus') { keranjang = keranjang.filter(x => x !== +id); simpan(); lihatKeranjang(); }
  });
  $('#grid').addEventListener('click', e => { const t = e.target.closest('[data-id]'); if (t) detail(t.dataset.id); });
  $('#btn-keranjang').addEventListener('click', lihatKeranjang);

  (async () => {
    try {
      const d = await api.get('barang');
      barang = d.barang; kategori = d.kategori;
      $('#kategori').innerHTML += kategori.map(k => `<option value="${k.id_kategori}">${esc(k.nama_kategori)}</option>`).join('');
      const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      $('#mulai').min = $('#selesai').min = now.toISOString().slice(0, 16);
      ['#mulai', '#selesai', '#kategori'].forEach(s => $(s).addEventListener('change', render));
      $('#cari').addEventListener('input', render);
      simpan(); render();
    } catch (e) {
      $('#grid').innerHTML = '<li class="kosong">Katalog gagal dimuat. Pastikan halaman dibuka lewat server lokal, lalu muat ulang.</li>';
    }
  })();
})();
