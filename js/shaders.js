(() => {
'use strict';

window.Unburden = window.Unburden || {};

/* ===== 苦飲與紙（WebGL 著色器） ===== */
const VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}';

const COMMON = `
precision highp float;
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
uniform vec4 uTide;uniform vec3 uRip;uniform vec2 uHoldC;uniform vec4 uClr;uniform float uClrA;
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
  float rim=exp(-pow((d-0.0035)/mix(0.006,0.0045,1.0-uWet),2.0))*mix(0.1,0.38,1.0-uWet)*live;

  /* 喝下後留下的潮線 */
  float dA=edgeAt(uTide.x,p,en)-uv.y;
  float tide=exp(-pow((dA-0.0035)/0.0045,2.0))*0.42*uTide.y+smoothstep(-0.003,0.007,dA)*0.05*uTide.y*(0.8+0.4*fib);
  float dB=edgeAt(uTide.z,p,en*0.9+0.03)-uv.y;
  tide+=exp(-pow((dB-0.003)/0.004,2.0))*0.3*uTide.w;

  /* 底部的苦飲液面 */
  float pd=uPool+en*0.07+fl*0.03-uv.y;
  float inP=smoothstep(-0.004,0.012,pd)*step(0.002,uPool);
  float pool=inP*(0.75+0.6*smoothstep(0.0,0.09,pd));

  float T=wick+rim+tide+pool+fl*0.16*uWet*inW;
  T*=mix(1.0,0.7+0.6*gran,(1.0-uWet)*0.85)*(1.0+0.15*uWet);

  /* 杯底留下的圈：乾透的咖啡環，兩端漸淡 */
  vec2 rv=p-vec2(uAsp*0.8,0.865);float R=0.165*uRingR;float rd=length(rv)+en*0.02;
  float ang=fract(atan(rv.y,rv.x)/6.2831853+0.62)+en*0.05;
  float full=smoothstep(0.9,1.0,uRingDraw);
  float arc=smoothstep(uRingDraw*1.13+0.01,uRingDraw*1.13-0.1,ang)*mix(smoothstep(-0.03,0.07,ang),1.0,full);
  float ring=(exp(-pow((rd-R)/(0.0045*uRingR),2.0))*0.6/uRingR+exp(-pow((rd-R+0.011)/0.013,2.0))*0.15)*arc+smoothstep(R,R-0.012,rd)*0.035;

  /* 苦的一滴：中心淡、邊緣聚色 */
  vec2 bc=vec2(uAsp*0.17,0.8);float bd=length(p-bc)+en*0.05;
  float b=smoothstep(0.037,0.027,bd)*(0.26+0.24*smoothstep(0.0,0.032,bd))+exp(-pow((bd-0.033)/0.005,2.0))*0.5;
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
  vec3 col=mix(refl,back,uLight*(0.6+0.4*lc));

#ifdef DERIV
  float wm=clamp((inP+inW*0.7)*uWet+sm,0.0,1.0);
  float H=(smoothstep(-0.01,0.05,pd)*step(0.002,uPool)*0.12+fl*0.05)*uWet+sT*0.9;
  if(uRip.z>0.0){
    float dd=length(p-uRip.xy);float age=uRip.z;
    float env=exp(-pow((dd-age*0.26)/0.11,2.0))*exp(-age*0.55);
    H+=sin(dd*120.0-age*13.0)*env*0.0035*wm;
  }
  vec2 g=vec2(dFdx(H),dFdy(H))*uRes.y;
  vec3 n=normalize(vec3(-g*0.9,1.0));
  vec3 L=normalize(vec3(-0.4,0.6,0.7));
  col*=1.0+clamp(dot(n,L)-L.z,-0.25,0.25)*0.9*wm;
  vec3 hv=normalize(L+vec3(0.0,0.0,1.0));
  col+=vec3(1.0,0.97,0.92)*max(pow(max(dot(n,hv),0.0),90.0)-pow(hv.z,90.0),0.0)*0.6*wm;
#endif

  col+=vec3(0.09,0.055,0.02)*uHold*exp(-length(p-uHoldC)*3.2);
  col*=1.0-uVig*0.45*smoothstep(0.3,1.0,length((uv-0.5)*vec2(1.0,0.82))*1.45);
  col+=(h12(gl_FragCoord.xy)-0.5)/255.0;
  gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
}`;

window.Unburden.SHADERS = { VS, COMMON, FIELD, MAIN };
})();
