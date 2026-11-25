/* ---------- EARTH: globo com imagem de satélite real (NASA), nuvens animadas, dia/noite, fronteiras (Natural Earth) ----------
   Ativado com meta.json "geo": true. Tudo em graus.
   EARTH.globe(ctx,{cx,cy,R,lat0,lon0,sun:[lat,lon]|null,clouds:deslocamento_em_graus|null,cloudA,sx,sy,a,night})
   EARTH.borders(ctx,view,{color,lw,a,glow,hi:{iso:'CHL',color,fill}})   EARTH.proj(view)(lat,lon)->[X,Y,visível]
   EARTH.circle(ctx,view,lat,lon,raioGraus,{color,lw,a})   EARTH.label(ctx,view,lat,lon,texto,{...txt})   EARTH.country(iso)
   EARTH.flat(ctx,[x,y,w,h],{lon:[a,b],lat:[c,d],borders,hi,night})   mapa plano (equirretangular) */
const EARTH=(()=>{
  const D=Math.PI/180,tex={};
  function pix(name){if(tex[name])return tex[name];const im=FX.IMG[name];if(!im)return null;const c=document.createElement('canvas');c.width=im.width;c.height=im.height;
    const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0);return tex[name]={w:c.width,h:c.height,d:g.getImageData(0,0,c.width,c.height).data,c}}
  const buf=document.createElement('canvas'),bg2=buf.getContext('2d');
  const sstep=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t)};
  function globe(ctx,o){const R=Math.max(8,Math.round(o.R)),S=2*R,T=pix('geo:terra.jpg'),N=pix('geo:noite.jpg'),Cl=pix('geo:nuvens.jpg');if(!T)return;
    if(buf.width!==S){buf.width=S;buf.height=S}const img=bg2.createImageData(S,S),out=img.data;
    const l0=(o.lat0||0)*D,L0=(o.lon0||0)*D,cl=Math.cos(l0),sl=Math.sin(l0),sun=o.sun,sLa=sun?sun[0]*D:0,sLo=sun?sun[1]*D:0,ssl=Math.sin(sLa),csl=Math.cos(sLa);
    const cOff=o.clouds!=null?o.clouds:null,cA=o.cloudA??.85,nightK=o.night??1;
    for(let py=0;py<S;py++){const y=-(py+.5-R)/R;for(let px=0;px<S;px++){const x=(px+.5-R)/R,r2=x*x+y*y;if(r2>1)continue;const z=Math.sqrt(1-r2);
      const yy=y*cl+z*sl,zz=-y*sl+z*cl,lat=Math.asin(Math.max(-1,Math.min(1,yy))),lon=L0+Math.atan2(x,zz);
      let u=(lon/(2*Math.PI)+.5)%1;if(u<0)u+=1;const v=(.5-lat/Math.PI);
      const ti=(Math.min(T.h-1,v*T.h|0)*T.w+(u*T.w|0))*4;let r=T.d[ti],g=T.d[ti+1],b=T.d[ti+2];
      let day=1;if(sun){const sd=Math.sin(lat)*ssl+Math.cos(lat)*csl*Math.cos(lon-sLo);day=sstep(-.12,.18,sd)}
      if(Cl&&cOff!=null){let cu=(u+cOff/360)%1;if(cu<0)cu+=1;const ci=(Math.min(Cl.h-1,v*Cl.h|0)*Cl.w+(cu*Cl.w|0))*4,cv=Cl.d[ci]/255*cA;r=r+(255-r)*cv;g=g+(255-g)*cv;b=b+(255-b)*cv}
      const lit=.18+.82*day;r*=lit;g*=lit;b*=lit;
      if(N&&sun&&day<1){const ni=(Math.min(N.h-1,v*N.h|0)*N.w+(u*N.w|0))*4,k=(1-day)*nightK*1.1;r+=N.d[ni]*k;g+=N.d[ni+1]*k*.85;b+=N.d[ni+2]*k*.55}
      const limb=.55+.45*z,at=Math.pow(1-z,3)*.6;r=r*limb+98*at;g=g*limb+208*at;b=b*limb+234*at;
      const i=(py*S+px)*4;out[i]=r;out[i+1]=g;out[i+2]=b;out[i+3]=255*Math.min(1,(1-Math.sqrt(r2))*R*1.5)}}
    bg2.putImageData(img,0,0);const sx=o.sx??1,sy=o.sy??1;ctx.save();ctx.globalAlpha*=o.a??1;
    const gl=ctx.createRadialGradient(o.cx,o.cy,R*.95,o.cx,o.cy,R*1.28);gl.addColorStop(0,'rgba(98,208,234,.28)');gl.addColorStop(1,'rgba(98,208,234,0)');ctx.fillStyle=gl;ctx.beginPath();ctx.ellipse(o.cx,o.cy,R*1.28*sx,R*1.28*sy,0,0,TAU);ctx.fill();
    ctx.drawImage(buf,o.cx-R*sx,o.cy-R*sy,S*sx,S*sy);ctx.restore()}
  /* projeção ortográfica direta, coerente com globe() */
  function proj(o){const l0=(o.lat0||0)*D,L0=(o.lon0||0)*D,cl=Math.cos(l0),sl=Math.sin(l0),R=o.R,sx=o.sx??1,sy=o.sy??1;
    return (lat,lon,h=1)=>{const la=lat*D,d=lon*D-L0,X=Math.cos(la)*Math.sin(d),Y=Math.sin(la),Z=Math.cos(la)*Math.cos(d),y=Y*cl-Z*sl,z=Y*sl+Z*cl;return [o.cx+X*R*h*sx,o.cy-y*R*h*sy,z>0,z]}}
  const GEOD=typeof __GEO__!=='undefined'?__GEO__:[];
  const country=iso=>GEOD.find(c=>c.iso===iso);
  function borders(ctx,o,s={}){const P=proj(o);ctx.save();ctx.globalAlpha*=s.a??1;ctx.lineJoin='round';ctx.lineCap='round';
    const hi=s.hi;
    for(const c of GEOD){const isH=hi&&c.iso===hi.iso;if(isH&&hi.fill){ctx.fillStyle=hi.fill;for(const r of c.r){ctx.beginPath();let n=0;for(const [lo,la] of r){const q=P(la,lo);if(!q[2])continue;n++?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1])}ctx.closePath();ctx.fill()}}
      ctx.strokeStyle=isH?(hi.color||C.gold):(s.color||'rgba(236,230,214,.55)');ctx.lineWidth=isH?(hi.lw||3):(s.lw||1.1);ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=isH?14:(s.glow||0);
      ctx.beginPath();for(const r of c.r){let pen=false;for(const [lo,la] of r){const q=P(la,lo);if(q[2]){pen?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]);pen=true}else pen=false}}ctx.stroke()}
    ctx.restore()}
  /* círculo de raio angular d (graus) em volta de (lat,lon): frentes de onda, áreas */
  function circle(ctx,o,lat,lon,d,s={}){const P=proj(o),c=[Math.cos(lat*D)*Math.cos(lon*D),Math.cos(lat*D)*Math.sin(lon*D),Math.sin(lat*D)],u=Math.abs(c[2])<.9?[0,0,1]:[1,0,0];
    const cr=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],nr=a=>{const l=Math.hypot(...a);return a.map(v=>v/l)},e1=nr(cr(c,u)),e2=cr(c,e1),dd=d*D;
    ctx.save();ctx.globalAlpha*=s.a??1;ctx.strokeStyle=s.color||C.gold;ctx.lineWidth=s.lw||3;ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=s.glow??12;ctx.beginPath();let pen=false;
    for(let k=0;k<=128;k++){const q=k/128*TAU,p=[0,1,2].map(i=>c[i]*Math.cos(dd)+(e1[i]*Math.cos(q)+e2[i]*Math.sin(q))*Math.sin(dd)),la=Math.asin(p[2])/D,lo=Math.atan2(p[1],p[0])/D,r=P(la,lo,1.004);
      if(r[2]){pen?ctx.lineTo(r[0],r[1]):ctx.moveTo(r[0],r[1]);pen=true}else pen=false}ctx.stroke();ctx.restore()}
  function label(ctx,o,lat,lon,text,s={}){const q=proj(o)(lat,lon);if(!q[2])return null;txt(ctx,text,q[0]+(s.dx||0),q[1]+(s.dy||0),{font:F.mono,size:24,color:C.chalk,align:'left',...s});return q}
  function dot(ctx,o,lat,lon,s={}){const q=proj(o)(lat,lon,1.003);if(!q[2])return null;ctx.save();ctx.globalAlpha*=s.a??1;ctx.fillStyle=s.color||C.gold;ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=s.glow??16;ctx.beginPath();ctx.arc(q[0],q[1],s.r||7,0,TAU);ctx.fill();ctx.restore();return q}
  /* mapa plano (equirretangular) recortado */
  function flat(ctx,box,s={}){const T=pix('geo:terra.jpg');if(!T)return;const [x,y,w,h]=box,lo=s.lon||[-180,180],la=s.lat||[-90,90];
    const sx=(lo[0]+180)/360*T.w,sw=(lo[1]-lo[0])/360*T.w,sy=(90-la[1])/180*T.h,sh=(la[1]-la[0])/180*T.h;ctx.save();ctx.globalAlpha*=s.a??1;ctx.drawImage(T.c,sx,sy,sw,sh,x,y,w,h);
    if(s.dim)ctx.fillStyle=`rgba(7,9,15,${s.dim})`,ctx.fillRect(x,y,w,h);
    const P=(LA,LO)=>[x+(LO-lo[0])/(lo[1]-lo[0])*w,y+(la[1]-LA)/(la[1]-la[0])*h];
    if(s.borders!==false){ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();for(const c of GEOD){const isH=s.hi&&c.iso===s.hi.iso;ctx.strokeStyle=isH?(s.hi.color||C.gold):'rgba(236,230,214,.5)';ctx.lineWidth=isH?3:1;ctx.beginPath();
      for(const r of c.r){r.forEach(([LO,LA],k)=>{const p=P(LA,LO);k?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])})}ctx.stroke()}}
    ctx.restore();return P}
  /* ---------- vista de cima à noite em qualquer escala (do país até um bairro) ----------
     EARTH.night(ctx,{lat0,lon0,mpp,cx,cy,a,glow})  mpp = metros por pixel. Fundo: textura de luzes noturnas (NASA) ampliada e suavizada;
     por cima, luzes de rua procedurais em várias escalas, com densidade tirada da própria textura (onde a cidade é clara, há mais luz).
     EARTH.toXY(o)(lat,lon) -> [x,y] na mesma vista (para desenhar quadrados, cotas, rótulos). */
  const toXY=o=>(lat,lon)=>[(o.cx??W/2)+(lon-o.lon0)*Math.cos(o.lat0*D)*111320/o.mpp,(o.cy??H/2)-(lat-o.lat0)*110540/o.mpp];
  function lumAt(N,lat,lon){const u=((lon+180)/360)*N.w,v=((90-lat)/180)*N.h,x=Math.floor(u),y=Math.floor(v),fx=u-x,fy=v-y,g=(i,j)=>{const ii=((i%N.w)+N.w)%N.w,jj=Math.max(0,Math.min(N.h-1,j)),k=(jj*N.w+ii)*4;return (N.d[k]+N.d[k+1]+N.d[k+2])/765};
    return g(x,y)*(1-fx)*(1-fy)+g(x+1,y)*fx*(1-fy)+g(x,y+1)*(1-fx)*fy+g(x+1,y+1)*fx*fy}
  function night(ctx,o){const N=pix('geo:noite.jpg');if(!N)return;const a=o.a??1,mpp=o.mpp,cx=o.cx??W/2,cy=o.cy??H/2,kx=Math.cos(o.lat0*D)*111320,ky=110540;if(a<=0)return;
    const lon0=o.lon0-cx*mpp/kx,lon1=o.lon0+(W-cx)*mpp/kx,lat1=o.lat0+cy*mpp/ky,lat0=o.lat0-(H-cy)*mpp/ky;
    ctx.save();ctx.globalAlpha*=a;ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    const sx=(lon0+180)/360*N.w,sw=(lon1-lon0)/360*N.w,sy=(90-lat1)/180*N.h,sh=(lat1-lat0)/180*N.h;
    if(sw>1.5){ctx.save();ctx.globalAlpha*=lerp(.3,1,clamp((sw-25)/120));ctx.filter=sw<120?`blur(${Math.round(lerp(14,0,clamp(sw/120)))}px)`:'none';ctx.drawImage(N.c,sx,sy,sw,sh,0,0,W,H);ctx.restore()}else{const L=lumAt(N,o.lat0,o.lon0);ctx.fillStyle=`rgba(${Math.round(250*L)},${Math.round(190*L)},${Math.round(110*L)},.9)`;ctx.fillRect(0,0,W,H)}
    ctx.fillStyle='rgba(6,9,18,.35)';ctx.fillRect(0,0,W,H);
    ctx.globalCompositeOperation='lighter';
    for(const L of [8000,2000,500,120,30]){const px=L/mpp/6;if(px<1.2||px>260)continue;const fade=clamp((px-1.2)/2.5)*clamp((260-px)/120),
        X0=Math.floor(((lon0-o.lon0)*kx)/L)-1,X1=Math.ceil(((lon1-o.lon0)*kx)/L)+1,Y0=Math.floor(((lat0-o.lat0)*ky)/L)-1,Y1=Math.ceil(((lat1-o.lat0)*ky)/L)+1;
      if((X1-X0)*(Y1-Y0)>9000)continue;
      for(let I=X0;I<=X1;I++)for(let J=Y0;J<=Y1;J++){const lonC=o.lon0+((I+.5)*L)/kx,latC=o.lat0+((J+.5)*L)/ky,m=lumAt(N,latC,lonC);if(m<.06)continue;const R=FX.rng(((I*73856093)^(J*19349663)^L)>>>0);
        const n=Math.round(34*m*m+R()*2);for(let k=0;k<n;k++){const wx=(I+R())*L,wy=(J+R())*L,x=cx+wx/mpp,y=cy-wy/mpp;const b=.35+R()*.65,warm=R();if(x<-4||x>W+4||y<-4||y>H+4)continue;
          ctx.fillStyle=warm>.25?`rgba(255,${190+Math.round(40*R())},120,${.85*b*fade})`:`rgba(200,225,255,${.75*b*fade})`;const z=Math.max(1.4,Math.min(4,px*.08))*(o.glow??1);ctx.fillRect(x-z/2,y-z/2,z,z)}}}
    ctx.restore()}
  return {globe,proj,borders,circle,label,dot,flat,country,night,toXY};
})();
