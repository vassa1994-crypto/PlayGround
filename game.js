(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const catalog = [
    {id:'triceratops',name:'Pip the Triceratops',emoji:'🦕',category:'dino',label:'DINOSAUR',price:420,description:'A curious little three-horn. Loves clover and company.',tone:'#dcebd2',unlock:0,hp:54},
    {id:'raptor',name:'Riff the Raptor',emoji:'🦖',category:'dino',label:'DINOSAUR',price:680,description:'Quick on their feet, soft on the inside.',tone:'#f0dfd3',unlock:2,hp:48},
    {id:'stego',name:'Pebble the Stegosaurus',emoji:'🦕',category:'dino',label:'DINOSAUR',price:980,description:'A gentle wall of plates and good manners.',tone:'#e5def0',unlock:4,hp:66},
    {id:'cafe',name:'Fernleaf Café',emoji:'☕',category:'build',label:'BUILDING',price:260,description:'A cozy stop for dino-shaped cookies and tea.',tone:'#f0e2c9',unlock:0},
    {id:'habitat',name:'Fernwood Habitat',emoji:'🏕️',category:'build',label:'BUILDING',price:360,description:'A leafy home for a new prehistoric pal.',tone:'#d9e8d0',unlock:0},
    {id:'lookout',name:'Canopy Lookout',emoji:'🛖',category:'build',label:'BUILDING',price:540,description:'The best view in the park, paws down.',tone:'#d9e5e9',unlock:1},
    {id:'fountain',name:'Dino-Splash Fountain',emoji:'⛲',category:'decor',label:'DECOR',price:180,description:'A refreshing little landmark for the plaza.',tone:'#d8e9ec',unlock:0},
    {id:'flowerbed',name:'Wildflower Patch',emoji:'🌼',category:'decor',label:'DECOR',price:120,description:'Bright blooms that bring the butterflies.',tone:'#f1e7c9',unlock:0}
  ];
  const starter = () => ({money:1250, day:1, wins:0, fossils:0, research:0, visitors:38, hunger:32, level:1, xp:0, energy:3, owned:['moss','starterTree'], placements:{6:{id:'moss',name:'Moss',emoji:'🦕',type:'dino'},13:{id:'starterTree',name:'Old fern',emoji:'🌳',type:'decor'}}, inventory:[], bought:[], lastCollect:0});
  let state;
  try { state = {...starter(), ...JSON.parse(localStorage.getItem('fern-fossil-save')||'{}')}; } catch { state=starter(); }
  state.placements ||= starter().placements; state.inventory ||= []; state.bought ||= []; state.owned ||= starter().owned;
  // Older saves only tracked ownership for dinosaurs. Rebuild ownership from the park and inventory.
  state.owned = [...new Set([...state.owned, ...state.inventory, ...Object.values(state.placements).map(item=>item.id)])];
  let pending=null, battle=null, toastTimer;
  const save=()=>{localStorage.setItem('fern-fossil-save',JSON.stringify(state));renderStats();};
  function renderStats(){
    $('#money').textContent=state.money.toLocaleString(); $('#shopMoney').textContent=state.money.toLocaleString(); $('#daySide').textContent=String(state.day).padStart(2,'0');
    $('#visitors').textContent=state.visitors; $('#dinoCount').innerHTML=`${1+state.owned.filter(x=>catalog.find(c=>c.id===x)?.category==='dino').length} <small class="muted">species</small>`;
    $('#research').innerHTML=`${state.research} <small class="muted">pts</small>`; $('#rating').textContent=`★ ${(2.4+state.bought.length*.2+state.wins*.1).toFixed(1)}`;
    $('#income').textContent=Math.round(48+state.visitors*.63+state.bought.length*13); $('#hungerText').textContent=`${state.hunger}%`; $('#hungerBar').style.width=`${state.hunger}%`;
    $('#missionCount').textContent=`${Math.min(state.visitors,100)} / 100`; $('#missionBar').style.width=`${Math.min(state.visitors,100)}%`;
    $('#expeditionBar').style.width=`${Math.min(100,state.wins/3*100)}%`; $('#expeditionText').textContent=`${state.wins} / 3 wins`;
  }
  function toast(message){const t=$('#toast');t.textContent=message;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2300);}
  function showView(name){
    $$('.view').forEach(v=>v.classList.toggle('active',v.id===`${name}View`));
    $$('.nav-item,.mobile-nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
    $('#crumbTitle').textContent={park:'Park overview',battle:'Expedition log',shop:'Supply shop'}[name]||'Park overview';
    if(name==='shop')renderShop(); if(name==='battle')refreshBattleView(); window.scrollTo({top:0,behavior:'smooth'});
  }
  $$('[data-view]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
  $$('[data-open="shop"]').forEach(b=>b.addEventListener('click',()=>showView('shop')));
  const map=$('#parkMap');
  function renderMap(){
    map.innerHTML='';
    for(let i=0;i<20;i++){
      const p=document.createElement('button');p.className='plot';p.setAttribute('aria-label',`Park plot ${i+1}`);const item=state.placements[i];
      if(item){p.classList.add('occupied');if(item.type==='dino')p.classList.add('dino-plot');p.innerHTML=`<span class="object-emoji">${item.emoji}</span><span class="object-label">${item.name.toUpperCase()}</span>`;p.title=item.name;}
      else {p.classList.add('open-plot');p.setAttribute('aria-label','Open plot. Tap to place an item.');}
      p.addEventListener('click',()=>plotClick(i));map.appendChild(p);
    }
  }
  function plotClick(i){
    if(pending){
      if(state.placements[i]){toast('That plot is already occupied. Try an open plot!');return;}
      const item=pending;state.placements[i]={id:item.id,name:item.short||item.name.split(' ')[0],emoji:item.emoji,type:item.category==='dino'?'dino':item.category};
      state.owned=[...new Set([...state.owned,item.id])];state.inventory=state.inventory.filter(x=>x!==item.id);state.visitors+=item.category==='dino'?14:8;state.bought.push(item.id);pending=null;
      $('#placeModal').classList.add('hidden');renderMap();save();renderShop();toast(`${item.name} found a lovely spot!`);return;
    }
    if(state.placements[i]){toast(`${state.placements[i].name} looks right at home!`);return;}
    toast('Visit the Supply shop to choose something for this plot.');
  }
  $('#zoomBtn').addEventListener('click',()=>map.classList.toggle('zoomed'));
  $('#closePlace').addEventListener('click',()=>{$('#placeModal').classList.add('hidden');pending=null;});
  $('#cancelPlace').addEventListener('click',()=>{$('#placeModal').classList.add('hidden');map.scrollIntoView({behavior:'smooth',block:'center'});});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#placeModal').classList.contains('hidden')){$('#placeModal').classList.add('hidden');pending=null;}});
  function openPlacement(item){pending=item;$('#placeEmoji').textContent=item.emoji;$('#placeTitle').textContent=`Place ${item.name}`;$('#placeDescription').textContent=item.category==='dino'?'Pick a peaceful plot for your new dinosaur.':'Choose an open plot on your park map.';$('#placeModal').classList.remove('hidden');}
  $('#placeModal').addEventListener('click',e=>{if(e.target.id==='placeModal'){pending=null;e.currentTarget.classList.add('hidden');}});
  function renderShop(filter='all'){
    const grid=$('#shopGrid');grid.innerHTML='';
    catalog.filter(item=>filter==='all'||item.category===filter).forEach(item=>{
      const unlocked=state.wins>=item.unlock, already=state.owned.includes(item.id)||state.inventory.includes(item.id), placed=Object.values(state.placements).some(x=>x.id===item.id), card=document.createElement('article');card.className='shop-item';
      card.innerHTML=`<div class="item-art" style="background:${item.tone}"><span class="item-category">${item.label}</span>${item.unlock>state.wins?`<span class="locked-ribbon">🔒 ${item.unlock} WINS</span>`:''}<span class="shop-emoji">${item.emoji}</span></div><div class="item-info"><h3>${item.name}</h3><p>${item.description}</p><div class="item-bottom"><span class="item-price">¢ ${item.price} <small> · ${item.category==='dino'?'new friend':'park item'}</small></span><button class="buy-btn ${!unlocked?'locked':''} ${already?'owned':''}">${!unlocked?'Locked':already?(placed?'Placed':'Place it'):'Buy'}</button></div></div>`;
      const btn=$('.buy-btn',card);btn.addEventListener('click',()=>{
        if(!unlocked){toast(`Win ${item.unlock-state.wins} more expedition${item.unlock-state.wins===1?'':'s'} to unlock this!`);return;}
        if(already){if(placed){toast(`${item.name} is already in your park.`);return;}showView('park');openPlacement(item);return;}
        if(state.money<item.price){toast('Not quite enough funds yet. Collect park income!');return;}
        state.money-=item.price;state.inventory.push(item.id);save();renderShop(filter);toast(`${item.name} purchased! Place it in your park.`);showView('park');openPlacement(item);
      });grid.appendChild(card);
    });
  }
  $$('.shop-tab').forEach(tab=>tab.addEventListener('click',()=>{$$('.shop-tab').forEach(t=>t.classList.remove('selected'));tab.classList.add('selected');renderShop(tab.dataset.category);}));
  $('#collectBtn').addEventListener('click',()=>{const income=Math.round(48+state.visitors*.63+state.bought.length*13);state.money+=income;state.day++;state.hunger=Math.min(100,state.hunger+7);save();toast(`Lovely day! ¢ ${income} added to park funds.`);});
  $('#feedBtn').addEventListener('click',()=>{if(state.hunger<=0){toast('Moss is already full and happy!');return;}if(state.money<15){toast('Collect your park income to buy some clover.');return;}state.money-=15;state.hunger=Math.max(0,state.hunger-35);save();toast('Moss is munching happily. ♥');});
  $('.close-tip').addEventListener('click',e=>e.currentTarget.closest('.tip-card').remove());
  // Friendly, fully turn-based encounters.
  const foes=[{name:'Rusty Raptor',short:'RAPTOR',emoji:'🦖',hp:36,attack:8,reward:280,fossils:2},{name:'Bramble Raptor',short:'RAPTOR',emoji:'🦖',hp:43,attack:10,reward:330,fossils:2},{name:'Muddy Trike',short:'TRIKE',emoji:'🦕',hp:53,attack:9,reward:390,fossils:3},{name:'Ridgeback',short:'STEGOSAUR',emoji:'🦕',hp:62,attack:11,reward:470,fossils:4}];
  function nextFoe(){
    const base=foes[Math.min(state.wins,foes.length-1)],extra=Math.max(0,state.wins-foes.length+1);
    return {...base,name:extra?`Veteran ${base.name}`:base.name,hp:base.hp+extra*8,attack:base.attack+Math.floor(extra/2),reward:base.reward+extra*70,fossils:base.fossils+Math.floor(extra/2)};
  }
  function refreshBattleView(){if(!battle){$('#battleIntro').classList.remove('hidden');$('#battleActive').classList.add('hidden');$('#battleResult').classList.add('hidden');}const foe=nextFoe();$('.battle-reward b').innerHTML=`¢ ${foe.reward} <i>+ 🦴 ${foe.fossils}</i>`;}
  function setupBattle(){const foe=nextFoe(),maxHp=42+(state.level-1)*4;battle={foe,hp:foe.hp,maxHp:foe.hp,playerHp:maxHp,maxPlayerHp:maxHp,energy:3,turn:1,done:false};$('#playerFighter').textContent='🦕';$('#enemyFighter').textContent=foe.emoji;$('#enemyName').textContent=foe.name.toUpperCase();$('#fighterName').textContent='MOSS';$('#playerHpName').textContent='MOSS';$('#enemyHpName').textContent=foe.short;$('#battleLog').textContent=`${foe.name} steps into the clearing. Your move!`;$('#battleIntro').classList.add('hidden');$('#battleResult').classList.add('hidden');$('#battleActive').classList.remove('hidden');updateCombat();}
  function updateCombat(){if(!battle)return;$('#playerHpNum').textContent=`${battle.playerHp} / ${battle.maxPlayerHp}`;$('#enemyHpNum').textContent=`${battle.hp} / ${battle.maxHp}`;$('#playerHpBar').style.width=`${Math.max(0,battle.playerHp/battle.maxPlayerHp*100)}%` ;$('#enemyHpBar').style.width=`${Math.max(0,battle.hp/battle.maxHp*100)}%`;$('#energyDots').textContent='● '.repeat(battle.energy)+'○ '.repeat(3-battle.energy);$('#turnLabel').textContent=String(battle.turn).padStart(2,'0');$$('.move-btn').forEach(b=>{b.disabled=(b.dataset.move==='leaf'&&battle.energy===0)||battle.done;b.style.opacity=b.disabled?'.48':'1';});}
  function movePlayer(move){if(!battle||battle.done)return;let damage=0,log='';
    if(move==='stomp'){damage=14+Math.floor(Math.random()*6)+Math.floor((state.level-1)*1.5);log=`Moss stomps with a mighty thump for ${damage} damage!`;}
    if(move==='leaf'){if(battle.energy<1)return;battle.energy--;damage=20+Math.floor(Math.random()*7)+Math.floor((state.level-1)*1.5);log=`A brilliant leaf burst! ${battle.foe.name} takes ${damage} damage.`;}
    if(move==='rest'){const heal=Math.min(10,battle.maxPlayerHp-battle.playerHp);battle.playerHp+=heal;battle.energy=Math.min(3,battle.energy+1);log=`Moss catches a breath and recovers ${heal} HP.`;}
    battle.hp=Math.max(0,battle.hp-damage);$('#battleLog').textContent=log;updateCombat();
    if(battle.hp===0){finishBattle(true);return;}$$('.move-btn').forEach(b=>b.disabled=true);
    setTimeout(()=>{if(!battle||battle.done)return;const hit=battle.foe.attack+Math.floor(Math.random()*5);battle.playerHp=Math.max(0,battle.playerHp-hit);$('#battleLog').textContent=`${battle.foe.name} gives a playful bump. Moss loses ${hit} HP.`;battle.turn++;if(battle.playerHp===0){finishBattle(false);return;}battle.energy=Math.min(3,battle.energy+1);updateCombat();},700);
  }
  function finishBattle(win){if(!battle)return;battle.done=true;updateCombat();$('#battleActive').classList.add('hidden');$('#battleResult').classList.remove('hidden');$('#resultStamp').textContent=win?'✦':'♥';$('#resultKicker').textContent=win?'VICTORY':'A GENTLE RETREAT';$('#resultTitle').textContent=win?'Well fought!':'Time for a snack break.';$('#resultCopy').textContent=win?`${battle.foe.name} gives a friendly nod and trots back to the woods.`:'Moss is safely back at the park. A little rest and you can try again.';
    if(win){state.money+=battle.foe.reward;state.fossils+=battle.foe.fossils;state.research+=10;state.wins++;state.xp+=25;if(state.xp>=50){state.level++;state.xp-=50;}state.visitors+=6;$('#lootCoins').textContent=`¢ ${battle.foe.reward}`;$('#lootFossils').textContent=`🦴 +${battle.foe.fossils} fossils · +10 research`;$('#resultStamp').style.background='#edf3e6';$('#resultStamp').style.color='#83a76e';}
    else{$('#lootCoins').textContent='No coins lost';$('#lootFossils').textContent='Moss is safe and sound';$('#resultStamp').style.background='#f8eee5';$('#resultStamp').style.color='#bd8c68';}
    $('#dinoLevel').textContent=state.level;save();renderShop();
  }
  $('#startBattle').addEventListener('click',setupBattle);$$('.move-btn').forEach(b=>b.addEventListener('click',()=>movePlayer(b.dataset.move)));
  $('#forfeitBattle').addEventListener('click',()=>{if(battle){battle=null;$('#battleActive').classList.add('hidden');$('#battleIntro').classList.remove('hidden');toast('Expedition ended. Moss is safe!');}});
  $('#continueBtn').addEventListener('click',()=>{battle=null;showView('park');});$('#againBtn').addEventListener('click',setupBattle);
  $('#battleView').addEventListener('keydown',e=>{if(['1','2','3'].includes(e.key)&&!$('#battleActive').classList.contains('hidden')){const move=['stomp','leaf','rest'][Number(e.key)-1];movePlayer(move);}});
  $('#dinoLevel').textContent=state.level;renderStats();renderMap();
})();
