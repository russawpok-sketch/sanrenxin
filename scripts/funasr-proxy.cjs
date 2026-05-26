/**
 * FunASR CORS 代理服务器
 * 解决浏览器跨域问题
 */
const http = require('http');
const httpProxy = require('http-proxy');

const FUNASR_HOST = 'localhost';
const FUNASR_PORT = 10095;
const PROXY_PORT = 10096;

// 创建代理服务器
const proxy = httpProxy.createProxyServer({
  target: `http://${FUNASR_HOST}:${FUNASR_PORT}`,
  changeOrigin: true,
});

// 创建 HTTP 服务器
const server = http.createServer((req, res) => {
  // 添加 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // 代理请求到 FunASR
  proxy.web(req, res, (err) => {
    console.error('代理错误:', err);
    res.writeHead(502);
    res.end('FunASR 服务器无法访问');
  });
});

// 启动服务器
server.listen(PROXY_PORT, () => {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  FunASR CORS 代理服务器                      ║');
  console.log(`║  代理地址: http://localhost:${PROXY_PORT}          ║`);
  console.log(`║  目标地址: http://${FUNASR_HOST}:${FUNASR_PORT}          ║`);
  console.log('║  CORS: 已启用                                ║');
  console.log('╚══════════════════════════════════════════════╝');
});

// 错误处理
proxy.on('error', (err, req, res) => {
  console.error('代理错误:', err.message);
  if (!res.headersSent) {
    res.writeHead(502);
    res.end('FunASR 服务器无法访问');
  }
});

process.on('SIGINT', () => {
  console.log('\n代理服务器已停止');
  process.exit(0);
});
