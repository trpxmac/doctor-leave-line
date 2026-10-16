async function test() {
  const res = await fetch('https://liff.line.me/2011832574-WtcSrDre');
  const text = await res.text();
  console.log('--- LIFF HTML ---');
  console.log(text);
}
test();
