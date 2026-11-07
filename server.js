// سيرفر غرفة المشاهدة — من غير أي مكتبات. التشغيل: node server.js
const http=require('http'),fs=require('fs'),path=require('path');
const PORT=process.env.PORT||3000;
const rooms=new Map(); // room -> Map(id -> {res,presence})
function bcast(room,ev,data){const r=rooms.get(room);if(!r)return;
  const p='event: '+ev+'\ndata: '+JSON.stringify(data)+'\n\n';for(const c of r.values())c.res.write(p)}
function sendPeers(room){const r=rooms.get(room);if(!r)return;
  bcast(room,'peers',[...r].map(([id,c])=>({id,presence:c.presence})))}
http.createServer((req,res)=>{
  const u=new URL(req.url,'http://x'),room=(u.searchParams.get('room')||'main').slice(0,40),id=(u.searchParams.get('id')||'').slice(0,20);
  if(u.pathname==='/events'&&id){
    res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive','X-Accel-Buffering':'no'});
    res.write(':ok\n\n');
    if(!rooms.has(room))rooms.set(room,new Map());
    const r=rooms.get(room);r.set(id,{res,presence:{}});sendPeers(room);
    const ka=setInterval(()=>res.write(':\n\n'),20000);
    req.on('close',()=>{clearInterval(ka);r.delete(id);if(!r.size)rooms.delete(room);else sendPeers(room)});
    return;
  }
  if(u.pathname==='/send'&&req.method==='POST'){
    let b='';req.on('data',d=>{b+=d;if(b.length>8192)req.destroy()});
    req.on('end',()=>{try{const m=JSON.parse(b),c=rooms.get(room)&&rooms.get(room).get(id);
      if(c){
        if(m.presence&&typeof m.presence==='object'){c.presence={name:String(m.presence.name||'').slice(0,20),host:!!m.presence.host,file:!!m.presence.file};sendPeers(room)}
        if(typeof m.topic==='string'&&/^[a-z]{1,20}$/.test(m.topic))bcast(room,'msg',{topic:m.topic,data:m.data,from:id});
      }}catch(e){}res.writeHead(204);res.end()});
    return;
  }
  fs.readFile(path.join(__dirname,'index.html'),(e,d)=>{res.writeHead(e?500:200,{'Content-Type':'text/html; charset=utf-8'});res.end(d)});
}).listen(PORT,()=>console.log('شغال على http://localhost:'+PORT));
