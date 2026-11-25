/* ---------- MARE: Lua gigante, maré, praia de Copacabana à noite, Terra deformada e choque entre planetas ----------
   Exemplo: projetos/lua-gigante/ ("E se a Lua crescesse até ficar, para a Terra, do tamanho que a Terra é para ela?").
   MARE.sim  física da queda (Kepler radial, contas iguais a projetos/lua-gigante/contas.py): MARE.sim.at(horas) ->
             {d (km, centro a centro), v (km/s), ang (diâmetro da Lua no céu, graus), tide (força de maré × hoje), roche (0..1)}
   MARE.beach(ctx,o)  praia de Copacabana à noite vista do chão (céu, mar e areia calculados por pixel; prédios da Av. Atlântica,
             postes, coqueiros, Leme e Pão de Açúcar). o: {t, cam:{yaw,pitch,fov,x,y,z}, moon:{R (km), el, az}, level (m, maré),
             red (0..1, céu de vulcão), quake (0..1)}. Mundo em metros: x à direita, y para cima, z para o mar (para a frente).
   MARE.groundCam(o)  câmera do W3D a partir de {x,y,z,yaw,pitch,fov} (yaw em graus, 0 = +z, positivo para a direita). */
const MARE=(()=>{
  const D2R=Math.PI/180,sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k],
    dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],nrm=a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return [a[0]/l,a[1]/l,a[2]/l]},crs=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const ss=(a,b,x)=>{const u=clamp((x-a)/(b-a));return u*u*(3-2*u)};

  /* ---------- física: Lua com 3,67 raios terrestres e a mesma densidade (29,9 Terras), mesma distância e velocidade de hoje ---------- */
  const sim=(()=>{const G=6.674e-11,Me=5.972e24,Re=6371,Rm0=1737.4,d0=384400,v0=1.022,k=Re/Rm0,Rm=Re*k,Mm=7.342e22*Math.pow(Rm/Rm0,3),mu=G*(Me+Mm)/1e9;  /* km³/s² */
    const a=1/(2/d0-v0*v0/mu),e=d0/a-1,P=2*Math.PI*Math.sqrt(a*a*a/mu);
    const rAt=s=>{const M=Math.PI+2*Math.PI*s/P;let E=M;for(let i=0;i<40;i++)E-=(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));return a*(1-e*Math.cos(E))};
    let lo=0,hi=P/2;for(let i=0;i<60;i++){const m=(lo+hi)/2;rAt(m)>Rm+Re?lo=m:hi=m}const tC=lo/3600;
    const rocheD=2.44*Rm*Math.pow(3344/5514,1/3);
    function at(h){const d=Math.max(Rm+Re,rAt(Math.min(h,tC)*3600)),v=Math.sqrt(mu*(2/d-1/a));
      return {h,d,v,ang:2*Math.atan(Rm/(d-Re))/D2R,tide:(Mm/7.342e22)*Math.pow(d0/d,3),roche:clamp((rocheD-d)/(rocheD-(Rm+Re)))}}
    /* posição relativa (Terra em volta da Lua, no plano da órbita): começa no apoastro (0, d0) e cai pela elipse fina; x para o lado do movimento */
    const b=a*Math.sqrt(1-e*e);function rel(h){const s=Math.min(h,tC)*3600,M=Math.PI+2*Math.PI*s/P;let E=M;for(let i=0;i<40;i++)E-=(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));return [-b*Math.sin(E),-a*(Math.cos(E)-e)]}
    return {at,rel,b,tContact:tC,Rm,Re,Rm0,d0,v0,vCirc:Math.sqrt(mu/d0),massE:Mm/Me,rocheD,a,e,P:P/3600}})();

  /* o W3D é destro (olhando para +z, a direita da tela é −x); aqui x cresce para a direita: espelha x na entrada e na saída */
  const toW=p=>[-p[0],p[1],p[2]];
  function groundCam(o){const y=(o.yaw||0)*D2R,p=(o.pitch||0)*D2R,eye=toW([o.x||0,o.y??3,o.z||0]),f=[-Math.sin(y)*Math.cos(p),Math.sin(p),Math.cos(y)*Math.cos(p)];
    const c=COS.lookCam(eye,add(eye,mul(f,100)),{fov:(o.fov??58)*D2R,cx:o.cx,cy:o.cy});c.Pm=q=>c.P(toW(q));c.eyeM=toW(c.eye);return c}

  /* ---------- a cidade: linha da praia, avenida, prédios, postes, coqueiros, morros ---------- */
  const shoreX=z=>25-3.7e-5*z*z;                 /* linha d'água (maré zero): o arco de Copacabana curva para a esquerda rumo ao Leme */
  const avenueX=z=>shoreX(z)-92;
  function ground(x,z){const s=shoreX(z)-x;       /* > 0: em terra */
    if(s<0)return s*.022;                          /* fundo do mar */
    if(s<92)return s*.034;                         /* areia subindo até o calçadão */
    return 3.2+(s-92)*.006}                        /* cidade subindo devagar */
  let CITY=null;
  function city(){if(CITY)return CITY;const R=FX.rng(77),B=[],L=[],Pm=[];
    for(let z=-60;z<3900;){const w=16+R()*22,h=z>3500?18+R()*20:24+R()*30+(R()<.15?18:0),d=18+R()*10,x0=avenueX(z+w/2)-24,col=[.5+R()*.5,.45+R()*.4];
      const win=[];const nf=Math.max(3,Math.floor(h/3.1)),nc=Math.max(2,Math.floor(w/3.4));for(let f=1;f<nf;f++)for(let c=0;c<nc;c++){const r=R();if(r<.42)win.push([f/nf,(c+.5)/nc,r<.08?2:r<.3?1:0,R()])}
      B.push({x:x0,z,w,h,d,col,win,nf,nc,tone:R()});z+=w+2+R()*6}
    for(let z=-40;z<3700;z+=34)L.push([avenueX(z)+3,8.5,z]);
    for(let z=20;z<3400;z+=46+R()*30)Pm.push({x:avenueX(z)+12+R()*8,z,h:9+R()*5,lean:(R()-.5)*.25,seed:R()*99});
    return CITY={B,L,Pm}}
  /* morros (perfil em metros): Leme no fim da praia e o Pão de Açúcar com o Morro da Urca atrás */
  const HILLS=[{x0:-1150,x1:-330,z:4150,pts:[[0,0],[.08,30],[.2,62],[.34,88],[.5,104],[.62,96],[.75,70],[.88,34],[1,0]],col:[.016,.022,.03]},
    {x0:-1500,x1:-900,z:7700,pts:[[0,0],[.1,60],[.22,150],[.3,205],[.38,222],[.46,210],[.52,150],[.56,128]],col:[.02,.028,.04]},
    {x0:-950,x1:-560,z:7300,pts:[[0,0],[.12,120],[.22,280],[.32,360],[.44,393],[.56,396],[.68,370],[.8,280],[.9,150],[1,0]],col:[.022,.03,.045]}];

  /* ---------- céu ---------- */
  /* v: direção (normalizada); S: estado do quadro (lua, brilho, vermelho). Devolve rgb linear. */
  function skyCol(v,S){const el=Math.max(-.02,v[1]),az=Math.atan2(v[0],v[2]),k=S.lit,h=Math.exp(-Math.max(0,el)/.18),hz=Math.exp(-Math.max(0,el)/.05);
    let r=lerp(.010,.045,k)+lerp(.022,.17,k)*h,g=lerp(.016,.10,k)+lerp(.032,.24,k)*h,b=lerp(.042,.26,k)+lerp(.07,.36,k)*h;
    /* brilho laranja da cidade no horizonte do lado esquerdo (Leme, Centro) */
    const cw=Math.exp(-Math.pow((az+.42)/.42,2))*hz*(1-k*.5);r+=.11*cw;g+=.065*cw;b+=.03*cw;
    /* auréola da Lua */
    const m=dot(v,S.M),an=Math.acos(clamp(m,-1,1));const au=S.halo*(.35*Math.exp(-(an-S.rm)/.045)*(an>S.rm?1:1)+.07*Math.exp(-an/.4));r+=au*.86;g+=au*.92;b+=au;
    if(S.red>0){const rr=S.red,hh=Math.exp(-Math.max(0,el)/.3);r+=rr*(.25*hh+.04);g+=rr*(.06*hh+.008);b+=rr*.01}
    return [r,g,b]}

  /* ---------- o quadro: céu + mar + areia por pixel (meia resolução), depois a cidade em vetor ---------- */
  let BUF=null,BX=null,STARS=null;
  function beach(ctx,o){const t=o.t||0,cam=o.cam&&o.cam.Pm?o.cam:groundCam(o.cam||{}),L=o.level||0,eye=cam.eyeM,f=cam.f,cx=W/2,cy=H/2;
    const mo=o.moon||{},Rk=mo.R??1737,dist=mo.d??384400,rm=Math.atan(Rk/(dist-6371)),el=(mo.el??22)*D2R,az=(mo.az??8)*D2R,M=[Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el)];
    const area=Math.pow(Math.min(Rk/1737,40),2),lit=clamp(Math.log(area)/Math.log(181))*.5,halo=.12+.5*lit,moonRad=2.6;
    const S={M,rm,lit:ss(0,1,lit)*.9,halo,red:o.red||0};
    const SW=W>>1,SH=H>>1;if(!BUF){BUF=document.createElement('canvas');BUF.width=SW;BUF.height=SH;BX=BUF.getContext('2d')}
    const img=BX.createImageData(SW,SH),d=img.data,rt=cam.rt,up=cam.up,fw=cam.fw,ex=o.exposure??2.4;
    const moonIll=.32+.68*lit/.5,Mi=moonIll*Math.max(.15,M[1]+.25);  /* iluminação da Lua no chão */
    const warm=[1,.62,.32];
    /* ondas: direção para a praia (−x), comprimentos de 3 a 60 m */
    const WV=[[60,.9,.18,.55],[34,.55,-.12,.8],[17,.32,.35,.9],[9,.16,-.4,1.3],[5,.08,.7,1.7],[3.1,.045,-.9,2.3],[2.2,.03,.2,2.9]].map(([lam,a,ang,sp])=>{const k=2*Math.PI/lam,dx=-Math.cos(ang),dz=Math.sin(ang);return {kx:k*dx,kz:k*dz,a,w:Math.sqrt(9.8*k)*sp*.6,k}});
    const Tw=8.5,lamS=26;
    for(let py=0;py<SH;py++){const Y=(py+.5)*2;for(let px=0;px<SW;px++){const X=(px+.5)*2,ux=(X-cx)/f,uy=(cy-Y)/f;
      let dir=nrm([-(fw[0]+ux*rt[0]+uy*up[0]),fw[1]+ux*rt[1]+uy*up[1],fw[2]+ux*rt[2]+uy*up[2]]);let c;
      if(dir[1]>=-.0004){c=skyCol(dir,S)}
      else{let tt=(L-eye[1])/dir[1],Px=eye[0]+dir[0]*tt,Pz=eye[2]+dir[2]*tt,g=ground(Px,Pz),isW=g<L;
        if(!isW){tt=(g-eye[1])/dir[1];Px=eye[0]+dir[0]*tt;Pz=eye[2]+dir[2]*tt;g=ground(Px,Pz);tt=(g-eye[1])/dir[1];Px=eye[0]+dir[0]*tt;Pz=eye[2]+dir[2]*tt}
        const dd=tt,foot=dd*2/f/Math.max(.02,-dir[1]),sh=shoreX(Pz),del=Px-sh+L/.022*0;  /* metros mar adentro a partir da linha d'água */
        /* espraiado: a lâmina de água sobe e desce na areia */
        const ph=t/Tw+Pz*.0021,swash=L>.5?0:7*Math.pow(Math.max(0,Math.sin(ph*2*Math.PI)),1.5)+1.2*FX.noise(Pz*.05,t*.3);
        const wl=L>.5?(L/.022):0,front=-(swash)+(-wl);  /* fronte d'água em coordenada 'del' (negativo = terra adentro) */
        if(isW||del>front&&L<=.5){
          /* água: normal pelas ondas (as curtas somem com a distância), reflexo com Fresnel, brilho da Lua */
          let hx=0,hz=0;for(const q of WV){const att=1/(1+Math.pow(foot*q.k*.35,2));if(att<.02)continue;const s=q.kx*Px+q.kz*Pz-q.w*t;const cc=Math.cos(s)*q.a*att;hx+=cc*q.kx;hz+=cc*q.kz}
          const shallow=clamp((del-front)/3);hx*=.6+.4*shallow;hz*=.6+.4*shallow;
          /* marola fina (inclinações de ~0,15 rad, como no mar de verdade): é ela que faz o rastro de brilho da Lua */
          const at2=1/(1+foot*foot*.25),nq=.22*at2,ra=FX.noise(Px*.55,Pz*.55,t*.7)+.5*FX.noise(Px*1.7,Pz*1.7,t*1.3),rb=FX.noise(Px*.55+37,Pz*.55,t*.7)+.5*FX.noise(Px*1.7+11,Pz*1.7,t*1.3);
          hx+=ra*nq*(1+foot*.3);hz+=rb*nq*(1+foot*.3);
          const n=nrm([-hx,1,-hz]),cs=Math.max(0,-dot(dir,n)),F=.02+.98*Math.pow(1-cs,5),R=[dir[0]+2*cs*n[0],dir[1]+2*cs*n[1],dir[2]+2*cs*n[2]];
          let rc=skyCol(R[1]<0?[R[0],.001,R[2]]:R,S);const mr=dot(R,M),glint=mr>Math.cos(rm*1.05)?moonRad:moonRad*.4*Math.exp(-(Math.acos(clamp(mr,-1,1))-rm)/(.008+rm*.06));
          rc=[rc[0]+glint*.95,rc[1]+glint*.93,rc[2]+glint*.86];
          c=[.003+F*rc[0],.010+F*rc[1],.016+F*rc[2]];
          /* espuma: arrebentação (cristas indo para a praia) + rendas entre as ondas + borda do espraiado */
          if(L<=.5){const z2=del-front;if(z2<230){const u=((z2/lamS+t/Tw+Pz*.0021+.37)%1+1)%1,brk=ss(78,38,z2),
              n1=FX.noise(Px*.35,Pz*.35,t*.4)+.5*FX.noise(Px*1.3,Pz*1.3,t*.7)+(foot<.4?.25*FX.noise(Px*4,Pz*4,t):0);
            /* crista que arrebenta (linha forte), espuma que fica para trás rendada e furando, marola antes da arrebentação, borda do espraiado */
            const crest=ss(0,.008,u)*ss(.13,.05,u),trail=ss(.62,.1,u);
            let fo=brk*(crest*clamp(.85+n1*.9)+trail*.6*ss(.38+u*1.6,.46+u*1.6,n1+.6));
            fo+=ss(230,95,z2)*(1-brk)*ss(0,.006,u)*ss(.05,.015,u)*.4*clamp(.6+n1);
            fo+=ss(.5,0,z2)*.7*clamp(.6+n1*1.4);
            fo=clamp(fo);const fl=.75*Mi+.06;c=[lerp(c[0],fl*.94,fo),lerp(c[1],fl*.97,fo),lerp(c[2],fl,fo)]}
            if(z2<10){const sh2=1-ss(0,10,z2);c=[lerp(c[0],c[0]*.6+.02*Mi,sh2*.3),lerp(c[1],c[1]*.6+.02*Mi,sh2*.3),lerp(c[2],c[2]*.6+.02*Mi,sh2*.3)]}}
        }else{
          /* areia: seca (clara, grão) e molhada (escura, espelha o céu); luz quente dos postes perto do calçadão */
          const land=sh-Px,grain=FX.noise(Px*2.3,Pz*2.3)*(1/(1+foot*.8))*.6+FX.noise(Px*11,Pz*11)*(1/(1+foot*4))*.8+.25*Math.sin(Px*5+FX.noise(Px*.5,Pz*.5)*6)*(1/(1+foot*3)),wet=ss(14,0,del<0?-del+front*0:0)*(L>.5?0:1);
          const wetK=L>.5?0:ss(12,0,-(del-front));
          let ar=.56,ag=.5,ab=.41;ar*=1+grain*.25;ag*=1+grain*.25;ab*=1+grain*.22;
          const lampK=land<130?.55*Math.exp(-Math.max(0,92-land)/18)*(.8+.2*Math.sin(Pz*.18)):(land<200?.3:0);
          const light=[Mi*.55+.012+lampK*warm[0],Mi*.57+.014+lampK*warm[1],Mi*.62+.02+lampK*warm[2]];
          c=[ar*light[0],ag*light[1],ab*light[2]];
          if(land>92&&land<104){/* calçadão de ondas pretas e brancas */const sv=Math.sin((Pz*.42+Math.sin((land-92)*.55)*1.6)),k2=sv>0?1.25:.35;c=[c[0]*k2,c[1]*k2,c[2]*k2]}
          if(land>104){c=[c[0]*.35,c[1]*.35,c[2]*.38]}  /* asfalto */
          if(wetK>0){const n=[0,1,0],cs=-dir[1],F=.05+.95*Math.pow(1-cs,5),R=[dir[0],-dir[1],dir[2]];let rc=skyCol(R,S);const mr=dot(R,M),gl=moonRad*.35*Math.exp(-Math.max(0,Math.acos(clamp(mr,-1,1))-rm)/.06)*(.6+.4*FX.noise(Px*3,Pz*3));
            const F2=F*.75;c=[lerp(c[0]*.55,rc[0]+gl,F2)*wetK+c[0]*(1-wetK),lerp(c[1]*.55,rc[1]+gl,F2)*wetK+c[1]*(1-wetK),lerp(c[2]*.55,rc[2]+gl*.95,F2)*wetK+c[2]*(1-wetK)]}}
        /* bruma na distância */
        const hz=1-Math.exp(-dd/9000),hc=skyCol([dir[0],.004,dir[2]],S);c=[lerp(c[0],hc[0],hz),lerp(c[1],hc[1],hz),lerp(c[2],hc[2],hz)]}
      const i=(py*SW+px)*4;d[i]=255*(1-Math.exp(-c[0]*ex));d[i+1]=255*(1-Math.exp(-c[1]*ex));d[i+2]=255*(1-Math.exp(-c[2]*ex));d[i+3]=255}}
    BX.putImageData(img,0,0);ctx.save();ctx.imageSmoothingQuality='high';ctx.drawImage(BUF,0,0,W,H);ctx.restore();
    const P=cam.Pm;
    /* estrelas (somem quando a Lua clareia o céu) */
    if(!STARS){const R=FX.rng(9);STARS=[...Array(1400)].map(()=>{const zz=R()*2-1,a=R()*TAU,r=Math.sqrt(1-zz*zz);return {v:[r*Math.cos(a),Math.abs(zz),r*Math.sin(a)],m:Math.pow(R(),6),tw:R()*TAU,c:R()}})}
    const sa=1-ss(.05,.7,S.lit);if(sa>0){ctx.save();for(const s of STARS){if(s.v[1]<.03)continue;const q=P(add(eye,mul(s.v,1e5)));if(!isFinite(q[0])||q[0]<0||q[0]>W||q[1]<0||q[1]>H)continue;
      const a=sa*(.25+.75*s.m)*(.75+.25*Math.sin(t*3+s.tw))*clamp((s.v[1]-.03)/.08);ctx.globalAlpha=a;ctx.fillStyle=s.c<.15?'#ffd9b8':s.c<.3?'#cfe0ff':'#f4f6ff';ctx.beginPath();ctx.arc(q[0],q[1],.7+s.m*1.8,0,TAU);ctx.fill()}ctx.restore()}
    /* a Lua (mapa real), cheia: Sol atrás da câmera */
    const MD=3.844e8,mp=add(eye,mul(M,MD)),mR=Math.tan(rm)*MD;
    const qm=P(mp);if(isFinite(qm[0])){const Rp=f*mR/qm[2];ctx.save();ctx.globalCompositeOperation='lighter';for(const [k,al] of [[1.35,.32],[2.2,.16],[4.2,.07]]){const gr=ctx.createRadialGradient(qm[0],qm[1],Rp*.9,qm[0],qm[1],Rp*k+30);gr.addColorStop(0,`rgba(225,235,255,${al*(.6+lit*.5)})`);gr.addColorStop(1,'rgba(225,235,255,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(qm[0],qm[1],Rp*k+30,0,TAU);ctx.fill()}ctx.restore();
      const sun=toW(add(eye,add(mul(M,-1.5e11),[0,4e10,0])));PL.moon(ctx,cam,toW(mp),mR,{sun,spin:Math.PI,amb:.06,rim:.05,maxR:900,clip:true,dim:1.08})}
    drawCity(ctx,cam,o,S,Mi,L)}

  /* ---------- prédios, postes, coqueiros e morros, do fundo para a frente ---------- */
  function drawCity(ctx,cam,o,S,Mi,L){const P=cam.Pm,eye=cam.eyeM,t=o.t||0,C0=city(),hz=d=>1-Math.exp(-d/9000);
    const fog=(c,dd)=>{const h=hz(dd);return [lerp(c[0],.05+.12*S.lit,h),lerp(c[1],.07+.17*S.lit,h),lerp(c[2],.12+.26*S.lit,h)]};
    const rgb=(c,a=1)=>`rgba(${Math.round(255*(1-Math.exp(-c[0]*2.4)))},${Math.round(255*(1-Math.exp(-c[1]*2.4)))},${Math.round(255*(1-Math.exp(-c[2]*2.4)))},${a})`;
    /* morros */
    for(const hl of HILLS){const pts=[];for(const [u,h] of hl.pts){const x=lerp(hl.x0,hl.x1,u),y=Math.max(L,h);pts.push(P([x,y,hl.z+u*120]))}
      if(Math.max(...hl.pts.map(p=>p[1]))<L)continue;pts.push(P([hl.x1,L-2,hl.z]),P([hl.x0,L-2,hl.z]));if(pts.some(q=>!isFinite(q[0])))continue;
      const dd=Math.hypot(hl.x0-eye[0],hl.z-eye[2]),c=fog([hl.col[0]+Mi*.04,hl.col[1]+Mi*.05,hl.col[2]+Mi*.07],dd*.6);ctx.fillStyle=rgb(c);ctx.beginPath();pts.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.closePath();ctx.fill();
      /* borda clara do lado da Lua */ctx.save();ctx.strokeStyle=rgb([.05+.1*S.lit,.07+.12*S.lit,.1+.16*S.lit],.6);ctx.lineWidth=1.2;ctx.beginPath();pts.slice(0,hl.pts.length).forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.stroke();ctx.restore()}
    /* bondinho do Pão de Açúcar: duas luzinhas no cabo */
    {const a=P([-1030,205,7650]),b=P([-790,390,7360]);if(isFinite(a[0])&&isFinite(b[0])){ctx.save();ctx.strokeStyle='rgba(120,130,150,.25)';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();
      const u=(t*.04)%1;ctx.fillStyle='rgba(255,230,180,.9)';ctx.beginPath();ctx.arc(lerp(a[0],b[0],u),lerp(a[1],b[1],u),1.6,0,TAU);ctx.fill();ctx.restore()}}
    /* prédios, do fundo para a frente */
    const B=C0.B.slice().sort((p,q)=>(q.z-eye[2])-(p.z-eye[2]));
    for(const b of B){const dz=b.z-eye[2];if(dz<-30)continue;const y0=Math.max(L,ground(b.x+b.d,b.z)),y1=y0===L?Math.max(L,3.5+b.h):3.5+b.h;if(y1<=L+.5)continue;
      const xf=b.x,xb=b.x-b.d,z0=b.z,z1=b.z+b.w;
      const fA=[[xf,y0,z0],[xf,y0,z1],[xf,y1,z1],[xf,y1,z0]].map(P);if(fA.some(q=>!isFinite(q[0])))continue;
      const dd=Math.hypot(xf-eye[0],z0-eye[2]),ab=o.blackout?clamp(o.blackout(dd,b)):1;
      const base=[.03+b.tone*.03+Mi*.07,.035+b.tone*.03+Mi*.08,.05+b.tone*.03+Mi*.1];
      /* lateral (de frente para a câmera quando visível) */
      const sA=[[xf,y0,z0],[xb,y0,z0],[xb,y1,z0],[xf,y1,z0]].map(P);
      if(sA.every(q=>isFinite(q[0]))&&eye[2]<z0){ctx.fillStyle=rgb(fog(mul(base,.55),dd));ctx.beginPath();sA.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.closePath();ctx.fill()}
      ctx.fillStyle=rgb(fog(base,dd));ctx.beginPath();fA.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.closePath();ctx.fill();
      /* topo com luz de aviso vermelha nos mais altos */
      if(b.h>48){const q=P([xf-b.d/2,y1+1.5,z0+b.w/2]);if(isFinite(q[0])&&Math.sin(t*3+b.tone*9)>0){ctx.save();ctx.globalCompositeOperation='lighter';ctx.fillStyle='rgba(255,60,40,.9)';ctx.beginPath();ctx.arc(q[0],q[1],1.4,0,TAU);ctx.fill();ctx.restore()}}
      /* janelas: grade na fachada, acesas em amarelo, branco frio ou azul de TV */
      const wpx=Math.abs(fA[1][0]-fA[0][0]),hpx=Math.abs(fA[3][1]-fA[0][1]);if(hpx<2)continue;const wa=(1-hz(dd)*.8)*ab;
      ctx.save();ctx.globalCompositeOperation='lighter';
      const bl=(u,v)=>{const a=lerp(fA[0][0],fA[1][0],u),b2=lerp(fA[3][0],fA[2][0],u),ay=lerp(fA[0][1],fA[1][1],u),by=lerp(fA[3][1],fA[2][1],u);return [lerp(a,b2,v),lerp(ay,by,v)]};
      const ww=Math.max(.8,wpx/b.nc*.5),wh=Math.max(.8,hpx/b.nf*.42);
      for(const [fv,cu,kind,r] of b.win){const yv=(y0===L?(3.5+b.h*fv-y0)/(y1-y0):fv);if(yv<=0||yv>=1)continue;if(o.flicker&&o.flicker(r,t))continue;const q=bl(cu,yv);
        ctx.fillStyle=kind===2?`rgba(140,180,255,${.55*wa*(.8+.2*Math.sin(t*7+r*40))})`:kind===1?`rgba(255,250,235,${.6*wa})`:`rgba(255,196,110,${.75*wa})`;ctx.fillRect(q[0]-ww/2,q[1]-wh/2,ww,wh)}
      ctx.restore()}
    /* postes: brilho quente e reflexo na areia molhada */
    ctx.save();ctx.globalCompositeOperation='lighter';for(const lp of C0.L){if(L>lp[1])continue;const q=P(lp);if(!isFinite(q[0])||q[0]<-40||q[0]>W+40)continue;const dd=Math.hypot(lp[0]-eye[0],lp[2]-eye[2]),r=Math.max(1.2,f2(cam)*1.2/q[2]);
      const gr=ctx.createRadialGradient(q[0],q[1],0,q[0],q[1],r*9);gr.addColorStop(0,`rgba(255,214,150,${.85*(1-hz(dd)*.7)})`);gr.addColorStop(.25,`rgba(255,170,90,${.25*(1-hz(dd))})`);gr.addColorStop(1,'rgba(255,150,80,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(q[0],q[1],r*9,0,TAU);ctx.fill()}ctx.restore();
    /* coqueiros: tronco curvo com anéis, folhas arqueadas com folíolos, borda clara do lado da Lua */
    for(const pm of C0.Pm.slice().sort((a,b)=>b.z-a.z)){const y0=ground(pm.x,pm.z);if(y0+pm.h<L)continue;const b0=P([pm.x,Math.max(y0,L),pm.z]),tp=[pm.x+pm.lean*pm.h,y0+pm.h,pm.z],b1=P(tp);if(!isFinite(b0[0])||!isFinite(b1[0]))continue;
      const sc=Math.abs(b1[1]-b0[1])/pm.h;if(sc*pm.h<2)continue;const dd=Math.hypot(pm.x-eye[0],pm.z-eye[2]),fa=1-hz(dd)*.7;ctx.save();ctx.globalAlpha*=fa;ctx.lineCap='round';
      const mx=b0[0]+sc*pm.lean*pm.h*.2,my=lerp(b0[1],b1[1],.55);ctx.strokeStyle='rgb(10,10,13)';ctx.lineWidth=Math.max(1,sc*.42);ctx.beginPath();ctx.moveTo(b0[0],b0[1]);ctx.quadraticCurveTo(mx,my,b1[0],b1[1]);ctx.stroke();
      const sway=Math.sin(t*1.1+pm.seed)*.06,n=11;
      for(let k=0;k<n;k++){const an=(k/n)*TAU+pm.seed,side=Math.cos(an),dep=Math.sin(an),len=sc*(4.2+.8*Math.sin(k*2.3+pm.seed))*(.75+.25*Math.abs(side)),
        rise=sc*(1.2+.6*dep),drop=len*(.55+.25*(1-Math.abs(side)));const ex=b1[0]+side*len+sway*len,ey=b1[1]+drop-rise*.2,cx2=b1[0]+side*len*.45,cy2=b1[1]-rise;
        ctx.strokeStyle='rgb(8,10,12)';ctx.lineWidth=Math.max(.8,sc*.16);ctx.beginPath();ctx.moveTo(b1[0],b1[1]);ctx.quadraticCurveTo(cx2,cy2,ex,ey);ctx.stroke();
        if(sc*len>14){ctx.lineWidth=Math.max(.6,sc*.07);const m=12;for(let j=1;j<m;j++){const u=j/m,qx=(1-u)*(1-u)*b1[0]+2*u*(1-u)*cx2+u*u*ex,qy=(1-u)*(1-u)*b1[1]+2*u*(1-u)*cy2+u*u*ey,tx=2*(1-u)*(cx2-b1[0])+2*u*(ex-cx2),ty=2*(1-u)*(cy2-b1[1])+2*u*(ey-cy2),tl=Math.hypot(tx,ty)||1,ll=len*.22*(1-u*.6);
          for(const sg of [-1,1]){ctx.beginPath();ctx.moveTo(qx,qy);ctx.lineTo(qx-ty/tl*ll*sg*.6+tx/tl*ll*.3,qy+tx/tl*ll*sg*.6+ty/tl*ll*.3+ll*.5);ctx.stroke()}}}}
      ctx.fillStyle='rgb(14,12,10)';ctx.beginPath();ctx.arc(b1[0],b1[1]+sc*.3,Math.max(1,sc*.5),0,TAU);ctx.fill();ctx.restore()}}
  const f2=c=>c.f;


  /* ================= ESPAÇO: Terra esticada pela maré, rachaduras de lava, oceano arrancado, choque ================= */
  /* MARE.earth(ctx,c,{pos,R,ax (direção da Lua),k (alongamento),sun (direção),spin,lava 0..1,heat 0..1,lights,a,cut:{n,d}})
     elipsoide calculado por pixel: mapa da NASA, luzes das cidades, rachaduras com lava (Worley 3D), borda de atmosfera.
     cut: plano (normal n, distância d do centro) além do qual a Terra já afundou; a face do corte fica incandescente. */
  let TEX=null;
  function tex(){if(TEX)return TEX;const g=k=>{const im=FX.IMG&&FX.IMG['geo:'+k+'.jpg'];if(!im)return null;const cv=document.createElement('canvas');cv.width=im.width;cv.height=im.height;const x=cv.getContext('2d');x.drawImage(im,0,0);return {w:im.width,h:im.height,d:x.getImageData(0,0,im.width,im.height).data}};
    const T=g('terra'),N=g('noite');if(!T)return null;return TEX={T,N}}
  const hsh=(i,j,k)=>{let h=(Math.imul(i,374761393)+Math.imul(j,668265263)+Math.imul(k,2147483647))|0;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296};
  /* F2−F1 do Voronoi 3D: perto de zero na borda entre células (as rachaduras) */
  function worley(x,y,z){const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);let f1=9,f2=9;
    for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)for(let c=-1;c<=1;c++){const X=ix+a,Y=iy+b,Z=iz+c,dx=X+hsh(X,Y,Z)-x,dy=Y+hsh(Y,Z,X+7)-y,dz=Z+hsh(Z,X,Y+13)-z,d=dx*dx+dy*dy+dz*dz;
      if(d<f1){f2=f1;f1=d}else if(d<f2)f2=d}return Math.sqrt(f2)-Math.sqrt(f1)}
  let EB=null,EX=null;
  function earth(ctx,c,o){const p=o.pos,R=o.R,q0=c.P(p);if(!isFinite(q0[0]))return null;const k=o.k||0,Rp=c.f*R/q0[2]*(1+k);if(Rp<1)return {q:q0,R:Rp};
    const TX=tex(),ax=nrm(o.ax||[1,0,0]),A=R*(1+k),B=R/Math.sqrt(1+k),sun=nrm(o.sun||[0,0,1]),spin=o.spin||0,lava=o.lava||0,heat=o.heat||0,cut=o.cut,al=o.a??1;
    const sc=o.res||(Rp>600?.5:Rp>250?.7:1),pad=Rp*1.15,x0=Math.max(0,Math.floor(q0[0]-pad)),x1=Math.min(W,Math.ceil(q0[0]+pad)),y0=Math.max(0,Math.floor(q0[1]-pad)),y1=Math.min(H,Math.ceil(q0[1]+pad));
    if(x1<=x0||y1<=y0)return {q:q0,R:Rp};const bw=Math.max(1,Math.ceil((x1-x0)*sc)),bh=Math.max(1,Math.ceil((y1-y0)*sc));
    if(!EB){EB=document.createElement('canvas');EX=EB.getContext('2d')}if(EB.width<bw||EB.height<bh){EB.width=Math.max(bw,EB.width);EB.height=Math.max(bh,EB.height)}
    const img=EX.createImageData(bw,bh),d=img.data,e=c.eye,rt=c.rt,up=c.up,fw=c.fw,ccx=W/2,ccy=H/2;
    const u1=nrm(Math.abs(ax[1])>.9?crs(ax,[1,0,0]):crs(ax,[0,1,0])),u2=crs(ax,u1);
    const toL=v=>[dot(v,ax)/A,dot(v,u1)/B,dot(v,u2)/B],fromL=h=>[h[0]*ax[0]+h[1]*u1[0]+h[2]*u2[0],h[0]*ax[1]+h[1]*u1[1]+h[2]*u2[1],h[0]*ax[2]+h[1]*u1[2]+h[2]*u2[2]];
    const oc=sub(e,p),ol=toL(oc),cs=Math.cos(spin),sn=Math.sin(spin),tt0=o.t||0;
    for(let j=0;j<bh;j++){const Y=y0+(j+.5)/sc;for(let i=0;i<bw;i++){const X=x0+(i+.5)/sc,ux=(X-ccx)/c.f,uy=(ccy-Y)/c.f;
      const dw=[fw[0]+ux*rt[0]+uy*up[0],fw[1]+ux*rt[1]+uy*up[1],fw[2]+ux*rt[2]+uy*up[2]],dl=toL(dw);
      const a2=dot(dl,dl),b2=2*dot(ol,dl),c2=dot(ol,ol)-1,disc=b2*b2-4*a2*c2,id=(j*bw+i)*4;
      if(disc<0){if(o.atm===0)continue;/* atmosfera: brilho fino fora da borda, só do lado do Sol (e vermelho quando a Terra esquenta) */
        const tm=-b2/(2*a2);if(tm<=0)continue;const cl=[ol[0]+dl[0]*tm,ol[1]+dl[1]*tm,ol[2]+dl[2]*tm],r=Math.sqrt(dot(cl,cl));if(r>1.05)continue;
        const g=Math.pow(1-(r-1)/.05,2.2),lt=clamp(dot(nrm(fromL([cl[0]*A,cl[1]*B,cl[2]*B])),sun)+.3);
        d[id]=110*g*lt+200*heat*g;d[id+1]=170*g*lt+70*heat*g;d[id+2]=255*g*lt+20*heat*g;d[id+3]=255*g*Math.min(1,lt+heat)*al;continue}
      const sq=Math.sqrt(disc),tt=(-b2-sq)/(2*a2);if(tt<0)continue;
      if(cut){const Pn=add(oc,mul(dw,tt));if(dot(Pn,cut.n)>cut.d){const t2=(-b2+sq)/(2*a2),tc=(cut.d-dot(oc,cut.n))/dot(dw,cut.n);
          if(tc>tt&&tc<t2){const Pc=add(oc,mul(dw,tc)),rr=clamp(Math.hypot(...sub(Pc,mul(cut.n,cut.d)))/R);d[id]=255;d[id+1]=230-150*rr;d[id+2]=170-150*rr;d[id+3]=255*al}continue}}
      const hl=[ol[0]+dl[0]*tt,ol[1]+dl[1]*tt,ol[2]+dl[2]*tt],nw=nrm(fromL([hl[0]/A,hl[1]/B,hl[2]/B])),sw=nrm(fromL(hl));
      const sx=sw[0]*cs-sw[2]*sn,sz=sw[0]*sn+sw[2]*cs,lat=Math.asin(clamp(sw[1],-1,1)),lon=Math.atan2(-sz,sx);
      let r=30,g=50,b=100,nr=0,ng=0,nb=0;if(TX){const T=TX.T,u=lon/(2*Math.PI)+.5,v=.5-lat/Math.PI,ti=(Math.min(T.h-1,v*T.h|0)*T.w+((u*T.w|0)%T.w))*4;r=T.d[ti];g=T.d[ti+1];b=T.d[ti+2];
        if(TX.N){const N=TX.N,ni=(Math.min(N.h-1,v*N.h|0)*N.w+((u*N.w|0)%N.w))*4;nr=N.d[ni];ng=N.d[ni+1];nb=N.d[ni+2]}}
      const ld=dot(nw,sun),day=clamp((ld+.06)/.2),lit=.03+.97*day*(.3+.7*Math.max(0,ld));
      let R2=r*lit,G2=g*lit,B2=b*lit;const nk=(1-day)*(o.lights??1)*(1-lava*.7);R2+=nr*nk;G2+=ng*nk*.85;B2+=nb*nk*.55;
      if(lava>0){const st=.45+.55*Math.pow(Math.abs(dot(sw,ax)),1.5),wv=worley(sw[0]*4.5+3,sw[1]*4.5,sw[2]*4.5)*.7+.3*worley(sw[0]*13,sw[1]*13+5,sw[2]*13),
          lv=clamp(lava*1.5*st-.08),cr=Math.exp(-wv/(.025+.06*lv))*lv,fl=.82+.18*Math.sin(tt0*5+sw[0]*37+sw[2]*23),dark=1-cr*.6-lv*.25;
        R2=R2*dark+255*cr*fl*1.25;G2=G2*dark+(95+110*cr)*cr*fl;B2=B2*dark+25*cr*fl}
      if(o.melt>0){const m=o.melt,wv=worley(sw[0]*7+1,sw[1]*7,sw[2]*7),cr=Math.exp(-wv/(.04+.12*m)),gl=m*(.55+.45*cr)*(.8+.2*FX.noise(sw[0]*9,sw[1]*9,tt0*2));
        R2=lerp(R2,255,gl);G2=lerp(G2,90+120*cr*m,gl);B2=lerp(B2,30+40*cr*m,gl)}
      if(heat>0){const hh=heat*Math.pow(Math.max(0,dot(sw,ax)),2.5);R2=R2*(1-hh*.4)+255*hh;G2=G2*(1-hh*.4)+130*hh;B2=B2*(1-hh*.4)+45*hh}
      const vv=-dot(dw,nw)/Math.hypot(dw[0],dw[1],dw[2]),fr=Math.pow(1-Math.max(0,vv),3),rs=Math.max(0,ld+.25)*fr*.5*255;R2+=rs*.45;G2+=rs*.7;B2+=rs;
      d[id]=R2;d[id+1]=G2;d[id+2]=B2;d[id+3]=255*al*Math.min(1,(1-Math.max(0,1-vv*6)*0)+0)}}
    EX.putImageData(img,0,0);ctx.save();ctx.imageSmoothingQuality='high';ctx.drawImage(EB,0,0,bw,bh,x0,y0,x1-x0,y1-y0);ctx.restore();return {q:q0,R:Rp}}

  /* ---------- oceano arrancado: jatos de água e vapor do lado da Terra virado para a Lua ---------- */
  function jets(ctx,c,E,R,M,o={}){const a=o.a??1;if(a<=0)return;const t=o.t||0,n=o.n||900,Rn=FX.rng(o.seed||3),ax=nrm(sub(M,E)),u1=nrm(crs(ax,[0,1,0])),u2=crs(ax,u1),Dm=Math.hypot(...sub(M,E))*(o.reachK||.8),reach=o.reach??1;
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
    for(let i=0;i<n;i++){const an=Rn()*TAU,rr=Math.sqrt(Rn())*R*(o.spread||.6),sp=.3+Rn()*.7,ph=Rn(),len=.04+Rn()*.06,big=Rn();
      const s=(t*sp*(o.speed||.22)+ph)%1;if(s>reach)continue;
      const h0=Math.sqrt(Math.max(0,R*R-rr*rr)),pt=u=>{const k=u*Dm,pinch=1-.8*Math.pow(u,.5),sw=Math.sin(u*5+an*2)*R*.05*u;
        return add(E,add(mul(ax,h0+k),add(mul(u1,Math.cos(an)*rr*pinch+sw),mul(u2,Math.sin(an)*rr*pinch))))};
      const q1=c.P(pt(s)),q2=c.P(pt(Math.max(0,s-len)));if(!isFinite(q1[0])||!isFinite(q2[0]))continue;const al=a*(1-s/reach)*(.2+.8*big);
      ctx.strokeStyle=s<.2?`rgba(120,180,255,${al*.55})`:`rgba(215,232,255,${al*.3})`;ctx.lineWidth=Math.max(1,c.f*R*(.006+.01*big)/q1[2]*(1-s*.5));ctx.beginPath();ctx.moveTo(q2[0],q2[1]);ctx.lineTo(q1[0],q1[1]);ctx.stroke()}
    ctx.restore()}

  /* ---------- choque entre planetas (em 3D, unidades da cena) ----------
     MARE.impact(ctx,c,{P (contato), n (eixo, da Lua para a Terra), R (raio da Terra), t (s desde o contato), N, seed})
     plasma no contato, lençol de magma ejetado quase no plano perpendicular ao eixo (esfria do branco ao vermelho), anéis de choque */
  function impact(ctx,c,o){const t=o.t;if(t<0)return;const P=o.P,n=nrm(o.n),R=o.R,u1=nrm(crs(n,Math.abs(n[1])>.9?[1,0,0]:[0,1,0])),u2=crs(n,u1),Rn=FX.rng(o.seed||11),qP=c.P(P),sc=o.speed||1;
    const pxR=isFinite(qP[0])?c.f*R/qP[2]:300;ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
    if(isFinite(qP[0])){const rr=pxR*(.25+1.4*(1-Math.exp(-t*sc/1.1))),al=Math.exp(-t*sc/2.6);for(const [kk,col,aa] of [[3.6,'255,110,40',.28],[2,'255,175,90',.5],[1,'255,245,220',.95]]){const g=ctx.createRadialGradient(qP[0],qP[1],0,qP[0],qP[1],rr*kk);
      g.addColorStop(0,`rgba(${col},${aa*al})`);g.addColorStop(1,`rgba(${col},0)`);ctx.fillStyle=g;ctx.beginPath();ctx.arc(qP[0],qP[1],rr*kk,0,TAU);ctx.fill()}}
    const N=o.N||2600;for(let i=0;i<N;i++){const an=Rn()*TAU,el=(Rn()-.5)*.45+(Rn()<.22?(Rn()-.2)*1.5:0),v=R*(.3+Math.pow(Rn(),1.7)*2.2),t0=Rn()*1.2,life=2.5+Rn()*6,tt=(t-t0)*sc,w=Rn(),sz=Rn();if(tt<=0)continue;
      const dv=nrm(add(add(mul(u1,Math.cos(an)),mul(u2,Math.sin(an))),mul(n,el))),D=v*(1-Math.exp(-tt/1.8))*1.8,vel=v*Math.exp(-tt/1.8),
        p1=add(P,mul(dv,D)),p2=add(P,mul(dv,Math.max(0,D-vel*.12-R*.006)));
      const q1=c.P(p1),q2=c.P(p2);if(!isFinite(q1[0])||!isFinite(q2[0]))continue;const age=clamp(tt/life);if(age>=1)continue;const hot=1-age;
      const col=hot>.75?`255,${Math.round(225+30*hot)},${Math.round(190*hot)}`:hot>.4?`255,${Math.round(100+160*(hot-.4))},${Math.round(30+20*w)}`:`${Math.round(120+260*hot)},${Math.round(30*hot)},18`;
      ctx.strokeStyle=`rgba(${col},${.9*(1-age*age)})`;ctx.lineWidth=Math.max(.8,(1+sz*sz*5)*(1-age*.5)*pxR/320);ctx.beginPath();ctx.moveTo(q2[0],q2[1]);ctx.lineTo(q1[0],q1[1]);ctx.stroke()}
    for(let k=0;k<3;k++){const rr=R*(.15+t*sc*(.8+k*.4)),al=Math.exp(-t*sc/(1.4+k))*(.85-k*.2);if(al<.02)continue;ctx.strokeStyle=`rgba(255,${210-k*45},${160-k*45},${al})`;ctx.lineWidth=Math.max(1.5,pxR*.025*(1-k*.25));ctx.shadowColor='rgba(255,160,80,.8)';ctx.shadowBlur=18;ctx.beginPath();
      let pen=false;for(let s=0;s<=120;s++){const a2=s/120*TAU,q=c.P(add(P,add(mul(u1,Math.cos(a2)*rr),mul(u2,Math.sin(a2)*rr))));if(!isFinite(q[0])){pen=false;continue}pen?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]);pen=true}ctx.stroke()}
    ctx.restore()}
  const shake=(t,t0,amp=26,dur=.8)=>{if(t<t0)return [0,0];const k=amp*Math.exp(-(t-t0)/dur);return [k*FX.noise((t-t0)*23,1.3),k*FX.noise(4.1,(t-t0)*23)]};
  /* relógio da simulação */
  function clock(ctx,h,x,y,o={}){const a=o.a??1;if(a<=0)return;const tm=Math.round(h*60),hh=Math.floor(tm/60),mm=tm%60;ctx.save();ctx.globalAlpha*=a;
    txt(ctx,o.label??'DEPOIS DE',x,y-70,{font:F.mono,size:28,ls:6,color:'rgba(236,230,214,.8)',align:o.align||'center'});
    ctx.shadowColor=o.col||'#f4b740';ctx.shadowBlur=18;txt(ctx,hh+' h '+String(mm).padStart(2,'0')+' min',x,y+14,{font:F.mono,size:o.size||84,weight:600,color:o.col||'#f4b740',align:o.align||'center'});ctx.restore()}


  /* ---------- oceano arrancado (v2): ponte de água e vapor, larga na Terra e afinando até a Lua, com névoa por baixo ---------- */
  function jets2(ctx,c,E,R,M,o={}){const a=o.a??1;if(a<=0)return;const t=o.t||0,n=o.n||1600,Rn=FX.rng(o.seed||3),ax=nrm(sub(M,E)),u1=nrm(Math.abs(ax[1])>.9?crs(ax,[1,0,0]):crs(ax,[0,1,0])),u2=crs(ax,u1),
      gap=Math.hypot(...sub(M,E))-R-(o.RM||0),reach=o.reach??1;if(gap<=0)return;
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
    /* névoa: discos suaves ao longo do eixo */
    for(let i=0;i<14;i++){const u=i/13,w=R*(.75-.6*u)*reach,P=add(E,mul(ax,R*.85+gap*u*reach)),q=c.P(P);if(!isFinite(q[0]))continue;const rp=c.f*w/q[2];
      const g=ctx.createRadialGradient(q[0],q[1],0,q[0],q[1],rp);g.addColorStop(0,`rgba(140,190,255,${.07*a*(1-u*.5)})`);g.addColorStop(1,'rgba(140,190,255,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(q[0],q[1],rp,0,TAU);ctx.fill()}
    for(let i=0;i<n;i++){const an=Rn()*TAU,rr=Math.pow(Rn(),.7)*R*.8,sp=.5+Rn()*.8,ph=Rn(),len=.05+Rn()*.08,big=Rn();
      const s=(t*sp*(o.speed||.16)+ph)%1;if(s>reach)continue;
      const h0=Math.sqrt(Math.max(0,R*R-rr*rr))*.95,pt=u=>{const pinch=1-.75*Math.pow(u,.7),tw=an+u*1.4;
        return add(E,add(mul(ax,h0+u*gap),add(mul(u1,Math.cos(tw)*rr*pinch),mul(u2,Math.sin(tw)*rr*pinch))))};
      const q1=c.P(pt(s)),q2=c.P(pt(Math.max(0,s-len)));if(!isFinite(q1[0])||!isFinite(q2[0]))continue;const al=a*Math.sin(Math.PI*Math.min(1,s/reach))*(.25+.75*big);
      ctx.strokeStyle=s<.3?`rgba(110,170,255,${al*.5})`:`rgba(220,236,255,${al*.32})`;ctx.lineWidth=Math.max(1.2,c.f*R*(.01+.02*big)/q1[2]);ctx.beginPath();ctx.moveTo(q2[0],q2[1]);ctx.lineTo(q1[0],q1[1]);ctx.stroke()}
    ctx.restore()}

  /* ---------- cicatriz na Lua: mar de magma que se espalha do ponto de contato e a onda de choque correndo pela superfície ---------- */
  function moonScar(ctx,c,o){const a=o.a??1;if(a<=0)return;const M=o.M,Rm=o.R,n0=nrm(o.n),u1=nrm(Math.abs(n0[1])>.9?crs(n0,[1,0,0]):crs(n0,[0,1,0])),u2=crs(n0,u1);
    const pt=(th,ph,k=1)=>add(M,mul(add(mul(n0,Math.cos(th)),mul(add(mul(u1,Math.cos(ph)),mul(u2,Math.sin(ph))),Math.sin(th))),Rm*k)),vis=P=>dot(sub(P,M),sub(c.eye,P))>0;
    const qc=c.P(add(M,mul(n0,Rm)));ctx.save();ctx.globalCompositeOperation='lighter';
    /* mar de magma (calota de ângulo th) */
    const qM=c.P(M);if(isFinite(qM[0])){const rM=c.f*Rm/Math.sqrt(Math.max(1e-9,dot(sub(M,c.eye),sub(M,c.eye))-Rm*Rm));ctx.beginPath();ctx.arc(qM[0],qM[1],rM,0,TAU);ctx.clip()}
    if(o.th>0){const N=120,pts=[];for(let i=0;i<=N;i++){const P=pt(o.th,i/N*TAU);const q=c.P(P);if(isFinite(q[0]))pts.push(q)}
      if(pts.length>3&&isFinite(qc[0])){const rr=Math.max(...pts.map(q=>Math.hypot(q[0]-qc[0],q[1]-qc[1])));const g=ctx.createRadialGradient(qc[0],qc[1],0,qc[0],qc[1],rr*1.05);
        g.addColorStop(0,`rgba(255,230,170,${.95*a*o.hot})`);g.addColorStop(.45,`rgba(255,120,40,${.75*a})`);g.addColorStop(.85,`rgba(200,40,10,${.5*a})`);g.addColorStop(1,'rgba(120,20,5,0)');
        ctx.fillStyle=g;ctx.beginPath();pts.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.closePath();ctx.fill()}}
    /* frente da onda de choque */
    if(o.shock>0&&o.shock<Math.PI*.95){ctx.strokeStyle=`rgba(255,220,170,${a*.85*Math.exp(-o.shock/1.6)})`;ctx.lineWidth=Math.max(2,c.f*Rm*.012/Math.max(1,(qc[2]||1)));ctx.shadowColor='rgba(255,150,70,1)';ctx.shadowBlur=24;ctx.beginPath();
      let pen=false;for(let i=0;i<=180;i++){const P=pt(o.shock,i/180*TAU,1.004);if(!vis(P)){pen=false;continue}const q=c.P(P);if(!isFinite(q[0])){pen=false;continue}pen?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]);pen=true}ctx.stroke()}
    ctx.restore()}

  /* ---------- rochas incandescentes lançadas (algumas passam pela câmera) ---------- */
  function rocks(ctx,c,o){const t=o.t;if(t<=0)return;const Rn=FX.rng(o.seed||21),n=nrm(o.n),u1=nrm(Math.abs(n[1])>.9?crs(n,[1,0,0]):crs(n,[0,1,0])),u2=crs(n,u1),list=[];
    for(let i=0;i<(o.N||26);i++){const an=Rn()*TAU,el=(Rn()-.3)*.7,v=o.R*(.6+Rn()*1.6),sz=o.R*(.025+Math.pow(Rn(),3)*.12),t0=Rn()*.6,seed=1+Math.floor(Rn()*6),spin=[Rn()*3,Rn()*3,Rn()*3];
      const tt=t-t0;if(tt<=0)continue;const dv=nrm(add(add(mul(u1,Math.cos(an)),mul(u2,Math.sin(an))),mul(n,el))),P=add(o.P,mul(dv,v*tt));
      list.push({P,dv,sz,seed,rot:[spin[0]*tt,spin[1]*tt,spin[2]*tt],heat:clamp(1-tt/6),d:Math.hypot(...sub(P,c.eye))})}
    list.sort((a,b)=>b.d-a.d);for(const r of list){const q=c.P(r.P);if(!isFinite(q[0]))continue;const rp=c.f*r.sz/q[2];if(rp<.8)continue;
      if(rp>2){ctx.save();ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(q[0],q[1],0,q[0],q[1],rp*3);g.addColorStop(0,`rgba(255,140,60,${.5*r.heat})`);g.addColorStop(1,'rgba(255,90,30,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(q[0],q[1],rp*3,0,TAU);ctx.fill();ctx.restore()}
      IMP.drawRock(ctx,c,IMP.rock({seed:r.seed,sub:rp>40?3:2}),{pos:r.P,rot:r.rot,s:r.sz,sun:o.sun||[.4,-.5,.7],heat:r.heat,vel:mul(r.dv,-1),amb:.12})}}

  /* ---------- disco de destroços em volta do corpo novo ---------- */
  function disk(ctx,c,o){const a=o.a??1;if(a<=0)return;const Rn=FX.rng(o.seed||5),n=nrm(o.n),u1=nrm(Math.abs(n[1])>.9?crs(n,[1,0,0]):crs(n,[0,1,0])),u2=crs(n,u1),t=o.t||0;
    ctx.save();ctx.globalCompositeOperation='lighter';for(let i=0;i<(o.N||2400);i++){const r=lerp(o.R0,o.R1,Math.pow(Rn(),.8)),ph=Rn()*TAU+t*.6*Math.pow(o.R0/r,1.5),z=(Rn()-.5)*(o.thick||.03)*r,h=Rn();
      const P=add(o.C,add(mul(u1,Math.cos(ph)*r),add(mul(u2,Math.sin(ph)*r),mul(n,z)))),q=c.P(P);if(!isFinite(q[0]))continue;const hot=clamp(o.hot*(1-(r-o.R0)/(o.R1-o.R0))+h*.2);
      ctx.fillStyle=`rgba(255,${Math.round(90+120*hot)},${Math.round(40+80*hot*hot)},${a*(.25+.6*h)})`;const s=Math.max(.7,c.f*o.R0*.004*(.5+h)/q[2]);ctx.fillRect(q[0]-s/2,q[1]-s/2,s,s)}ctx.restore()}

  return {sim,groundCam,beach,shoreX,ground,city,skyCol,earth,jets,jets2,impact,moonScar,rocks,disk,shake,clock,worley,toW}})();
