const STORAGE_KEYS = {
  wardrobe: "mf_wardrobe",
  avatar: "mf_profile_img",
  location: "mf_location_label",
  ootd: "mf_ootd_entries"
};

const HERO_IMAGES = [
  "https://g-2606.img.wecandeo.com/codi/15d46621279c62be87262887b6894b73.jpg",
  "https://g-2606.img.wecandeo.com/codi/d41b1e543bd86bf2e204206941013e54.jpg",
  "https://g-2606.img.wecandeo.com/codi/43842023a66cfc6ab84da1827f03dda8.jpg",
  "https://g-2606.img.wecandeo.com/codi/ce239eaef149aaa4d45fcb8c89b86c42.jpg"
];

const state = {
  profile: null,
  weather: null,
  wardrobe: [],
  recommendations: [],
  selectedCardId: null,
  conditions: {
    destination: "daycare",
    activity: "indoor",
    condition: "normal",
    dismissal: "17"
  },
  feedback: {
    temperature: null,
    comfort: null,
    status: []
  },
  ootdEntries: []
};

const elements = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  attachEvents();
  setTodayDate();
  hydrateLocalState();
  loadInitialData();
  attemptGeolocation();
});

function cacheElements() {
  elements.currentLocation = document.getElementById("currentLocation");
  elements.locationReadonly = document.getElementById("locationReadonly");
  elements.locationSearch = document.getElementById("locationSearch");
  elements.locationInput = document.getElementById("locationInput");
  elements.locationSearchTrigger = document.getElementById("locationSearchTrigger");
  elements.locationQuery = document.getElementById("locationQuery");
  elements.locationSearchBtn = document.getElementById("locationSearchBtn");
  elements.locationResults = document.getElementById("locationResults");
  elements.locationModal = document.getElementById("locationModal");
  elements.weatherBar = document.getElementById("weatherBar");
  elements.weatherBadges = document.getElementById("weatherBadges");
  elements.tempNow = document.getElementById("tempNow");
  elements.feelsLike = document.getElementById("feelsLike");
  elements.weatherIcon = document.getElementById("weatherIcon");
  elements.wardrobeSummary = document.getElementById("wardrobeSummary");
  elements.wardrobeTags = document.getElementById("wardrobeTags");
  elements.dailyCards = document.getElementById("dailyCards");
  elements.selectedCardLabel = document.getElementById("selectedCardLabel");
  elements.feedbackSubmit = document.getElementById("feedbackSubmit");
  elements.laundryToggle = document.getElementById("laundryToggle");
  elements.toast = document.getElementById("toast");
  elements.galleryGrid = document.getElementById("galleryGrid");
  elements.ootdPreview = document.getElementById("ootdPreview");
  elements.checklistItems = document.getElementById("checklistItems");
  elements.seasonToggle = document.getElementById("seasonToggle");
}

function attachEvents() {
  if (elements.locationSearchTrigger) {
    elements.locationSearchTrigger.addEventListener("click", () => {
      openLocationModal(elements.locationInput.value.trim());
    });
  }

  if (elements.locationSearchBtn) {
    elements.locationSearchBtn.addEventListener("click", () => {
      executeLocationSearch(elements.locationQuery.value.trim());
    });
  }

  if (elements.locationQuery) {
    elements.locationQuery.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        executeLocationSearch(elements.locationQuery.value.trim());
      }
    });
  }

  if (elements.locationResults) {
    elements.locationResults.addEventListener("click", (event) => {
      if (event.target.matches("button[data-location]")) {
        applyLocationSelection(event.target.dataset.location);
      }
    });
  }

  document
    .getElementById("avatarTrigger")
    .addEventListener("click", () =>
      document.getElementById("avatarInput").click()
    );

  document
    .getElementById("avatarInput")
    .addEventListener("change", handleAvatarUpload);

  document
    .getElementById("profileEditBtn")
    .addEventListener("click", () =>
      showToast("데모에서는 data/profile.json을 수정해 주세요.")
    );

  document
    .getElementById("openWardrobeModal")
    .addEventListener("click", () => openModal("wardrobeModal"));

  document.querySelectorAll(".modal-close").forEach((btn) => {
    btn.addEventListener("click", (event) =>
      closeModal(event.target.dataset.close)
    );
  });

  document
    .getElementById("wardrobeForm")
    .addEventListener("submit", handleWardrobeSubmit);

  document
    .getElementById("conditionsForm")
    .addEventListener("submit", handleRecommendationRequest);

  document.querySelectorAll(".chip-group").forEach((group) => {
    group.addEventListener("click", (event) => {
      if (event.target.matches(".chip")) {
        const value = event.target.dataset.value;
        const target = group.dataset.target;
        if (!value || !target) return;
        group.querySelectorAll(".chip").forEach((chip) =>
          chip.classList.toggle("active", chip === event.target)
        );
        state.conditions[target] = value;
      }
    });
  });

  document
    .getElementById("dismissal")
    .addEventListener("change", (event) => {
      state.conditions.dismissal = event.target.value;
    });

  elements.feedbackSubmit.addEventListener("click", applyFeedback);

  elements.laundryToggle.addEventListener("change", () => {
    if (!state.selectedCardId) {
      elements.laundryToggle.checked = false;
      showToast("먼저 추천 카드를 선택해 주세요.");
      return;
    }
    toggleLaundryForSelection(elements.laundryToggle.checked);
  });

  document
    .getElementById("ootdGalleryBtn")
    .addEventListener("click", () => {
      renderOotdGallery();
      openModal("galleryModal");
    });

  document
    .getElementById("triggerOotdCapture")
    .addEventListener("click", () =>
      document.getElementById("ootdInput").click()
    );

  document
    .getElementById("ootdInput")
    .addEventListener("change", handleOotdCapture);

  document.getElementById("feedbackPanel").addEventListener("click", (event) => {
    if (!state.selectedCardId) return;
    if (event.target.matches(".chip")) {
      const group = event.target.closest(".chip-group");
      if (!group) return;
      group.querySelectorAll(".chip").forEach((chip) =>
        chip.classList.toggle("active", chip === event.target)
      );
      const value = event.target.dataset.value;
      const target = group.dataset.target;
      state.feedback[target] = value;
      updateFeedbackButton();
    }
  });

  document
    .getElementById("statusChecks")
    .addEventListener("change", (event) => {
      const values = Array.from(
        document.querySelectorAll("#statusChecks input:checked")
      ).map((input) => input.value);
      state.feedback.status = values;
    });

  if (elements.seasonToggle) {
    elements.seasonToggle.addEventListener("click", (event) => {
      if (!event.target.matches(".pill")) return;
      elements.seasonToggle.querySelectorAll(".pill").forEach((pill) =>
        pill.classList.toggle("active", pill === event.target)
      );
    });
  }
}

function setTodayDate() {
  const formatter = new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short"
  });
  document.getElementById("todayDate").textContent = formatter.format(new Date());
}

function hydrateLocalState() {
  const savedLocation = localStorage.getItem(STORAGE_KEYS.location);
  if (savedLocation) {
    setLocationLabel(savedLocation);
  } else {
    setLocationLabel("성남시 중원구 성남동");
  }
  const wardrobe = localStorage.getItem(STORAGE_KEYS.wardrobe);
  if (wardrobe) state.wardrobe = JSON.parse(wardrobe);
  const avatar = localStorage.getItem(STORAGE_KEYS.avatar);
  if (avatar) {
    updateAvatarPreview(avatar);
  }
  const ootd = localStorage.getItem(STORAGE_KEYS.ootd);
  if (ootd) {
    state.ootdEntries = JSON.parse(ootd);
    renderOotdGallery();
    if (state.ootdEntries.length) {
      updateOotdPreview(state.ootdEntries[0]);
    }
  }
}

async function loadInitialData() {
  try {
    const [profile, weather, wardrobe] = await Promise.all([
      fetch("data/profile.json").then((res) => res.json()),
      fetch("data/weather.json").then((res) => res.json()),
      fetch("data/wardrobe.json").then((res) => res.json())
    ]);
    state.profile = profile;
    state.weather = weather;
    if (!state.wardrobe.length) {
      state.wardrobe = wardrobe;
      syncWardrobe();
    }
    renderProfile(profile);
    renderWeather(weather);
    renderWardrobeSummary();
    renderChecklist();
  } catch (error) {
    console.error(error);
    showToast("데이터를 불러오지 못했어요.");
  }
}

function setLocationLabel(label) {
  state.locationLabel = label;
  localStorage.setItem(STORAGE_KEYS.location, label);
  if (elements.currentLocation) elements.currentLocation.textContent = label;
  if (elements.locationReadonly) elements.locationReadonly.value = label;
  if (elements.locationInput) elements.locationInput.value = label;
}

function attemptGeolocation() {
  if (!navigator.geolocation) {
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      const label = `위도 ${latitude.toFixed(3)}, 경도 ${longitude.toFixed(3)}`;
      setLocationLabel(label);
    },
    () => {
      // ignore permission denial; fallback already set
    },
    { timeout: 5000 }
  );
}

function openLocationModal(seedQuery = "") {
  openModal("locationModal");
  if (!elements.locationQuery) return;
  elements.locationQuery.value = seedQuery;
  if (seedQuery) {
    executeLocationSearch(seedQuery);
  } else {
    renderLocationResults([], true);
  }
}

async function executeLocationSearch(query) {
  if (!elements.locationResults) return;
  if (!query) {
    renderLocationResults([], true);
    showToast("검색어를 입력해 주세요.");
    return;
  }
  renderLocationResults([{ loading: true }]);
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&countrycodes=kr&q=${encodeURIComponent(
      query
    )}`;
    const response = await fetch(url, {
      headers: { "Accept-Language": "ko" }
    });
    if (!response.ok) throw new Error("위치 검색 실패");
    const results = await response.json();
    renderLocationResults(results);
  } catch (error) {
    console.error(error);
    renderLocationResults([], false, true);
    showToast("위치 검색 중 오류가 발생했어요.");
  }
}

function renderLocationResults(results = [], isPlaceholder = false, isError = false) {
  if (!elements.locationResults) return;
  if (results.length === 0) {
    const message = isPlaceholder
      ? "검색어를 입력해 주세요."
      : isError
        ? "검색 중 오류가 발생했어요."
        : "검색 결과가 없습니다.";
    elements.locationResults.innerHTML = `<li class="empty">${message}</li>`;
    return;
  }
  if (results[0]?.loading) {
    elements.locationResults.innerHTML = `<li class="empty">검색 중...</li>`;
    return;
  }
  elements.locationResults.innerHTML = results
    .map((item) => {
      const label = formatLocationLabel(item);
      const full = item.display_name || label;
      const payload = encodeURIComponent(
        JSON.stringify({ label, full })
      );
      return `
        <li>
          <div>
            <strong>${label}</strong>
            <small>${full}</small>
          </div>
          <button data-location="${payload}">선택</button>
        </li>
      `;
    })
    .join("");
}

function applyLocationSelection(data) {
  const decoded = typeof data === "string" ? JSON.parse(decodeURIComponent(data)) : data;
  const label = decoded.label || decoded.full;
  setLocationLabel(label);
  if (elements.locationInput) elements.locationInput.value = label;
  closeModal("locationModal");
  showToast("위치가 업데이트되었어요.");
}

function formatLocationLabel(result) {
  if (!result) return "";
  if (result.address) {
    const { city, town, village, suburb, road, neighbourhood } = result.address;
    const parts = [city || town || village || suburb, road || neighbourhood].filter(Boolean);
    if (parts.length) return parts.join(" ");
  }
  return result.display_name?.split(",").slice(0, 2).join(", ") ?? "선택한 위치";
}

function renderProfile(profile) {
  document.getElementById("childName").textContent = profile.name;
  document.getElementById("childAge").textContent = `${profile.age}세`;
  document.getElementById(
    "childStats"
  ).textContent = `${profile.height}cm / ${profile.weight}kg`;
  document.getElementById("profileNotes").textContent = profile.notes || "";
  const badge = document.getElementById("genderBadge");
  badge.textContent = profile.gender === "boy" ? "♂" : "♀";
  badge.style.background =
    profile.gender === "boy" ? "var(--blue)" : "var(--lavender)";
  const ruleContainer = document.getElementById("daycareRules");
  ruleContainer.innerHTML = "";
  (profile.daycareRules || []).forEach((rule) => {
    const span = document.createElement("span");
    span.className = "rule-badge";
    span.textContent = rule;
    ruleContainer.appendChild(span);
  });
}

function renderWeather(weather) {
  const iconMap = {
    sunny: "☀️",
    rain: "🌧️",
    cloudy: "☁️",
    "cloudy-day": "🌤️",
    snow: "❄️"
  };
  elements.weatherIcon.textContent = iconMap[weather.icon] || "🌤️";
  elements.tempNow.textContent = `${weather.temp}°`;
  elements.feelsLike.textContent = `체감 ${weather.feelsLike}°`;
  elements.weatherBadges.innerHTML = "";
  const badges = [
    `강수 ${weather.rainChance}%`,
    `미세먼지 ${weather.fineDust}`,
    `UV ${weather.uvIndex}`
  ];
  badges.forEach((text) => {
    const badge = document.createElement("span");
    badge.className = "weather-badge";
    badge.textContent = text;
    elements.weatherBadges.appendChild(badge);
  });
}

function renderWardrobeSummary() {
  const summary = state.wardrobe.reduce(
    (acc, item) => {
      acc.total += 1;
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    },
    { total: 0 }
  );
  elements.wardrobeSummary.textContent = `현재 등록된 옷 ${
    summary.total
  }벌 (상의 ${summary.top || 0} / 하의 ${summary.bottom || 0} / 아우터 ${
    summary.outer || 0
  } / 실내복 ${summary.innerwear || 0} / 양말 ${summary.socks || 0})`;
  elements.wardrobeTags.innerHTML = "";
  state.wardrobe.slice(0, 12).forEach((item) => {
    const tag = document.createElement("span");
    tag.className = "wardrobe-tag";
    tag.textContent = `${item.name} · ${item.colors.join(", ")}`;
    elements.wardrobeTags.appendChild(tag);
  });
}

function handleAvatarUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const base64 = reader.result;
    localStorage.setItem(STORAGE_KEYS.avatar, base64);
    updateAvatarPreview(base64);
    showToast("프로필 사진이 저장되었어요.");
  };
  reader.readAsDataURL(file);
}

function updateAvatarPreview(src) {
  const avatar = document.getElementById("avatarPreview");
  avatar.innerHTML = `<img src="${src}" alt="프로필 이미지" />`;
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.setAttribute("aria-hidden", "false");
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.setAttribute("aria-hidden", "true");
}

function handleWardrobeSubmit(event) {
  event.preventDefault();
  const name = document.getElementById("itemName").value.trim();
  const category = document.getElementById("itemCategory").value;
  const warmth = Number(document.getElementById("itemWarmth").value || 3);
  const material =
    document.getElementById("itemMaterial").value.trim() || "cotton";
  const colors = document
    .getElementById("itemColors")
    .value.split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  const selectedSeason =
    elements.seasonToggle?.querySelector(".pill.active")?.dataset.season ||
    "spring";
  const seasons = [selectedSeason];
  const file = document.getElementById("itemImage").files?.[0];
  const newItem = {
    id: `${category}-${Date.now()}`,
    name,
    category,
    season: seasons.length ? seasons : ["all"],
    warmthLevel: warmth,
    material,
    colors: colors.length ? colors : ["cream"],
    isLaundry: false,
    sizeStatus: "ok",
    wearCount: 0,
    lastFeedback: { comfort: "good", temperature: "ok" },
    image: null
  };
  const finalize = () => {
    state.wardrobe.unshift(newItem);
    syncWardrobe();
    renderWardrobeSummary();
    closeModal("wardrobeModal");
    event.target.reset();
    if (elements.seasonToggle) {
      const defaultPill = elements.seasonToggle.querySelector(".pill");
      elements.seasonToggle.querySelectorAll(".pill").forEach((pill) =>
        pill.classList.toggle("active", pill === defaultPill)
      );
    }
    showToast("새 옷이 캡슐 옷장에 추가되었어요.");
  };
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      newItem.image = reader.result;
      finalize();
    };
    reader.readAsDataURL(file);
  } else {
    finalize();
  }
}

function syncWardrobe() {
  localStorage.setItem(STORAGE_KEYS.wardrobe, JSON.stringify(state.wardrobe));
}

function handleRecommendationRequest(event) {
  event.preventDefault();
  if (!state.weather) {
    showToast("날씨 정보를 불러오는 중이에요.");
    return;
  }
  elements.dailyCards.classList.add("loading");
  const cards = generateRecommendations();
  state.recommendations = cards;
  renderDailyCards(cards);
  renderChecklist();
  elements.dailyCards.classList.remove("loading");
  showToast("오늘의 코디 카드가 도착했어요!");
}

function generateRecommendations() {
  const { weather, wardrobe, profile, conditions } = state;
  const season = detectSeason(new Date(weather.date || Date.now()));
  const baseWarmth = determineWarmth(weather.feelsLike);
  let targetWarmth = baseWarmth;
  let requireOuter = baseWarmth >= 3;
  if (conditions.activity === "outdoor" || conditions.destination === "outdoor")
    targetWarmth += 1;
  if (conditions.condition === "cold") targetWarmth += 1;
  if (conditions.condition === "sensitive") targetWarmth -= 0.5;
  if (weather.rainChance >= 50 || weather.fineDust === "나쁨") requireOuter = true;
  const allergies = profile?.allergies || [];
  const filtered = wardrobe.filter((item) => {
    if (item.isLaundry) return false;
    if (item.sizeStatus === "warning" || item.sizeStatus === "small")
      return false;
    if (conditions.condition === "sensitive" && item.material === "wool")
      return false;
    if (allergies.includes(item.material)) return false;
    if (
      !item.season.includes("all") &&
      !item.season.includes(season) &&
      season !== "all"
    )
      return false;
    return true;
  });
  const categories = {
    top: [],
    bottom: [],
    outer: [],
    innerwear: [],
    socks: []
  };
  filtered.forEach((item) => {
    if (!categories[item.category]) categories[item.category] = [];
    categories[item.category].push(item);
  });
  const sorted = {};
  Object.keys(categories).forEach((key) => {
    sorted[key] = categories[key].sort(
      (a, b) => scoreItem(b, targetWarmth) - scoreItem(a, targetWarmth)
    );
  });
  const combos = [];
  for (let i = 0; i < 3; i += 1) {
    const comboItems = [];
    const top = sorted.top[i % sorted.top.length];
    const bottom = sorted.bottom[i % sorted.bottom.length];
    if (top) comboItems.push(top);
    if (bottom) comboItems.push(bottom);
    if (requireOuter && sorted.outer.length) {
      comboItems.push(sorted.outer[i % sorted.outer.length]);
    }
    if (targetWarmth >= 4 && sorted.innerwear.length) {
      comboItems.push(sorted.innerwear[i % sorted.innerwear.length]);
    }
    if (sorted.socks.length) {
      comboItems.push(sorted.socks[i % sorted.socks.length]);
    }
    if (!comboItems.length) continue;
    const palette = comboItems.flatMap((item) => item.colors);
    const colorScoreInfo = getColorScore(palette);
    const heroImage = HERO_IMAGES[i % HERO_IMAGES.length];
    combos.push({
      id: `card-${Date.now()}-${i}`,
      title: `추천 코디 #${i + 1}`,
      items: comboItems,
      warmth: targetWarmth,
      colorScore: colorScoreInfo.score,
      toneTag: colorScoreInfo.tag,
      badges: buildWeatherBadges(weather, comboItems),
      warning: comboItems.some((item) => item.sizeStatus === "warning"),
      palette,
      heroImage
    });
  }
  return combos;
}

function determineWarmth(feelsLike) {
  if (feelsLike <= 0) return 5;
  if (feelsLike <= 10) return 4;
  if (feelsLike <= 18) return 3;
  if (feelsLike <= 25) return 2;
  return 1;
}

function scoreItem(item, target) {
  let score = 70 - Math.abs(item.warmthLevel - target) * 8;
  if (item.lastFeedback.temperature === "hot" && target < item.warmthLevel) {
    score -= 6;
  }
  if (item.lastFeedback.temperature === "cold" && target > item.warmthLevel) {
    score -= 4;
  }
  if (item.lastFeedback.comfort === "good") score += 6;
  score -= item.wearCount * 0.3;
  return score;
}

function getColorScore(colors) {
  const pastel = ["cream", "mint", "lavender", "sky", "peach", "oat", "sand"];
  const unique = [...new Set(colors)];
  let score = 80;
  let tag = "톤온톤";
  const pastelCount = unique.filter((color) => pastel.includes(color)).length;
  if (pastelCount === unique.length) {
    score += 12;
  } else if (unique.length > 2) {
    score -= 6;
    tag = "컬러 믹스";
  }
  if (unique.includes("navy") && unique.includes("cream")) {
    score += 5;
    tag = "포인트 컬러";
  }
  return { score: Math.min(100, score), tag };
}

function buildWeatherBadges(weather, items) {
  const badges = [`체감 ${weather.feelsLike}°`, `강수 ${weather.rainChance}%`];
  if (weather.fineDust === "나쁨") badges.push("미세먼지 주의");
  if (weather.uvIndex >= 7) badges.push("UV 차단");
  if (items.some((item) => item.material === "fleece")) badges.push("포근해요");
  if (items.some((item) => item.material === "linen"))
    badges.push("통풍 좋은 소재");
  return badges;
}

function detectSeason(date) {
  const month = date.getMonth() + 1;
  if ([12, 1, 2].includes(month)) return "winter";
  if ([3, 4, 5].includes(month)) return "spring";
  if ([6, 7, 8].includes(month)) return "summer";
  if ([9, 10, 11].includes(month)) return "fall";
  return "all";
}

function renderDailyCards(cards) {
  elements.dailyCards.innerHTML = "";
  if (!cards.length) {
    elements.dailyCards.innerHTML =
      '<p class="hint">조건에 맞는 옷이 부족해요. 세탁 상태를 확인해 주세요.</p>';
    return;
  }
  cards.forEach((card, index) => {
    const cardEl = document.createElement("article");
    cardEl.className = "outfit-card";
    cardEl.dataset.cardId = card.id;
    cardEl.style.animation = `fadeUp 0.5s ease ${index * 0.08}s both`;
    cardEl.innerHTML = `
      <p class="card-title">${card.title}</p>
      ${
        card.heroImage
          ? `<div class="card-hero"><img src="${card.heroImage}" alt="${card.title} 대표 이미지" loading="lazy"/></div>`
          : ""
      }
      ${
        card.warning
          ? '<span class="badge warning">사이즈 점검 권장</span>'
          : ""
      }
      <div class="card-items">
        ${card.items
          .map((item) => createItemChipMarkup(item))
          .join("")}
      </div>
      <div class="score-row">
        <span class="score">${card.colorScore}/100</span>
        <span class="tone-tag">${card.toneTag}</span>
      </div>
      <div class="badge-row">
        ${card.badges.map((text) => `<span class="badge">${text}</span>`).join("")}
      </div>
      <button class="select-card-btn">이 코디로 선택</button>
    `;
    cardEl.addEventListener("click", (event) => {
      if (!(event.target.matches("button") || event.currentTarget)) return;
      selectCard(card.id);
    });
    elements.dailyCards.appendChild(cardEl);
  });
}

function createItemChipMarkup(item) {
  const iconMap = {
    top: "👕",
    bottom: "👖",
    outer: "🧥",
    innerwear: "👶",
    socks: "🧦"
  };
  const image = item.image
    ? `<div class="thumb"><img src="${item.image}" alt="${item.name}" /></div>`
    : `<div class="thumb">${iconMap[item.category] || "👚"}</div>`;
  const labels = [
    item.material,
    `보온 ${item.warmthLevel}`,
    item.colors.slice(0, 2).join("/")
  ].join(" · ");
  return `
    <div class="item-chip">
      ${image}
      <strong>${item.name}</strong>
      <small>${labels}</small>
    </div>
  `;
}

function selectCard(cardId) {
  state.selectedCardId = cardId;
  elements.dailyCards.querySelectorAll(".outfit-card").forEach((card) => {
    const isSelected = card.dataset.cardId === cardId;
    card.classList.toggle("selected", isSelected);
    card.classList.toggle("dimmed", !isSelected);
  });
  const selected = state.recommendations.find((card) => card.id === cardId);
  elements.selectedCardLabel.textContent = `${selected.title}을(를) 선택했어요.`;
  elements.laundryToggle.checked = selected.items.some((item) => item.isLaundry);
  resetFeedbackInputs();
  updateFeedbackButton();
  renderChecklist(selected);
}

function resetFeedbackInputs() {
  state.feedback = { temperature: null, comfort: null, status: [] };
  document
    .querySelectorAll("#feedbackPanel .chip-group .chip")
    .forEach((chip) => chip.classList.remove("active"));
  document.querySelectorAll("#statusChecks input").forEach((input) => {
    input.checked = false;
  });
}

function updateFeedbackButton() {
  const enabled =
    state.selectedCardId && state.feedback.temperature && state.feedback.comfort;
  elements.feedbackSubmit.disabled = !enabled;
  elements.feedbackSubmit.classList.toggle("active", enabled);
}

function applyFeedback() {
  if (!state.selectedCardId) return;
  const selected = state.recommendations.find(
    (card) => card.id === state.selectedCardId
  );
  if (!selected) return;
  selected.items.forEach((item) => {
    const wardrobeItem = state.wardrobe.find((w) => w.id === item.id);
    if (!wardrobeItem) return;
    wardrobeItem.wearCount += 1;
    wardrobeItem.lastFeedback = {
      comfort: state.feedback.comfort,
      temperature: state.feedback.temperature
    };
    if (
      state.feedback.status.includes("laundry") ||
      elements.laundryToggle.checked
    ) {
      wardrobeItem.isLaundry = true;
    }
  });
  syncWardrobe();
  renderWardrobeSummary();
  showToast("오늘 피드백이 기록되었어요.");
  elements.feedbackSubmit.disabled = true;
}

function toggleLaundryForSelection(isLaundry) {
  const selected = state.recommendations.find(
    (card) => card.id === state.selectedCardId
  );
  if (!selected) return;
  selected.items.forEach((item) => {
    const wardrobeItem = state.wardrobe.find((w) => w.id === item.id);
    if (wardrobeItem) wardrobeItem.isLaundry = isLaundry;
  });
  syncWardrobe();
  showToast(isLaundry ? "세탁 바구니로 이동했어요." : "세탁 상태를 해제했어요.");
}

function renderChecklist(selectedCard) {
  const weather = state.weather;
  const items = [
    { id: "spare", label: "여벌 옷", checked: true },
    { id: "diaper", label: "기저귀 / 속옷", checked: false },
    { id: "towel", label: "손수건", checked: false },
    { id: "outer", label: "겉옷 / 모자", checked: false },
    { id: "indoor", label: "실내화", checked: true },
    { id: "rain", label: "우산 · 우비", checked: false }
  ];
  if (weather.rainChance >= 40) {
    const rain = items.find((item) => item.id === "rain");
    if (rain) {
      rain.checked = true;
      rain.important = true;
    }
  }
  if (weather.uvIndex >= 7) {
    const outer = items.find((item) => item.id === "outer");
    if (outer) {
      outer.checked = true;
      outer.important = true;
      outer.label = "겉옷 / 모자 (UV)";
    }
  }
  if (selectedCard) {
    const hasOuter = selectedCard.items.some(
      (item) => item.category === "outer"
    );
    if (hasOuter) {
      const outer = items.find((item) => item.id === "outer");
      if (outer) outer.checked = true;
    }
    if (
      selectedCard.badges.some((badge) => badge.includes("강수")) &&
      weather.rainChance >= 40
    ) {
      const rain = items.find((item) => item.id === "rain");
      if (rain) rain.checked = true;
    }
  }
  elements.checklistItems.innerHTML = "";
  items.forEach((item) => {
    const li = document.createElement("li");
    if (item.important) li.classList.add("important");
    li.innerHTML = `
      <span>${item.label}</span>
      <input type="checkbox" ${item.checked ? "checked" : ""}/>
    `;
    elements.checklistItems.appendChild(li);
  });
}

function handleOotdCapture(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!state.selectedCardId) {
    showToast("추천 코디를 먼저 선택해 주세요.");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const base64 = reader.result;
    const selected = state.recommendations.find(
      (card) => card.id === state.selectedCardId
    );
    const entry = {
      id: `ootd-${Date.now()}`,
      date: new Date().toISOString(),
      cardTitle: selected?.title ?? "추천 코디",
      feedback: { ...state.feedback },
      image: base64
    };
    state.ootdEntries.unshift(entry);
    localStorage.setItem(STORAGE_KEYS.ootd, JSON.stringify(state.ootdEntries));
    updateOotdPreview(entry);
    showToast("OOTD가 저장되었어요.");
  };
  reader.readAsDataURL(file);
}

function updateOotdPreview(entry) {
  elements.ootdPreview.innerHTML = `
    <img src="${entry.image}" alt="오늘의 착장 미리보기" />
    <p><strong>${entry.cardTitle}</strong> · ${
    entry.feedback.temperature || "기록 없음"
  }</p>
  `;
}

function renderOotdGallery() {
  if (!elements.galleryGrid) return;
  elements.galleryGrid.innerHTML = "";
  if (!state.ootdEntries.length) {
    elements.galleryGrid.innerHTML = "<p>아직 저장된 OOTD가 없어요.</p>";
    return;
  }
  state.ootdEntries.forEach((entry) => {
    const item = document.createElement("div");
    item.className = "gallery-item";
    const date = new Intl.DateTimeFormat("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(entry.date));
    item.innerHTML = `
      <img src="${entry.image}" alt="OOTD ${entry.cardTitle}" />
      <strong>${entry.cardTitle}</strong>
      <span>${date}</span>
      <span>${entry.feedback.temperature || "-"} / ${
      entry.feedback.comfort || "-"
    }</span>
    `;
    elements.galleryGrid.appendChild(item);
  });
}

function showToast(message) {
  if (!elements.toast) return;
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  setTimeout(() => elements.toast.classList.remove("show"), 2000);
}
