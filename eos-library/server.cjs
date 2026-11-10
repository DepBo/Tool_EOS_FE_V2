const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const base=__dirname,port=Number(process.env.PORT)||4178;
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.json':'application/json'};
const server=http.createServer((req,res)=>{
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end();return;}
  const file=path.resolve(base,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(base+path.sep)||!['index.html','app.js','core.js','styles.css','README.md'].includes(path.basename(file))){res.writeHead(404);res.end();return;}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'text/plain; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);});
});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'Cổng 4178 đang được dùng. Nếu Studyroom đã mở, truy cập http://127.0.0.1:4178':e.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`Studyroom: http://127.0.0.1:${port}\nGiữ cửa sổ này mở. Ctrl+C để dừng.`));
