async function check() {
  const res = await fetch('https://doctor-leave-line.onrender.com/');
  console.log('Render status:', res.status);
  const text = await res.text();
  console.log('Render index.html snippet:', text.substring(0, 300));
  const match = text.match(/assets\/index-[^"]+\.js/g);
  console.log('Script bundles on Render:', match);
}
check();
