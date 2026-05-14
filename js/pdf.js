/*
  CLARA – PDF Export Module
  Genera el informe completo en PDF con imagen MRI, Grad-CAM y regiones cerebrales.
  Requiere jsPDF (cargado desde CDN en index.html).
*/

async function exportarPDF() {
  showToast('Generando PDF...');

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const W      = 210;
  const margen = 15;
  let y        = margen;

  // ── Paleta ──────────────────────────────────────────────────────────────────
  const primario = [139, 90, 43];
  const gris     = [100, 100, 100];
  const fondo    = [248, 245, 242];
  const linea    = [220, 210, 200];

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const _linea = (yPos) => {
    doc.setDrawColor(...linea);
    doc.line(margen, yPos, W - margen, yPos);
  };

  const _seccion = (titulo, yPos) => {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primario);
    doc.text(titulo, margen, yPos);
    _linea(yPos + 2);
    return yPos + 8;
  };

  const _saltoSiNecesario = (yPos, minEspacio = 40) => {
    if (yPos + minEspacio > 280) {
      doc.addPage();
      return margen;
    }
    return yPos;
  };

  // ── Encabezado ───────────────────────────────────────────────────────────────
  doc.setFillColor(...fondo);
  doc.rect(0, 0, W, 30, 'F');

  doc.setFontSize(20);
  doc.setTextColor(...primario);
  doc.setFont('helvetica', 'bold');
  doc.text('CLARA', margen, 13);

  doc.setFontSize(9);
  doc.setTextColor(...gris);
  doc.setFont('helvetica', 'normal');
  doc.text('Clinical Learning Assistant for Radiology Analysis', margen, 19);
  doc.text(`Informe generado: ${new Date().toLocaleString('es-CO')}`, margen, 25);

  const user = Session.getUser();
  if (user) {
    doc.text(`Médico: ${user.nombre || ''} ${user.apellido || ''}`.trim(), W - margen, 25, { align: 'right' });
  }

  y = 38;

  // ── Resumen diagnóstico ───────────────────────────────────────────────────────
  y = _seccion('Resumen del Diagnóstico', y);

  const badge     = document.getElementById('result-badge')?.textContent  || '—';
  const confianza = document.getElementById('result-conf')?.textContent   || '—';
  const fecha     = document.getElementById('result-fecha')?.textContent  || '—';
  const modelo    = document.getElementById('tech-model')?.textContent    || '—';
  const tiempo    = document.getElementById('tech-tiempo')?.textContent   || '—';

  const datos = [
    ['Tipo de estudio',          'Resonancia Magnética Cerebral'],
    ['Clasificación',            badge],
    ['Confianza del modelo',     confianza],
    ['Fecha del análisis',       fecha],
    ['Modelo IA',                modelo],
    ['Tiempo de procesamiento',  tiempo],
    ['Dataset',                  'ADNI + OASIS'],
    ['Algoritmo',                'Deep Learning CNN'],
  ];

  doc.setFontSize(9);
  datos.forEach(([label, valor]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...gris);
    doc.text(label + ':', margen, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    doc.text(String(valor), margen + 70, y);
    y += 6;
  });

  y += 4;

  // ── Imágenes ─────────────────────────────────────────────────────────────────
  const mriImg     = document.getElementById('mri-img');
  const gradcamImg = document.getElementById('gradcam-img');
  const imgW       = 82;
  const imgH       = 55;

  const tieneMRI     = mriImg?.src     && mriImg.style.display     !== 'none' && mriImg.src     !== window.location.href;
  const tieneGradcam = gradcamImg?.src && gradcamImg.style.display !== 'none' && gradcamImg.src !== window.location.href;

  if (tieneMRI || tieneGradcam) {
    y = _saltoSiNecesario(y, imgH + 20);
    y = _seccion('Imágenes del Análisis', y);

    if (tieneMRI) {
      try {
        const formato = mriImg.src.startsWith('blob:') ? 'JPEG' : 'JPEG';
        // Para blob URLs necesitamos convertir a base64 primero
        const base64 = await _imgABase64(mriImg);
        doc.addImage(base64, 'JPEG', margen, y, imgW, imgH);
        doc.setFontSize(8);
        doc.setTextColor(...gris);
        doc.text('Imagen MRI Original', margen + imgW / 2, y + imgH + 4, { align: 'center' });
      } catch (e) {
        console.warn('[PDF] No se pudo incluir MRI:', e);
      }
    }

    if (tieneGradcam) {
      try {
        const src = gradcamImg.src.startsWith('data:')
          ? gradcamImg.src
          : await _imgABase64(gradcamImg);
        doc.addImage(src, 'PNG', W - margen - imgW, y, imgW, imgH);
        doc.setFontSize(8);
        doc.setTextColor(...gris);
        doc.text('Mapa de Calor Grad-CAM', W - margen - imgW / 2, y + imgH + 4, { align: 'center' });
      } catch (e) {
        console.warn('[PDF] No se pudo incluir Grad-CAM:', e);
      }
    }

    y += imgH + 10;
  }

  // ── Regiones cerebrales ───────────────────────────────────────────────────────
  y = _saltoSiNecesario(y, 60);
  y = _seccion('Análisis de Regiones Cerebrales', y);

  const regiones = [
    { nombre: 'Hipocampo',      badge: 'badge-hipocampo', desc: 'desc-hipocampo', bar: 'bar-hipocampo', note: 'note-hipocampo' },
    { nombre: 'Córtex Frontal', badge: 'badge-cortex',    desc: 'desc-cortex',    bar: 'bar-cortex',    note: 'note-cortex'   },
    { nombre: 'Amígdala',       badge: 'badge-amigdala',  desc: 'desc-amigdala',  bar: 'bar-amigdala',  note: 'note-amigdala' },
  ];

  regiones.forEach(r => {
    y = _saltoSiNecesario(y, 28);

    const badgeText = document.getElementById(r.badge)?.textContent || '—';
    const descText  = document.getElementById(r.desc)?.textContent  || '—';
    const barEl     = document.getElementById(r.bar);
    const barPct    = barEl ? parseFloat(barEl.style.width) || 0 : 0;
    const noteText  = document.getElementById(r.note)?.textContent  || '—';
    const barW      = W - margen * 2;

    // Nombre y badge
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text(r.nombre, margen, y);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...gris);
    doc.text(badgeText, W - margen, y, { align: 'right' });
    y += 5;

    // Barra de activación
    doc.setFillColor(230, 220, 210);
    doc.roundedRect(margen, y, barW, 4, 2, 2, 'F');
    if (barPct > 0) {
      doc.setFillColor(...primario);
      doc.roundedRect(margen, y, barW * (barPct / 100), 4, 2, 2, 'F');
    }
    y += 7;

    // Descripción
    doc.setFontSize(8);
    doc.setTextColor(...gris);
    doc.text(descText, margen, y);
    y += 5;

    // Nota clínica
    const noteLines = doc.splitTextToSize(noteText, barW);
    doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 80);
    doc.text(noteLines, margen, y);
    y += noteLines.length * 4 + 5;
  });

  // ── Pie de página ─────────────────────────────────────────────────────────────
  const totalPags = doc.getNumberOfPages();
  for (let i = 1; i <= totalPags; i++) {
    doc.setPage(i);
    doc.setFillColor(...fondo);
    doc.rect(0, 287, W, 10, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...gris);
    doc.text('CLARA — Informe de análisis de neuroimagen. Solo para uso clínico informativo.', margen, 293);
    doc.text(`Página ${i} de ${totalPags}`, W - margen, 293, { align: 'right' });
  }

  // ── Descargar ─────────────────────────────────────────────────────────────────
  const fechaArchivo = new Date().toISOString().slice(0, 10);
  doc.save(`CLARA-informe-${fechaArchivo}.pdf`);
  showToast('PDF descargado correctamente');
}

// ── Helper: convierte un <img> a base64 usando canvas ────────────────────────
function _imgABase64(imgEl) {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width  = imgEl.naturalWidth  || 512;
      canvas.height = imgEl.naturalHeight || 512;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imgEl, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    } catch (e) {
      reject(e);
    }
  });
}
