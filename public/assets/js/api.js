// Pembungkus fetch + parsing JSON.
// mock = true  -> baca data contoh dari assets/data/<nama>.json
// mock = false -> panggil endpoint PHP: api/<nama>.php (format respons sama: {status, data})
const api = {
  mock: true,
  async get(nama, params = {}) {
    const url = this.mock
      ? `assets/data/${nama}.json`
      : `api/${nama}.php?${new URLSearchParams(params)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Gagal memuat data');
    const json = await res.json();
    if (json.status !== 'ok') throw new Error(json.message || 'Gagal memuat data');
    return json.data;
  }
};
