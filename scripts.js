// ═══════════════════════════════════════════════
// ENHANCED SMART SEARCH ENGINE — with relevance scoring & priority sorting
// ═══════════════════════════════════════════════

// Alias map: what user types → what to also match
const SEARCH_ALIASES = {
  'juice':    ['fresh juice','musumbi','orange','pineapple','grape','pomegranate','watermelon','water melon','mango','cucumber','pappaya','citrus','sweet melon'],
  'shake':    ['milk shake','boost','kulfi','badam','rose milk','cherry','sharja','chicku','mango','apple','dragon','avacado','chocolate','vanilla','oreo','strawberry','butterscotch','pista','kitkat','dates','dubai','horlicks','anjira','dolphin special shake','banana'],
  'cold':     ['shake','kulukki','mojito','lassi','ice cream','falooda','soda','lime fresh'],
  'tea':      ['tea','ginger tea','black tea','lemon tea','lemon tea with honey'],
  'coffee':   ['black coffee','coffee','cold coffee'],
  'veg':      ['veg burger','veg sandwich','veg maggi','veg roll','veg momos','plant shawarma'],
  'chicken':  ['chicken burger','chicken sandwich','chicken maggi','chicken roll','chicken momos','chicken loaded fries','chicken bread omelet'],
  'egg':      ['egg burger','egg maggi','egg roll','bread omelet'],
  'omelet':   ['bread omelet','plain bread omelet','masala bread omelet','cheese bread omelet','chicken bread omelet'],
  'omlate':   ['bread omelet'],
  'omelette': ['bread omelet'],
  'bread':    ['bread omelet'],
  'burger':   ['veg burger','cheese veg burger','chicken burger','cheese chicken burger','zinger burger','double decker','egg burger','dolphin special burger'],
  'wrap':     ['veg roll','chicken roll','shawarma'],
  'roll':     ['veg roll','chicken roll','roll shawarma'],
  'fries':    ['normal fries','peri peri fries','chicken loaded fries','french fries'],
  'momos':    ['fried chicken momos','fried veg momos'],
  'falooda':  ['vanilla falooda','royal falooda','pista falooda','butterscotch falooda','chocolate falooda','mango falooda','strawberry falooda'],
  'lassi':    ['normal lassi','blue berry lassi','strawberry lassi','butterscotch lassi','vanilla lassi','black current lassi','bombay lassi'],
  'mojito':   ['lime mint mojito','orange mojito','strawberry mojito','kiwi mojito','mango mojito','green apple mojito','blueberry mojito','watermelon mojito','passion fruit mojito'],
  'kulukki':  ['passion fruit kulukki','pineapple kulukki','mango kulukki','strawberry kulukki','blue berry kulukki'],
  'tender':   ['tender','tender chicku','tender mango','tender strawberry'],
  'special':  ['dolphin special shake','special avilmilk','special falooda','dolphin special burger'],
  'shawarma': ['roll shawarma','plant shawarma'],
  'maggi':    ['plain maggi','veg maggi','egg maggi','chicken maggi'],
  'sandwich': ['veg sandwich','chicken sandwich'],
  'soda':     ['lime soda','mint lime soda','ginger soda','jal jeera soda'],
  'ice cream':['vanilla ice cream','strawberry ice cream','chocolate ice cream','butterscotch ice cream','pista ice cream','kulfi ice cream','mango ice cream'],
  'cheap':    ['₹10','₹12','₹15','₹20','₹25','₹30'],
  'zinger':   ['zinger burger','cheese zinger burger'],
  'double':   ['double decker burger'],
  'decker':   ['double decker burger'],
  'special':  ['dolphin special shake','dolphin special burger','special avilmilk','special falooda'],
  'avocado':  ['avacado shake'],
  'pista':    ['pista shake','pista ice cream','pista falooda'],
  'butterscotch': ['butterscotch shake','butterscotch lassi','butterscotch ice cream','butterscotch falooda'],
  'oreo':     ['oreo shake'],
  'kitkat':   ['kitkat shake'],
  'dragon':   ['dragon shake'],
  'chicku':   ['chicku shake'],
  'sharja':   ['sharja shake'],
  'kulfi':    ['kulfi shake','kulfi ice cream'],
  'boost':    ['boost shake','boost'],
  'badam':    ['badam shake','badam milk'],
  'anjira':   ['anjira shake'],
  'dates':    ['dates shake'],
  'dubai':    ['dubai shake'],
  'horlicks': ['horlicks shake','horlicks'],
  'dry fruit':['dry fruit shake'],
  'avilmilk': ['avil milk','special avilmilk'],
  'falooda':  ['vanilla falooda','royal falooda','pista falooda','butterscotch falooda','chocolate falooda','mango falooda','strawberry falooda','special falooda'],
};

// Calculate relevance score for a menu item
function calculateRelevanceScore(itemName, categoryTitle, query, expandedTerms) {
  const name = itemName.toLowerCase();
  const cat = categoryTitle.toLowerCase();
  const q = query.toLowerCase();
  let score = 0;
  
  // Priority 1: Exact match (highest score)
  if (name === q) score += 100;
  // Priority 2: Name starts with query
  else if (name.startsWith(q)) score += 80;
  // Priority 3: Exact word match in name
  else if (name.split(/\s+/).some(word => word === q)) score += 70;
  // Priority 4: Name contains query as whole word
  else if (name.includes(` ${q} `) || name.startsWith(`${q} `) || name.endsWith(` ${q}`)) score += 60;
  // Priority 5: Name contains query
  else if (name.includes(q)) score += 40;
  
  // Priority 6: Alias matches
  if (expandedTerms.some(term => name.includes(term.toLowerCase()) || term.toLowerCase().includes(name))) {
    score += 25;
  }
  
  // Priority 7: Category match
  if (cat.includes(q)) score += 15;
  
  // Bonus: Shorter names get slight priority for exact matches
  if (score > 50 && name.length < 15) score += 5;
  
  return score;
}

// Fuzzy match: checks if all chars of query appear in-order in target
function fuzzyMatch(target, query) {
  if (!query) return true;
  target = target.toLowerCase();
  query = query.toLowerCase();
  
  // 1. exact substring
  if (target.includes(query)) return true;
  
  // 2. every word in query appears somewhere in target
  const words = query.split(/\s+/).filter(Boolean);
  if (words.length > 1 && words.every(w => target.includes(w))) return true;
  
  // 3. character-order fuzzy (only for single word queries ≥ 3 chars)
  if (words.length === 1 && query.length >= 3) {
    let qi = 0;
    for (let ci = 0; ci < target.length && qi < query.length; ci++) {
      if (target[ci] === query[qi]) qi++;
    }
    if (qi === query.length) return true;
  }
  return false;
}

// Highlight matched substring inside .i-name span
function highlightText(nameEl, query) {
  const original = nameEl.getAttribute('data-original') || nameEl.textContent.trim();
  nameEl.setAttribute('data-original', original);
  if (!query) { 
    nameEl.innerHTML = original; 
    return; 
  }
  
  const q = query.toLowerCase();
  const lowerOriginal = original.toLowerCase();
  const idx = lowerOriginal.indexOf(q);
  
  if (idx === -1) { 
    nameEl.innerHTML = original; 
    return; 
  }
  
  nameEl.innerHTML =
    original.slice(0, idx) +
    `<mark style="background:rgba(255,206,0,.45);color:#fff;border-radius:4px;padding:0 3px;font-weight:600;">${original.slice(idx, idx + q.length)}</mark>` +
    original.slice(idx + q.length);
}

// Result counter pill
function updateResultCount(total, q) {
  let pill = document.getElementById('searchResultPill');
  if (!pill) {
    pill = document.createElement('div');
    pill.id = 'searchResultPill';
    pill.style.cssText = 'position:absolute;right:14px;top:50%;transform:translateY(-50%);font-family:Righteous,cursive;font-size:.72rem;padding:3px 10px;border-radius:50px;pointer-events:none;transition:all .3s;z-index:10;';
    const wrap = document.querySelector('.search-wrap');
    if (wrap) { wrap.style.position = 'relative'; wrap.appendChild(pill); }
  }
  if (!q) { pill.style.display = 'none'; return; }
  pill.style.display = 'block';
  if (total === 0) {
    pill.style.background = 'rgba(255,92,92,.2)'; 
    pill.style.color = '#FF5C5C';
    pill.textContent = 'No results';
  } else {
    pill.style.background = 'rgba(0,212,200,.2)'; 
    pill.style.color = '#00D4C8';
    pill.textContent = `${total} item${total !== 1 ? 's' : ''} found`;
  }
}

let searchDebounce;
function filterMenu(rawQ) {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => _doSearch(rawQ), 100);
}

function _doSearch(rawQ) {
  const q = rawQ.trim();
  const hasQuery = q.length > 0;
  const queryLower = q.toLowerCase();
  let total = 0;
  const allVisibleItems = [];

  // Build expanded terms from aliases
  const expandedTerms = [queryLower];
  if (hasQuery && SEARCH_ALIASES[queryLower]) {
    expandedTerms.push(...SEARCH_ALIASES[queryLower]);
  }
  // Also check partial alias keys
  Object.entries(SEARCH_ALIASES).forEach(([key, vals]) => {
    if (key.includes(queryLower) || queryLower.includes(key)) {
      expandedTerms.push(...vals);
    }
  });

  // First pass: collect all matching items with scores
  document.querySelectorAll('.cat-card').forEach(card => {
    const catTitle = (card.querySelector('.c-title')?.textContent || '').toLowerCase();
    
    card.querySelectorAll('.menu-item').forEach(item => {
      const nameEl = item.querySelector('.i-name');
      const rawName = (nameEl?.getAttribute('data-original') || nameEl?.textContent || '').trim();
      const itemName = rawName.toLowerCase();
      
      let matches = false;
      let score = 0;
      
      if (hasQuery) {
        // Check direct match
        if (itemName.includes(queryLower) || fuzzyMatch(itemName, queryLower)) {
          matches = true;
          score = calculateRelevanceScore(itemName, catTitle, queryLower, expandedTerms);
        }
        // Check against expanded terms
        else if (expandedTerms.some(term => fuzzyMatch(itemName, term))) {
          matches = true;
          score = 25;
        }
        // Check category match
        else if (fuzzyMatch(catTitle, queryLower)) {
          matches = true;
          score = 15;
        }
      } else {
        matches = true;
        score = 0;
      }
      
      if (matches) {
        allVisibleItems.push({
          element: item,
          card: card,
          nameEl: nameEl,
          rawName: rawName,
          score: score,
          cardScore: score
        });
      }
    });
  });

  // Sort items by relevance score (highest first)
  allVisibleItems.sort((a, b) => b.score - a.score);

  // Hide all items first, then show only matching items
  document.querySelectorAll('.cat-card').forEach(card => {
    card.querySelectorAll('.menu-item').forEach(item => {
      item.classList.add('hidden');
    });
  });

  // Show matching items in sorted order and track visible items per card
  const visiblePerCard = new Map();
  
  allVisibleItems.forEach(item => {
    item.element.classList.remove('hidden');
    if (item.nameEl) highlightText(item.nameEl, q);
    visiblePerCard.set(item.card, (visiblePerCard.get(item.card) || 0) + 1);
  });

  // Update card visibility and opacity
  document.querySelectorAll('.cat-card').forEach(card => {
    const visibleCount = visiblePerCard.get(card) || 0;
    const hasVisibleItems = visibleCount > 0;
    
    if (hasQuery) {
      card.style.opacity = hasVisibleItems ? '1' : '0.3';
      card.style.transform = hasVisibleItems ? '' : 'scale(0.97)';
      if (hasVisibleItems) card.classList.remove('collapsed');
    } else {
      card.style.opacity = '1';
      card.style.transform = '';
    }
    
    total += visibleCount;
  });

  // Update no results message
  const noRes = document.getElementById('noResults');
  if (noRes) {
    noRes.style.display = (total === 0 && hasQuery) ? 'block' : 'none';
  }
  
  updateResultCount(total, q);
  
  // If there are results, scroll to the first matching item after a short delay
  if (total > 0 && hasQuery && allVisibleItems.length > 0) {
    setTimeout(() => {
      const firstItem = allVisibleItems[0].element;
      if (firstItem) {
        firstItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add temporary highlight effect
        firstItem.style.transition = 'background 0.3s';
        firstItem.style.background = 'rgba(255,206,0,.2)';
        setTimeout(() => {
          firstItem.style.background = '';
        }, 1000);
      }
    }, 150);
  }
}

// Export functions to global scope
window.filterMenu = filterMenu;
window.navClick = navClick;
window.toggleCard = toggleCard;
window.tapItem = tapItem;
window.buildHours = buildHours;
window.loadMap = loadMap;
window.openDirections = openDirections;
window.shareWhatsApp = shareWhatsApp;
window.copyAddress = copyAddress;
window.callUs = callUs;
window.showToast = showToast;

function navClick(el, id) { 
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active')); 
  el.classList.add('active'); 
  const target = document.getElementById(id);
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' }); 
}

function toggleCard(hdr, e) { 
  const card = hdr.closest('.cat-card'); 
  card.classList.toggle('collapsed'); 
  const ripple = document.createElement('div'); 
  ripple.className = 'ripple'; 
  const rect = hdr.getBoundingClientRect(); 
  const size = Math.max(rect.width, rect.height); 
  ripple.style.cssText = `width:${size}px;height:${size}px;top:${e.clientY - rect.top - size / 2}px;left:${e.clientX - rect.left - size / 2}px;position:absolute;`; 
  hdr.appendChild(ripple); 
  setTimeout(() => ripple.remove(), 560); 
}

function tapItem(el) { 
  const name = el.querySelector('.i-name')?.textContent; 
  const price = el.querySelector('.price')?.textContent; 
  showToast(`✅ ${name} - ${price}`); 
}

// Location Functions
function buildHours() { 
  const hoursData = [{ day: 'Monday', open: '9:00 AM', close: '10:30 PM' }, 
    { day: 'Tuesday', open: '9:00 AM', close: '10:30 PM' }, 
    { day: 'Wednesday', open: '9:00 AM', close: '10:30 PM' }, 
    { day: 'Thursday', open: '9:00 AM', close: '10:30 PM' }, 
    { day: 'Friday', open: '9:00 AM', close: '11:00 PM' }, 
    { day: 'Saturday', open: '8:00 AM', close: '11:30 PM' }, 
    { day: 'Sunday', open: '8:00 AM', close: '11:30 PM' }]; 
  const now = new Date(); 
  const todayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()]; 
  const todayData = hoursData.find(h => h.day === todayName); 
  const todayHoursSpan = document.getElementById('todayHours');
  if (todayHoursSpan) {
    todayHoursSpan.innerHTML = `<span style="color:#00E676">🟢 Open</span> · ${todayData.open} – ${todayData.close}`;
  }
  const hoursTable = document.getElementById('hoursTable');
  if (hoursTable) {
    hoursTable.innerHTML = hoursData.map(h => `<div class="hour-row" style="${h.day === todayName ? 'background:rgba(255,206,0,.05);border-radius:8px;' : ''}"><span class="day">${h.day === todayName ? '→ ' : ''}${h.day}</span><span class="time">${h.open} – ${h.close}</span></div>`).join('');
  }
}

function loadMap() { 
  const mapFrame = document.getElementById('mapFrame');
  if (mapFrame) {
    mapFrame.src = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3929.2!2d76.3!3d10.0!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTDCsDAwJzAwLjAiTiA3NsKwMTgnMDAuMCJF!5e0!3m2!1sen!2sin!4v1700000000!5m2!1sen!2sin';
  }
  const overlay = document.querySelector('.map-overlay');
  if (overlay) overlay.style.display = 'none'; 
  showToast('📍 Map loaded!'); 
}

function openDirections() { 
  window.open('https://maps.google.com/?q=Dolphin+Cafe+Kerala+India', '_blank'); 
  showToast('🗺️ Opening Google Maps…'); 
}

function shareWhatsApp() { 
  const msg = encodeURIComponent('🐬 Dolphin Cafe! Fresh juices, shakes, food & more.\n📍 Kerala, India\nMenu: Fresh juices ₹40, Shawarma ₹80, 30+ Shakes available!'); 
  window.open(`https://wa.me/?text=${msg}`, '_blank'); 
}

function copyAddress() { 
  navigator.clipboard.writeText('Dolphin Cafe, Main Road, Near Bus Stand, Kerala, India'); 
  showToast('📋 Address copied!'); 
}

function callUs() { 
  showToast('📞 Call us at +91 98765 43210'); 
}

function showToast(msg) { 
  const toast = document.getElementById('toast'); 
  toast.textContent = msg; 
  toast.classList.add('show'); 
  setTimeout(() => toast.classList.remove('show'), 1700); 
}

// Cursor, Particles, Splash
const dot = document.getElementById('cursorDot'), ring = document.getElementById('cursorRing');
if (dot && ring) {
  document.addEventListener('mousemove', e => { 
    dot.style.left = e.clientX + 'px'; 
    dot.style.top = e.clientY + 'px'; 
    ring.style.left = e.clientX + 'px'; 
    ring.style.top = e.clientY + 'px'; 
  });
}

document.querySelectorAll('.nav-tab, .cat-header, .menu-item, .dolphin-btn, .scroll-top, .share-btn, .dir-btn').forEach(el => { 
  el.addEventListener('mouseenter', () => { 
    if (ring) { 
      ring.style.transform = 'translate(-50%,-50%) scale(1.8)'; 
      ring.style.borderColor = 'rgba(255,206,0,.9)'; 
    } 
  }); 
  el.addEventListener('mouseleave', () => { 
    if (ring) { 
      ring.style.transform = 'translate(-50%,-50%) scale(1)'; 
      ring.style.borderColor = 'rgba(255,206,0,.55)'; 
    } 
  }); 
});

// Particle Canvas
const canvas = document.getElementById('particleCanvas'); 
if (canvas) { 
  const ctx = canvas.getContext('2d'); 
  let W, H, particles = []; 
  function resizeCanvas() { 
    W = canvas.width = window.innerWidth; 
    H = canvas.height = window.innerHeight; 
  } 
  resizeCanvas(); 
  window.addEventListener('resize', resizeCanvas); 
  for (let i = 0; i < 80; i++) particles.push({ 
    x: Math.random() * W, y: Math.random() * H, r: Math.random() * 2 + 0.5,
    vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
    alpha: Math.random() * 0.6 + 0.1, color: Math.random() > 0.5 ? '255,206,0' : '0,212,200'
  }); 
  function drawParticles() { 
    ctx.clearRect(0, 0, W, H); 
    particles.forEach(p => { 
      ctx.beginPath(); 
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); 
      ctx.fillStyle = `rgba(${p.color},${p.alpha})`; 
      ctx.fill(); 
      p.x += p.vx; 
      p.y += p.vy; 
      if (p.x < 0) p.x = W; 
      if (p.x > W) p.x = 0; 
      if (p.y < 0) p.y = H; 
      if (p.y > H) p.y = 0; 
    }); 
    for (let i = 0; i < particles.length; i++) { 
      for (let j = i + 1; j < particles.length; j++) { 
        const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y, d = Math.hypot(dx, dy); 
        if (d < 90) { 
          ctx.beginPath(); 
          ctx.strokeStyle = `rgba(255,206,0,${0.08 * (1 - d / 90)})`; 
          ctx.lineWidth = 0.5; 
          ctx.moveTo(particles[i].x, particles[i].y); 
          ctx.lineTo(particles[j].x, particles[j].y); 
          ctx.stroke(); 
        } 
      } 
    } 
    requestAnimationFrame(drawParticles); 
  } 
  drawParticles(); 
}

// Dolphin Button Animation
const dolphinBtn = document.getElementById('dolphinBtn');
if (dolphinBtn) {
  dolphinBtn.addEventListener('click', function () { 
    const icons = ['🐬', '🌊', '🐠', '🦀', '🐙']; 
    this.textContent = icons[Math.floor(Math.random() * icons.length)]; 
    showToast('Splash! 🌊'); 
  });
}

// Initialize on load
window.addEventListener('load', () => { 
  setTimeout(() => { 
    const splash = document.getElementById('splash'); 
    if (splash) { 
      splash.classList.add('hide'); 
      setTimeout(() => splash.remove(), 750); 
    } 
  }, 2000); 
  buildHours(); 
});

// Scroll Spy
const sections = ['drinks', 'shakes', 'mojitos', 'specials', 'shawarma', 'food', 'tea']; 
window.addEventListener('scroll', () => { 
  let current = ''; 
  sections.forEach(id => { 
    const el = document.getElementById(id); 
    if (el && window.scrollY >= el.offsetTop - 140) current = id; 
  }); 
  document.querySelectorAll('.nav-tab').forEach(t => { 
    t.classList.toggle('active', t.dataset.target === current); 
  }); 
});

// Intersection Observer for fade-in
const observer = new IntersectionObserver(entries => { 
  entries.forEach(entry => { 
    if (entry.isIntersecting) { 
      entry.target.classList.add('visible'); 
      entry.target.querySelectorAll('.cat-card').forEach((c, i) => setTimeout(() => c.classList.add('visible'), i * 70)); 
    } 
  }); 
}, { threshold: 0.05 }); 
document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));