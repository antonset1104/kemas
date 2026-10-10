(() => {
  const form = document.getElementById('calculator');
  if (!form) return;
  const result = document.getElementById('result');
  const lang = form.dataset.lang;
  const id = lang === 'id';
  const number = key => Number(document.getElementById(key).value);
  const fmt = value => new Intl.NumberFormat(id ? 'id-ID' : 'en-US', {maximumFractionDigits: 3}).format(value);
  const row = (label, value) => `<div class="result-row"><span>${label}</span><strong>${value}</strong></div>`;
  const valid = (v, allowZero = false) => Number.isFinite(v) && (allowZero ? v >= 0 : v > 0) && v <= 1000000;
  form.addEventListener('submit', event => {
    event.preventDefault();
    let html = '';
    if (form.dataset.tool === 'dimension') {
      const sides = ['length','width','height'].map(number);
      const weight = number('weight');
      const divisor = number('divisor');
      if (![...sides, weight, divisor].every(v => valid(v))) {
        result.innerHTML = `<h2>${id ? 'Periksa masukan' : 'Check inputs'}</h2><p>${id ? 'Isi semua angka positif, termasuk pembagi dari layanan Anda.' : 'Enter positive values, including your service divisor.'}</p>`;
        return;
      }
      const volume = sides.reduce((a,b) => a*b,1);
      const sorted = [...sides].sort((a,b) => b-a);
      const girth = 2*(sorted[1]+sorted[2]);
      const dim = volume/divisor;
      html = row(id?'Volume luar':'External volume',`${fmt(volume)} cm³`)
        + row(id?'Setara liter':'Litres',`${fmt(volume/1000)} L`)
        + row(id?'Sisi terpanjang':'Longest side',`${fmt(sorted[0])} cm`)
        + row(id?'Keliling':'Girth',`${fmt(girth)} cm`)
        + row(id?'Panjang + keliling':'Length + girth',`${fmt(sorted[0]+girth)} cm`)
        + row(id?'Berat dimensi':'Dimensional weight',`${fmt(dim)} kg`)
        + row(id?'Nilai perbandingan lebih besar':'Larger comparison value',`${fmt(Math.max(weight,dim))} kg`)
        + `<p class="result-note">${id?'Pembagi dan aturan pembulatan mengikuti jasa kirim. Ini bukan berat tagihan atau tarif pasti.':'Carrier divisor and rounding rules apply. This is not a guaranteed billable weight or rate.'}</p>`;
    } else {
      const item = ['item-length','item-width','item-height'].map(number);
      const box = ['box-length','box-width','box-height'].map(number);
      const clearance = number('clearance');
      if (![...item,...box].every(v=>valid(v)) || !valid(clearance,true)) {
        result.innerHTML = `<h2>${id ? 'Periksa masukan' : 'Check inputs'}</h2><p>${id ? 'Ukuran harus positif; ruang pelindung boleh nol.' : 'Dimensions must be positive; clearance may be zero.'}</p>`;
        return;
      }
      const required = item.map(v=>v+2*clearance);
      const orders = document.getElementById('rotate').checked ? [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]] : [[0,1,2]];
      const fit = orders.find(order=>order.every((index,axis)=>required[index] <= box[axis]));
      html = row(id?'Kebutuhan ruang':'Required inner space',required.map(fmt).join(' × ')+' cm')
        + row(id?'Ruang dalam kotak':'Box inner size',box.map(fmt).join(' × ')+' cm')
        + row(id?'Kecocokan geometri':'Geometric fit',fit ? (id?'Muat':'Fits') : (id?'Tidak muat':'Does not fit'));
      if (fit) html += row(id?'Orientasi kebutuhan':'Required orientation',fit.map(i=>fmt(required[i])).join(' × ')+' cm')
        + row(id?'Sisa tiap arah':'Remaining per axis',fit.map((i,axis)=>fmt(box[axis]-required[i])).join(' × ')+' cm');
      html += `<p class="result-note">${id?'Uji barang dan pelindung asli sebelum mengirim. Kecocokan angka bukan jaminan aman.':'Trial-pack the real item and cushioning before shipping. Numeric fit is not a safety guarantee.'}</p>`;
    }
    result.innerHTML = `<h2>${id?'Hasil':'Result'}</h2>${html}`;
    if (typeof window.gtag === 'function') window.gtag('event','tool_calculate',{tool_name:form.dataset.tool,page_language:lang});
  });
})();
