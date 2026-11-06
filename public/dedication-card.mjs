import {ui} from './language.mjs?v=34';

const messages = {
  brick: ['मंदिर में मेरी ईंट', 'My brick in the temple'],
  diya: ['राम के नाम एक दीया', 'A diya lit in Ram’s name'],
  plant: ['राम के आँगन में मेरा पौधा', 'My tree in Ram’s courtyard'],
};

function fittedText(ctx, text, y, maxWidth, startSize, weight, color) {
  let size = startSize;
  do { ctx.font = `${weight} ${size--}px Georgia, "Nirmala UI", serif`; }
  while (size > 18 && ctx.measureText(text).width > maxWidth);
  ctx.fillStyle = color;
  ctx.fillText(text, 540, y, maxWidth);
}

function drawCard(order, snapshot) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  const gold = ctx.createLinearGradient(0, 0, 1080, 1920);
  gold.addColorStop(0, '#f9edc9');
  gold.addColorStop(.5, '#dfbc75');
  gold.addColorStop(1, '#fbefcb');
  ctx.fillStyle = gold;
  ctx.fillRect(0, 0, 1080, 1920);
  ctx.strokeStyle = '#a67a36';
  ctx.lineWidth = 4;
  ctx.strokeRect(40, 40, 1000, 1840);
  ctx.strokeRect(55, 55, 970, 1810);
  ctx.textAlign = 'center';
  fittedText(ctx, ui('राम मंदिर बनाओ','RAM MANDIR BANAO'), 190, 900, 46, 700, '#553216');
  fittedText(ctx, ui('श्रीराम को समर्पित','A DEDICATION TO SHRI RAM'), 270, 870, 32, 600, '#734b25');
  if (snapshot?.width && snapshot?.height) {
    const scale = Math.min(920 / snapshot.width, 780 / snapshot.height);
    const w = snapshot.width * scale, h = snapshot.height * scale;
    ctx.fillStyle = '#39241b';
    ctx.fillRect(80, 345, 920, 780);
    ctx.drawImage(snapshot, (1080-w)/2, 345+(780-h)/2, w, h);
  } else {
    ctx.fillStyle = '#3b261b';
    ctx.fillRect(80, 345, 920, 780);
    fittedText(ctx, {brick:'🧱',diya:'🪔',plant:'🌿'}[order.kind], 825, 730, 250, 400, '#f3d897');
  }
  const title = ui(...messages[order.kind]);
  const name = order.anonymous ? ui('गुप्त समर्पण','Anonymous dedication') : (order.name || ui('श्रीराम के नाम','In Shri Ram’s name'));
  fittedText(ctx, title, 1260, 900, 60, 700, '#5b361f');
  fittedText(ctx, name, 1400, 900, 94, 700, '#322116');
  const date = new Intl.DateTimeFormat(document.documentElement.lang || 'en-IN', {
    dateStyle:'long', timeZone:'Asia/Kolkata'
  }).format(new Date(order.confirmedAt || order.createdAt || Date.now()));
  fittedText(ctx, date, 1510, 900, 36, 400, '#734b25');
  fittedText(ctx, ui('मेरे समर्पण को देखें','Visit my dedication'), 1675, 880, 43, 700, '#553216');
  fittedText(ctx, 'rammandirbanao.tech', 1760, 890, 39, 400, '#734b25');
  return canvas;
}

export function mountDedicationCard(container, order, capture) {
  if (order.paymentStatus !== 'paid' || order.demo || !messages[order.kind]) return;
  const url = new URL(location.pathname, location.origin);
  url.searchParams.set('place', order.id);
  const caption = ui('राम मंदिर बनाओ में मेरा समर्पण देखें','Come see my dedication at Ram Mandir Banao') + '\n' + url.href;
  let snapshot;
  try { snapshot = capture?.(); } catch { /* The card can use its dedication symbol offline. */ }
  const canvas = drawCard(order, snapshot);
  canvas.className = 'dedication-card-image';
  canvas.setAttribute('role','img');
  canvas.setAttribute('aria-label',ui('आपका सुनहरा समर्पण कार्ड','Your gold dedication card'));
  const section = document.createElement('section');
  section.className = 'dedication-share-card';
  section.dataset.i18nIgnore = '';
  const heading = document.createElement('h3');
  heading.textContent = ui('आपका सुनहरा समर्पण कार्ड','Your gold dedication card');
  const actions = document.createElement('div');
  actions.className = 'dedication-card-actions';
  const share = document.createElement('button');
  share.type = 'button';
  share.className = 'primary';
  share.textContent = ui('कार्ड साझा करें','Share card');
  const download = document.createElement('button');
  download.type = 'button';
  download.className = 'secondary';
  download.textContent = ui('फ़ोटो डाउनलोड करें','Download photo');
  share.disabled = download.disabled = true;
  const status = document.createElement('p');
  status.className = 'micro';
  status.setAttribute('role','status');
  actions.append(share, download);
  section.append(heading, canvas, actions, status);
  container.querySelector('#dialogTitle')?.after(section);
  const whatsapp = () => window.open('https://wa.me/?text='+encodeURIComponent(caption),'_blank','noopener,noreferrer');
  canvas.toBlob(blob => {
    if (!blob || !section.isConnected) {
      status.textContent = ui('कार्ड उपलब्ध नहीं है। नीचे अपना लिंक साझा करें।','The photo is unavailable. You can share your place link below.');
      return;
    }
    const file = new File([blob], 'ram-mandir-dedication.png', {type:'image/png'});
    const canShareImage = navigator.canShare?.({files:[file]}) && typeof navigator.share === 'function';
    share.disabled = download.disabled = false;
    if (!canShareImage) share.textContent = ui('WhatsApp पर लिंक भेजें','Share link on WhatsApp');
    download.onclick = () => {
      const href = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = href;
      link.download = file.name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(href), 1000);
    };
    share.onclick = async () => {
      if (!canShareImage) { whatsapp(); return; }
      try { await navigator.share({files:[file],text:caption}); }
      catch (error) {
        if (error.name !== 'AbortError') {
          status.textContent = ui('फ़ोटो डाउनलोड करें और WhatsApp में जोड़ें।','Download the photo and attach it in WhatsApp.');
          share.textContent = ui('WhatsApp पर लिंक भेजें','Share link on WhatsApp');
          share.onclick = whatsapp;
        }
      }
    };
  }, 'image/png');
}
