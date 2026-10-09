async function testBothPorts() {
  console.log('Testing Port 5000 (Backend serving Web App & API)...');
  const r1 = await fetch('http://localhost:5000/');
  const t1 = await r1.text();
  console.log('Port 5000 / -> Status:', r1.status, 'Serves HTML:', t1.includes('<div id="root"></div>'));

  const r2 = await fetch('http://localhost:5000/species');
  const t2 = await r2.text();
  console.log('Port 5000 /species -> Status:', r2.status, 'Serves HTML:', t2.includes('<div id="root"></div>'));

  const r3 = await fetch('http://localhost:5000/measure');
  const t3 = await r3.text();
  console.log('Port 5000 /measure -> Status:', r3.status, 'Serves HTML:', t3.includes('<div id="root"></div>'));

  const r4 = await fetch('http://localhost:5000/api/v1/health');
  const j4 = await r4.json();
  console.log('Port 5000 /api/v1/health -> Status:', r4.status, 'Health:', j4.status);

  console.log('\nTesting Port 3000 (Vite Dev Server)...');
  const r5 = await fetch('http://localhost:3000/');
  const t5 = await r5.text();
  console.log('Port 3000 / -> Status:', r5.status, 'Serves HTML:', t5.includes('<div id="root"></div>'));

  const r6 = await fetch('http://localhost:3000/species');
  const t6 = await r6.text();
  console.log('Port 3000 /species -> Status:', r6.status, 'Serves HTML:', t6.includes('<div id="root"></div>'));

  const r7 = await fetch('http://localhost:3000/api/v1/species');
  const j7 = await r7.json();
  console.log('Port 3000 /api/v1/species (Proxied) -> Status:', r7.status, 'Count:', j7.count);
}

testBothPorts().catch(console.error);
