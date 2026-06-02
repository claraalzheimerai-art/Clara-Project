// ============================================================
// CLARA — Script para generar cuenta Ethereal (solo una vez)
// Ejecutar: npx ts-node src/scripts/create-ethereal-account.ts
// ============================================================

import { EmailService } from '../services/email.service';

async function main() {
  console.log('Generando cuenta Ethereal...\n');
  const { user, pass } = await EmailService.createEtherealAccount();

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅  Agrega estas líneas a tu .env:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`ETHEREAL_USER=${user}`);
  console.log(`ETHEREAL_PASS=${pass}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\nPara ver los emails enviados en desarrollo:');
  console.log('https://ethereal.email  →  inicia sesión con las credenciales de arriba');
}

main().catch(console.error);