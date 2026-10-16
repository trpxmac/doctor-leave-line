import { spawn } from 'child_process';

const chrome = spawn("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", [
  "--headless=new",
  "--remote-debugging-port=9222",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  "--user-data-dir=C:\\Users\\NEXT Speed\\AppData\\Local\\Temp\\chrome-debug",
  "http://localhost:5000"
]);

async function check() {
  for (let i = 0; i < 10; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9222/json');
      const tabs = await res.json();
      const pageTab = tabs.find(t => t.type === 'page' && t.url.includes('5000'));
      if (pageTab) {
        console.log('Found page tab:', pageTab.title);
        const ws = new WebSocket(pageTab.webSocketDebuggerUrl);

        ws.onopen = () => {
          ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
          ws.send(JSON.stringify({ id: 2, method: 'Log.enable' }));
          ws.send(JSON.stringify({ id: 3, method: 'Page.enable' }));
          ws.send(JSON.stringify({ id: 4, method: 'Page.reload' }));
        };

        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.method === 'Runtime.exceptionThrown') {
            console.error('❌ EXCEPTION THROWN:', JSON.stringify(msg.params.exceptionDetails, null, 2));
          }
          if (msg.method === 'Runtime.consoleAPICalled') {
            console.log('📢 CONSOLE:', msg.params.type, msg.params.args.map(a => a.value || a.description).join(' '));
          }
        };

        setTimeout(() => {
          ws.close();
          chrome.kill();
          process.exit(0);
        }, 4000);
        return;
      }
    } catch (e) {
      // retry
    }
    await new Promise(r => setTimeout(r, 500));
  }
  chrome.kill();
  process.exit(1);
}
check();
