(() => {
'use strict';

window.Unburden = window.Unburden || {};

/* ===== 文案配置（逐字；改字後請執行 tools/embed_font.py 重新嵌入字型） =====
   lines：字串或 {t, k:'key'|'verse'|'ref', gap:true}
   pace：該屏節奏倍率；dense：較密排版；catch：「被接住」互動 */
const SCREENS = [
  { id:1, name:'邀請', button:'我斟好了', pace:1, lines:[
    '歡迎來到苦澀烘焙室。',
    {t:'先為自己斟一杯苦——', gap:true},
    '冷萃咖啡或涼茶。',
    {t:'別急著喝，', gap:true},
    '這杯在等你先回答一個問題。'
  ]},
  { id:2, name:'甜不需要選擇', button:'繼續', pace:1, lines:[
    '對討好的甜，人總是來者不拒。',
    '哪一種甜，沒有人需要費心思去考慮。',
    {t:'但苦不一樣。', gap:true, k:'key'},
    {t:'苦是唯一會讓你', gap:true},
    '停下來思考的味道。'
  ]},
  { id:3, name:'苦，也可以是選擇', button:'繼續', pace:.82, dense:true, lines:[
    '為了一個團隊的結果多跑一圈，',
    '陪著哭鬧的孩子熬到深夜，',
    '為了關係，把想說的話嚥下去——',
    {t:'苦，不總是被動發生在我們身上。', gap:true},
    '有時是我們為著所珍視的，',
    '自己選擇主動承受。',
    {t:'是我們有意識作出的選擇：', gap:true},
    {t:'我們願意為了誰、為了什麼，承受哪一種苦。', k:'key'}
  ]},
  { id:4, name:'提問，然後喝下', button:'我喝下了', pace:1.1, catch:true, lines:[
    '所以，在喝下這杯之前，問自己：',
    {t:'這一杯，你選擇為誰、為了什麼而喝？', k:'key'},
    {t:'當你清楚自己珍視的是什麼，', gap:true},
    '為了獲取它所受的必要之苦，就有了意義。',
    {t:'現在，帶著你的答案喝下這一口。', gap:true}
  ]},
  { id:5, name:'香氣', button:'繼續', pace:1.15, lines:[
    '香氣不是煎熬過後的獎賞。',
    '它從來深藏在苦內，',
    '只等有意識經歷苦的人聞到。',
    {t:'你聞到了口腔裡的香氣了嗎？', gap:true},
    {t:'它一直都在。', gap:true, k:'key'}
  ]},
  { id:6, name:'那一位也喝過', button:'繼續', pace:1.35, dense:true, lines:[
    '有一位，也曾站在苦杯面前。',
    '祂可以轉身，但祂選擇飲盡。',
    {t:'「祂因那擺在前面的喜樂，就輕看羞辱，忍受了十字架的苦難。」', k:'verse'},
    {t:'——希伯來書 12:2', k:'ref'},
    {t:'那擺在祂前面的喜樂，就是你。', k:'key'},
    {t:'祂很清楚為何要承受終極的苦——', gap:true},
    '只是因為重視你，',
    '要讓你的生命，散發出永恆的香氣。'
  ]},
  { id:7, name:'鬆綁', button:'繼續', pace:1.15, lines:[
    '所以，你手上這杯，',
    '不再是一個人背的。',
    {t:'你選擇承受的苦，祂也陪你一一經過；', gap:true},
    '你飲不下的苦，祂已替你飲了。',
    {t:'鬆綁，不是放棄你所珍視的，', gap:true},
    '而是終於承認：',
    {t:'我不需要獨自背負。', gap:true, k:'key'}
  ]},
  { id:8, name:'結尾・領取提示卡', button:null, pace:1.2, card:true, lines:[
    {t:'苦，從來不是終點。', k:'key'},
    {t:'離開前，', gap:true},
    '請在出口領取一張提示卡，',
    '讓這份覺悟，陪你走接下來的路。'
  ]}
];

/* ===== 畫面狀態：每屏紙與苦飲的目標值 =====
   level 滲上紙的高度｜pool 底部液面｜wet 濕潤｜flow 流動躁度｜ringDraw 杯痕完成度
   light 背光透紙｜gold 苦轉金｜fade 漬痕淡去 */
const LOOK = {
  1:{dur:5200, u:{paper:[.953,.929,.882], level:.1, pool:.035, wet:1, flow:.45, ring:.85, ringDraw:.7, vig:.14}},
  2:{dur:5200, u:{paper:[.94,.909,.855], level:.17, pool:.05, flow:.65, ringDraw:.76, vig:.24}},
  3:{dur:6200, u:{paper:[.925,.89,.83], level:.26, pool:.065, flow:1, ringDraw:.83, vig:.38}},
  4:{dur:5200, u:{paper:[.912,.872,.805], level:.34, pool:.075, flow:.55, ringDraw:.9, vig:.48}},
  5:{dur:4200, u:{paper:[.925,.888,.82], vig:.28}},
  6:{dur:9000, u:{paper:[.95,.928,.878], light:.45, vig:.05, hold:0, bitter:.8, fade:.3}},
  7:{dur:7500, u:{paper:[.966,.954,.928], light:.55, gold:.85, fade:.74, ring:.55, ringR:1.4, vig:0, bitter:0}},
  8:{dur:5000, u:{paper:[.952,.934,.898], light:.22, fade:.84, vig:.1}}
};

/* 第六屏：隨經文出現的啟示節點（行索引 → 目標） */
const CUES = {
  6:{
    2:{dur:8000, u:{light:.78, gold:.45, fade:.36}},
    4:{dur:7500, u:{light:1, gold:1, fade:.4}}
  }
};

const RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const K = RM ? .3 : 1;
const $ = s => document.querySelector(s);
const later = (fn, ms) => setTimeout(fn, ms);

Object.assign(window.Unburden, { SCREENS, LOOK, CUES, RM, K, $, later });
})();
