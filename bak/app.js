const state = {
  wardrobe: [],
  weather: null,
  profile: null,
  cards: [],
  selectedCard: null,
  checklistItems: [
    { id: 'extra-clothes', label: '여벌 옷', checked: false },
    { id: 'diaper', label: '기저귀', checked: false },
    { id: 'towel', label: '손수건', checked: false },
    { id: 'outer', label: '겉옷', checked: false },
    { id: 'hat', label: '모자', checked: false },
    { id: 'indoor-shoes', label: '실내화', checked: true }
  ]
};

/**
 * JSON 파일을 로드한다.
 * @param {string} path
 * @returns {Promise<any>}
 */
async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} 로딩 실패`);
  return res.json();
}

/**
 * 초기 데이터 로드
 */
async function init() {
  const [wardrobe, weather, profile] = await Promise.all([
    loadJSON('data/wardrobe.json'),
    loadJSON('data/weather.json'),
    loadJSON('data/profile.json')
  ]);
  state.wardrobe = wardrobe;
  state.weather = weather;
  state.profile = profile;
  renderWeather();
  renderProfile();
  renderChecklist();
  bindForm();
  bindFeedback();
  bindOOTD();
}

/**
 * 날씨 요약 렌더링
 */
function renderWeather() {
  const { temp, feelsLike, rainChance, fineDust, uvIndex } = state.weather;
  document.getElementById('temp-value').textContent = temp;
  document.getElementById('feels-like').textContent = feelsLike;
  document.getElementById('rain-tag').textContent = `강수 ${rainChance}%`;
  document.getElementById('dust-tag').textContent = `미세먼지 ${fineDust}`;
  document.getElementById('uv-tag').textContent = `UV ${uvIndex}`;
}

/**
 * 프로필 렌더링
 */
function renderProfile() {
  const { name, age, gender, height, weight, daycareRules } = state.profile;
  document.getElementById('child-name').textContent = `${name} (${gender})`;
  document.getElementById('child-age').textContent = `${age}세`;
  document.getElementById('child-stats').textContent = `키 ${height}cm · 몸무게 ${weight}kg`;
  const rulesEl = document.getElementById('rules-list');
  rulesEl.innerHTML = daycareRules.map(rule => `<span class="tag">${rule}</span>`).join('');
}

/**
 * 폼 상호작용 바인딩
 */
function bindForm() {
  document.querySelectorAll('.toggle-group').forEach(group => {
    group.addEventListener('click', e => {
      if (e.target.tagName !== 'BUTTON') return;
      [...group.children].forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
    });
  });
  document.getElementById('conditions-form').addEventListener('submit', e => {
    e.preventDefault();
    const button = e.target.querySelector('.primary-btn');
    button.classList.add('clicked');
    setTimeout(() => button.classList.remove('clicked'), 200);

    const formData = new FormData(e.target);
    const payload = {
      location: formData.get('location'),
      pickup: formData.get('pickup'),
      destination: getToggleValue('destination'),
      activity: getToggleValue('activity'),
      condition: getToggleValue('condition')
    };
    state.cards = generateRecommendations(payload);
    renderCards();
  });
}

/**
 * 특정 토글 그룹 값 반환
 * @param {string} field
 * @returns {string}
 */
function getToggleValue(field) {
  const group = document.querySelector(`.toggle-group[data-field="${field}"]`);
  return group.querySelector('.active')?.dataset.value || '';
}

/**
 * 추천 카드 생성
 * @param {object} payload
 * @returns {Array}
 */
function generateRecommendations(payload) {
  const candidates = applyRules(state.wardrobe, state.weather, payload);
  const combos = buildCombos(candidates);
  return combos.slice(0, 3);
}

/**
 * 룰 기반 필터 적용
 * @param {Array} wardrobe
 * @param {object} weather
 * @param {object} payload
 * @returns {object}
 */
function applyRules(wardrobe, weather, payload) {
  const feels = weather.feelsLike;
  const needsWarmth = adjustWarmthLevel(feels, payload);
  const filtered = wardrobe.filter(item => {
    if (item.isLaundry) return false;
    if (item.sizeStatus !== 'ok') return false;
    if (payload.condition === 'sensitive' && ['wool', 'fur'].includes(item.material)) return false;
    return true;
  });
  return { items: filtered, needsWarmth };
}

/**
 * 체감온도와 조건으로 레이어 수준 계산
 * @param {number} feels
 * @param {object} payload
 * @returns {number}
 */
function adjustWarmthLevel(feels, payload) {
  let level = 1;
  if (feels <= 0) level = 5;
  else if (feels <= 10) level = 4;
  else if (feels <= 18) level = 3;
  else if (feels <= 25) level = 2;
  else level = 1;

  if (payload.activity === 'outdoor' || payload.destination === 'outdoor') level++;
  if (payload.condition === 'cold') level++;
  return Math.min(level, 5);
}

/**
 * 코디 조합 생성
 * @param {object} candidates
 * @returns {Array}
 */
function buildCombos({ items, needsWarmth }) {
  const tops = items.filter(i => i.category === 'top');
  const bottoms = items.filter(i => i.category === 'bottom');
  const outers = items.filter(i => i.category === 'outer' && i.warmthLevel >= needsWarmth - 1);
  const socks = items.filter(i => i.category === 'socks');

  const combos = [];
  for (let i = 0; i < tops.length && combos.length < 3; i++) {
    const top = tops[i];
    const bottom = bottoms[i % bottoms.length];
    const outer = needsWarmth >= 3 ? outers[i % Math.max(1, outers.length)] : null;
    const sock = socks[i % socks.length];
    const score = calcColorScore(top, bottom, outer);
    combos.push({
      id: `combo-${i}`,
      items: { top, bottom, outer, socks: sock },
      score,
      tags: score > 80 ? ['톤온톤'] : score > 65 ? ['포인트 컬러'] : ['믹스매치'],
      weatherBadge: buildWeatherBadge(state.weather),
      sizeWarning: top.lastFeedback?.comfort === 'bad' ? `${top.name} 사이즈 점검 필요` : ''
    });
  }
  return combos;
}

/**
 * 색상/사용성 점수 계산
 * @returns {number}
 */
function calcColorScore(top, bottom, outer) {
  const colors = [top, bottom, outer].filter(Boolean).flatMap(i => i.colors);
  const uniqueColors = new Set(colors);
  let score = 70;
  if (uniqueColors.size <= 2) score += 15;
  if (uniqueColors.size >= 4) score -= 10;
  if (outer?.material === 'windbreaker') score += 5;
  if (top.lastFeedback?.temperature === 'hot') score -= 5;
  return Math.min(100, Math.max(50, score));
}

/**
 * 날씨 배지 문자열 생성
 */
function buildWeatherBadge(weather) {
  const { feelsLike, rainChance, fineDust, uvIndex } = weather;
  return [
    `체감 ${feelsLike}°`,
    rainChance > 50 ? '우산 필요' : '건조',
    `미세먼지 ${fineDust}`,
    `UV ${uvIndex}`
  ];
}

/**
 * 추천 카드 렌더링
 */
function renderCards() {
  const wrapper = document.getElementById('cards-wrapper');
  const pager = document.getElementById('cards-pager');
  wrapper.innerHTML = '';
  pager.innerHTML = '';

  state.cards.forEach((card, idx) => {
    const cardEl = document.createElement('article');
    cardEl.className = 'card';
    cardEl.style.animationDelay = `${0.05 * idx}s`;
    cardEl.innerHTML = `
      <div class="card-head">
        <h4>추천 코디 #${idx + 1}</h4>
        ${card.sizeWarning ? `<span class="warning-badge">${card.sizeWarning}</span>` : ''}
      </div>
      <div class="items">
        ${renderItemRow(card.items.top, '상의')}
        ${renderItemRow(card.items.bottom, '하의')}
        ${card.items.outer ? renderItemRow(card.items.outer, '겉옷') : ''}
        ${renderItemRow(card.items.socks, '양말')}
      </div>
      <div class="card-footer">
        <div>
          <p class="score">${card.score}/100</p>
          <span class="badge">${card.tags.join(', ')}</span>
        </div>
        <div class="badge">${card.weatherBadge.join(' · ')}</div>
      </div>
    `;
    cardEl.addEventListener('click', () => selectCard(idx));
    wrapper.appendChild(cardEl);

    const dot = document.createElement('button');
    dot.className = idx === 0 ? 'active' : '';
    dot.addEventListener('click', () => selectCard(idx));
    pager.appendChild(dot);
  });

  selectCard(0);
}

/**
 * 아이템 행 HTML
 * @param {object} item
 * @param {string} label
 */
function renderItemRow(item, label) {
  return `
    <div class="item-row">
      <div class="thumbnail">${item ? label : '-'}</div>
      <div class="item-info">
        <strong>${item?.name || '-'}</strong>
        <span>${item?.colors?.join('/') || ''} · ${item?.material || ''} · 두께 ${item?.warmthLevel || ''}</span>
      </div>
    </div>
  `;
}

/**
 * 카드 선택 상태 업데이트
 * @param {number} index
 */
function selectCard(index) {
  state.selectedCard = state.cards[index];
  document.querySelectorAll('.card').forEach((card, idx) => {
    card.classList.toggle('selected', idx === index);
    card.classList.toggle('dimmed', idx !== index);
  });
  document.querySelectorAll('#cards-pager button').forEach((dot, idx) => {
    dot.classList.toggle('active', idx === index);
  });
  document.getElementById('feedback-panel').classList.remove('hidden');
  document.getElementById('size-warning').textContent = state.selectedCard.sizeWarning || '';
  adjustChecklist();
}

/**
 * 체크리스트 렌더링
 */
function renderChecklist() {
  const ul = document.getElementById('checklist');
  ul.innerHTML = state.checklistItems.map(item => `
    <li>
      <input type="checkbox" id="${item.id}" ${item.checked ? 'checked' : ''}>
      <label for="${item.id}">${item.label}</label>
    </li>
  `).join('');
}

/**
 * 추천에 따라 체크리스트 강조
 */
function adjustChecklist() {
  const rain = state.weather.rainChance > 50;
  document.getElementById('outer').checked = !!state.selectedCard.items.outer;
  document.getElementById('hat').checked = state.weather.uvIndex >= 7;
  if (rain) {
    document.getElementById('outer').parentElement.style.color = '#1c7d6d';
  }
}

/**
 * 피드백 이벤트 바인딩
 */
function bindFeedback() {
  document.getElementById('feedback-submit').addEventListener('click', () => {
    showToast();
  });
}

/**
 * 토스트 표시
 */
function showToast() {
  const toast = document.getElementById('toast');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

/**
 * OOTD 업로드 바인딩
 */
function bindOOTD() {
  document.getElementById('ootd-input').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      document.getElementById('ootd-preview').innerHTML = `
        <img src="${evt.target.result}" alt="오늘 OOTD" />
        <p>얼굴은 자동 모자이크 처리된다고 가정해요.</p>
      `;
    };
    reader.readAsDataURL(file);
  });
}

document.addEventListener('DOMContentLoaded', init);

