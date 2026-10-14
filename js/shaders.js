(() => {
'use strict';

window.Unburden = window.Unburden || {};

/* ===== 苦飲與紙（WebGL 著色器） ===== */
const VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}';

const COMMON = `
precision highp float;
float gs(float x){return exp(-x*x);}
float h12(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(h12(i),h12(i+vec2(1.0,0.0)),u.x),mix(h12(i+vec2(0.0,1.0)),h12(i+vec2(1.0,1.0)),u.x),u.y);}
float fbm(vec2 p){float s=0.0,a=0.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);
  for(int i=0;i<5;i++){s+=a*vn(p);p=m*p;a*=0.5;}return s;}
`;

/* 一次性：紙的雲紋、纖維、滲邊、顆粒 */
const FIELD = `
uniform vec2 uRes;uniform float uAsp;
void main(){
  vec2 uv=gl_FragCoord.xy/uRes;vec2 p=vec2(uv.x*uAsp,uv.y);
  float form=smoothstep(0.28,0.72,fbm(p*2.4+vec2(3.1,7.3)));
  vec2 w=p+0.03*vec2(vn(p*30.0),vn(p*30.0+7.0));
  vec2 q1=mat2(0.94,0.34,-0.34,0.94)*w,q2=mat2(0.5,-0.87,0.87,0.5)*w;
  float fib=0.5*vn(p*240.0)+0.25*vn(q1*vec2(320.0,40.0))+0.25*vn(q2*vec2(320.0,40.0)+11.0);
  fib=smoothstep(0.15,0.85,fib);
  float edge=fbm(p*4.2+vec2(9.7,1.3))+0.32*(fbm(p*17.0+5.0)-0.5);
  float gran=vn(p*300.0)*0.55+vn(p*110.0+3.0)*0.45;
  gl_FragColor=vec4(form,fib,clamp(edge,0.0,1.0),gran);
}`;

const MAIN = `
uniform sampler2D uF;uniform vec2 uRes;uniform float uAsp,uT;uniform vec3 uPaper;
uniform float uLevel,uPool,uWet,uFlow,uRing,uRingDraw,uRingR,uSweet,uBitter,uLight,uGold,uFade,uVig,uHold;
uniform vec4 uTide;uniform vec4 uDrop[6];uniform vec2 uHoldC;uniform vec4 uClr;uniform float uClrA,uRays,uTime;
float edgeAt(float lv,vec2 p,float en){return lv+en*0.16+0.018*sin(p.x*4.3+1.7)+0.01*sin(p.x*11.0+0.4);}
void main(){
  vec2 uv=gl_FragCoord.xy/uRes;vec2 p=vec2(uv.x*uAsp,uv.y);
  vec4 f=texture2D(uF,uv);
  float form=f.r,fib=f.g,en=f.b-0.5,gran=f.a;
  float fl=((vn(p*3.2+vec2(uT*0.06,-uT*0.045))-0.5)*0.7+(vn(p*7.5-vec2(uT*0.05,uT*0.08))-0.5)*0.3)*uFlow;

  /* 滲上紙的薄茶色，邊緣乾後聚成深色水線 */
  float live=step(0.002,uLevel);
  float d=edgeAt(uLevel,p,en)+fl*0.035*uWet-uv.y;
  float inW=smoothstep(-0.003,0.007,d)*live;
  float wick=(0.06+0.12*smoothstep(0.0,0.3,d))*inW*(0.82+0.36*fib);
  float rim=gs((d-0.0035)/mix(0.006,0.0045,1.0-uWet))*mix(0.1,0.38,1.0-uWet)*live;

  /* 喝下後留下的潮線 */
  float dA=edgeAt(uTide.x,p,en)-uv.y;
  float tide=gs((dA-0.0035)/0.0045)*0.42*uTide.y+smoothstep(-0.003,0.007,dA)*0.05*uTide.y*(0.8+0.4*fib);
  float dB=edgeAt(uTide.z,p,en*0.9+0.03)-uv.y;
  tide+=gs((dB-0.003)/0.004)*0.3*uTide.w;

  /* 底部的苦飲液面 */
  float pd=uPool+en*0.07+fl*0.03-uv.y;
  float inP=smoothstep(-0.004,0.012,pd)*step(0.002,uPool);
  float pool=inP*(0.75+0.6*smoothstep(0.0,0.09,pd));

  /* 滴落的咖啡：落點濺開成一灘，邊緣聚色，旁邊帶幾點飛濺 */
  float splat=0.0;
  for(int i=0;i<6;i++){
    vec4 D=uDrop[i];
    if(D.z>=0.0&&D.w<0.0){
      vec2 dv=p-D.xy;float dl=length(dv);
      float r0=(0.011+0.02*(1.0-exp(-D.z*2.2)))*(-D.w);
      float s=smoothstep(r0,r0-0.005,dl+en*0.018);
      s+=gs((dl+en*0.018-r0+0.002)/0.0025)*0.6;
      float sa=atan(dv.y,dv.x)*1.27+float(i)*1.7;
      float cell=floor(sa*2.0);
      float sr=r0*(1.55+0.7*h12(vec2(cell,float(i))));
      vec2 sc=D.xy+vec2(cos((cell+0.5)/2.54),sin((cell+0.5)/2.54))*sr;
      s+=smoothstep(0.004,0.0015,length(p-sc))*step(0.55,h12(vec2(cell,float(i)+9.0)))*smoothstep(0.0,0.08,D.z);
      splat=max(splat,s*smoothstep(6.0,3.5,D.z));
    }
  }
  splat*=1.0-inP;

  float T=wick+rim+tide+pool+fl*0.16*uWet*inW+splat*0.75;
  T*=mix(1.0,0.7+0.6*gran,(1.0-uWet)*0.85)*(1.0+0.15*uWet);

  /* 杯底留下的圈：乾透的咖啡環，兩端漸淡 */
  vec2 rv=p-vec2(uAsp*0.8,0.865);float R=0.165*uRingR;float rd=length(rv)+en*0.02;
  float ang=fract(atan(rv.y,rv.x)/6.2831853+0.62)+en*0.05;
  float full=smoothstep(0.9,1.0,uRingDraw);
  float arc=smoothstep(uRingDraw*1.13+0.01,uRingDraw*1.13-0.1,ang)*mix(smoothstep(-0.03,0.07,ang),1.0,full);
  float ring=(gs((rd-R)/(0.0045*uRingR))*0.6/uRingR+gs((rd-R+0.011)/0.013)*0.15)*arc+smoothstep(R,R-0.012,rd)*0.035;

  /* 苦的一滴：中心淡、邊緣聚色 */
  vec2 bc=vec2(uAsp*0.17,0.8);float bd=length(p-bc)+en*0.05;
  float b=smoothstep(0.037,0.027,bd)*(0.26+0.24*smoothstep(0.0,0.032,bd))+gs((bd-0.033)/0.005)*0.5;
  b+=smoothstep(0.01,0.004,length(p-bc-vec2(0.065,0.032))+en*0.012)*0.55;
  b+=smoothstep(0.007,0.002,length(p-bc-vec2(-0.03,-0.07))+en*0.01)*0.45;

  T+=(ring*uRing+b*uBitter)*(0.62+0.6*gran)*(0.85+0.3*fib);
  /* 留白：苦飲在文字周圍退開，邊緣如水彩般不規則 */
  vec2 fe=vec2(0.07,0.035)+en*0.05;
  vec2 lo=smoothstep(uClr.xy-fe,uClr.xy+fe*0.4,uv),hi=1.0-smoothstep(uClr.zw-fe*0.4,uClr.zw+fe,uv);
  float clr=lo.x*lo.y*hi.x*hi.y*uClrA;
  T*=(1.0-uFade)*(1.0-clr*0.82);

  /* 甜的一滴：光亮、圓潤，蒸發後不留痕 */
  float sd=length(p-vec2(uAsp*0.74,0.53))+en*0.008;
  float sm=smoothstep(0.046,0.041,sd)*uSweet*(1.0-clr*0.7);
  float sT=sm*(0.25+0.35*smoothstep(0.046,0.0,sd));

  vec3 K=mix(vec3(0.62,1.12,1.95),vec3(0.2,0.52,1.5),uGold);
  vec3 Kh=vec3(0.1,0.35,1.15);
  vec3 pc=uPaper*(1.0-0.06*(form-0.5))*(1.0-0.03*(fib-0.5))*(1.0-0.02*(gran-0.5));
  vec3 refl=pc*exp(-K*T*2.0)*exp(-Kh*sT*2.0);

  /* 光從紙背透過：纖維雲紋顯現，苦痕透出琥珀與金 */
  float lc=smoothstep(1.3,0.0,length((uv-vec2(0.5,0.84))*vec2(1.0,0.72)));
  float tr=0.97-0.2*(form-0.5)-0.06*(fib-0.5);
  vec3 back=vec3(1.0,0.955,0.87)*tr*(0.9+0.12*lc)*exp(-K*T*1.2)*exp(-Kh*sT);
  vec3 col=mix(refl,back,clamp(uLight*(0.6+0.4*lc),0.0,1.0));

  /* 液體本身：深處是近乎黑的濃褐，淺處透出琥珀與紙纖維，表面浮著油脂紋 */
  float liq=inP*smoothstep(0.0,0.3,uWet);
  float dep=smoothstep(0.0,0.075,pd);
  vec3 coffee=mix(vec3(0.5,0.28,0.12),vec3(0.075,0.036,0.018),dep);
  coffee*=mix(0.82+0.3*fib,1.0,dep);
  vec2 cq=p*vec2(4.0,13.0)+vec2(uT*0.045,0.0)+fl*1.5;
  float crema=smoothstep(0.52,0.82,fbm(cq+1.3*vec2(fbm(cq*1.6+2.0),fbm(cq*1.6+7.0))));
  coffee=mix(coffee,vec3(0.48,0.29,0.14),crema*0.3*dep);
  coffee*=1.0-0.35*gs((pd-0.006)/0.006);
  col=mix(col,coffee,liq*0.94);
  float sw=splat*smoothstep(0.0,0.4,uWet);
  /* 正在落下的一滴：拉長的水珠，帶一點高光 */
  for(int i=0;i<6;i++){
    vec4 D=uDrop[i];
    if(D.z<0.0&&D.z>-1.0){
      float fz=-D.z,tf=1.0-fz;
      vec2 c=vec2(D.x,D.y+0.42*(1.0-tf*tf));
      vec2 q=(p-c)/(0.0075*abs(D.w));
      q.y=q.y>0.0?q.y*(0.45+0.25*fz):q.y;
      float dl=length(q);
      float dr=smoothstep(1.0,0.75,dl)*smoothstep(1.0,0.8,fz);
      vec3 dc=mix(vec3(0.09,0.045,0.02),vec3(0.42,0.23,0.1),smoothstep(0.9,0.2,length(q-vec2(0.25,-0.2))));
      dc+=vec3(1.0,0.96,0.9)*smoothstep(0.32,0.12,length(q-vec2(-0.32,0.28)))*0.8;
      col=mix(col,dc,dr);
    }
  }
  col=mix(col,mix(vec3(0.42,0.23,0.1),vec3(0.17,0.085,0.04),smoothstep(0.3,1.2,splat)),sw*0.55);

#ifdef DERIV
  float wm=clamp((inP+inW*0.7)*uWet+sm+sw,0.0,1.0);
  float H=(smoothstep(-0.01,0.05,pd)*step(0.002,uPool)*0.12+fl*0.05)*uWet+sT*0.9+sw*0.03;
  H+=((vn(p*14.0+vec2(uT*0.4,uT*0.25))-0.5)*0.0025+(vn(p*31.0-vec2(uT*0.3,-uT*0.5))-0.5)*0.0009)*liq;
  for(int i=0;i<6;i++){
    vec4 D=uDrop[i];
    if(D.z>=0.0){
      float dd=length(p-D.xy);float age=D.z;
      float env=gs((dd-age*0.2)/(0.035+age*0.03))*exp(-age*0.75);
      H+=sin(dd*150.0-age*16.0)*env*0.004*abs(D.w)*step(0.0,D.w);
    }
  }
  H*=wm;
  vec2 g=vec2(dFdx(H),dFdy(H))*uRes.y;
  vec3 n=normalize(vec3(-g*0.9,1.0));
  vec3 L=normalize(vec3(-0.4,0.6,0.7));
  col*=1.0+clamp(dot(n,L)-L.z,-0.25,0.25)*0.9*wm;
  vec3 hv=normalize(L+vec3(0.0,0.0,1.0));
  col+=vec3(1.0,0.97,0.92)*max(pow(max(dot(n,hv),0.0),90.0)-pow(hv.z,90.0),0.0)*0.6*wm;
  /* 液面倒映著窗：被漣漪扭動的窗格與光 */
  vec2 rp=(uv+n.xy*0.22-vec2(0.3,uPool*0.45))*vec2(1.0,2.6);
  float win=smoothstep(0.012,0.0,max(abs(rp.x)-0.11,abs(rp.y)-0.07));
  win*=1.0-0.75*smoothstep(0.006,0.002,min(abs(rp.x),abs(rp.y)));
  float sky=smoothstep(0.35,0.0,length(rp*vec2(0.8,1.0)));
  col+=vec3(1.0,0.96,0.88)*(win*0.38+sky*0.07)*liq*(1.0-dep*0.25);
  col+=vec3(1.0,0.93,0.82)*gs((pd-0.0025)/0.0018)*0.22*liq*(0.6+0.8*vn(p*40.0));
#endif

  /* 頓悟之光：自上方穿透而下的光束與暖暈 */
  if(uRays>0.001){
    vec2 rv2=p-vec2(0.5*uAsp,1.32);float ra=atan(rv2.x,-rv2.y);float rr=length(rv2);
    float s=vn(vec2(ra*13.0,uTime*0.12))*0.6+vn(vec2(ra*29.0+4.0,-uTime*0.08))*0.4;
    float beam=smoothstep(0.38,0.9,s)*smoothstep(1.9,0.35,rr)*smoothstep(0.85,0.15,abs(ra));
    beam*=0.75+0.25*vn(vec2(rr*6.0-uTime*0.25,ra*8.0));
    col=mix(col,vec3(1.0,0.95,0.8),beam*uRays*0.42);
    col+=vec3(0.16,0.11,0.035)*uRays*exp(-length((uv-vec2(0.5,1.04))*vec2(1.0,1.5))*2.6);
  }

  col+=vec3(0.09,0.055,0.02)*uHold*exp(-length(p-uHoldC)*3.2);
  col*=1.0-uVig*0.45*smoothstep(0.3,1.0,length((uv-0.5)*vec2(1.0,0.82))*1.45);
  col+=(h12(gl_FragCoord.xy)-0.5)/255.0;
  gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
}`;

window.Unburden.SHADERS = { VS, COMMON, FIELD, MAIN };
})();
