// ===== Global Variables =====
const jsonData = { essential: null, beginner: null }
const uzJsonData = { essential: null, beginner: null }
const currentState = {
  page: "landing",
  view: "collections",
  collection: null,
  level: null,
  unit: null,
}

// ===== DOM Elements =====
const elements = {
  // Pages
  landingPage: document.getElementById("landing-page"),
  learningPage: document.getElementById("learning-page"),

  // Navigation buttons
  startBtn: document.getElementById("start-btn"),
  tryWebBtn: document.getElementById("try-web-btn"),
  backButton: document.getElementById("back-button"),

  // Content areas
  pageTitle: document.getElementById("page-title"),
  pageSubtitle: document.getElementById("page-subtitle"),
  loadingState: document.getElementById("loading-state"),
  errorState: document.getElementById("error-state"),
  contentArea: document.getElementById("content-area"),

  // Grids
  collectionsGrid: document.getElementById("collections-grid"),
  levelsGrid: document.getElementById("levels-grid"),
  unitsGrid: document.getElementById("units-grid"),
  wordsList: document.getElementById("words-list"),

  // Error elements
  errorMessage: document.getElementById("error-message"),
  retryBtn: document.getElementById("retry-btn"),
}

// ===== Utility Functions =====
const utils = {
  showElement(element) {
    element.classList.remove("hidden")
  },

  hideElement(element) {
    element.classList.add("hidden")
  },

  clearGrids() {
    elements.collectionsGrid.innerHTML = ""
    elements.levelsGrid.innerHTML = ""
    elements.unitsGrid.innerHTML = ""
    elements.wordsList.innerHTML = ""

    utils.hideElement(elements.collectionsGrid)
    utils.hideElement(elements.levelsGrid)
    utils.hideElement(elements.unitsGrid)
    utils.hideElement(elements.wordsList)
  },

  updatePageHeader(title, subtitle) {
    elements.pageTitle.textContent = title
    elements.pageSubtitle.textContent = subtitle
  },

  showLoading() {
    utils.hideElement(elements.contentArea)
    utils.hideElement(elements.errorState)
    utils.showElement(elements.loadingState)
  },

  showError(message = "Ma'lumotlarni yuklashda muammo yuz berdi") {
    utils.hideElement(elements.loadingState)
    utils.hideElement(elements.contentArea)
    utils.showElement(elements.errorState)
    elements.errorMessage.textContent = message
  },

  showContent() {
    utils.hideElement(elements.loadingState)
    utils.hideElement(elements.errorState)
    utils.showElement(elements.contentArea)
  },

  formatNumber(num, digits = 2) {
    return num.toString().padStart(digits, "0")
  },
}

// ===== TTS Functions =====
const tts = {
  isSupported() {
    return "speechSynthesis" in window
  },

  speak(text, lang = "en-US") {
    if (!tts.isSupported()) {
      console.warn("TTS not supported")
      return
    }

    speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    utterance.rate = 0.8
    utterance.pitch = 1
    utterance.volume = 1

    speechSynthesis.speak(utterance)
  },

  createButton(text, className = "") {
    const cleanText = text.replace(/'/g, "\\'").replace(/"/g, '\\"').replace("→ ", "")
    return `
            <button onclick="tts.speak('${cleanText}'); this.classList.add('animate-pulse'); setTimeout(() => this.classList.remove('animate-pulse'), 1000)" 
                    class="inline-flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full transition-all duration-200 transform hover:scale-110 text-xs sm:text-sm ${className}"
                    title="Talaffuz eshitish">
                🔊
            </button>
        `
  },
}

// ===== API Functions =====
const api = {
  baseUrls: {
    essential: "https://assets.4000.uz/assets/en/essential",
    beginner: "https://assets.4000.uz/assets/en/beginner",
  },

  async fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        return await response.json()
      } catch (error) {
        console.warn(`Attempt ${i + 1} failed:`, error)

        if (i === retries - 1) {
          throw error
        }

        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, i) * 1000))
      }
    }
  },

  async loadAllData() {
    try {
      utils.showLoading()

      // Load Essential data
      const [essentialEn, essentialUz] = await Promise.all([
        api.fetchWithRetry(`${api.baseUrls.essential}/words.json`),
        api.fetchWithRetry(`${api.baseUrls.essential}/uz/words.json`),
      ])

      jsonData.essential = essentialEn
      uzJsonData.essential = essentialUz

      // Load Beginner data
      const [beginnerEn, beginnerUz] = await Promise.all([
        api.fetchWithRetry(`${api.baseUrls.beginner}/words.json`),
        api.fetchWithRetry(`${api.baseUrls.beginner}/uz/words.json`),
      ])

      jsonData.beginner = beginnerEn
      uzJsonData.beginner = beginnerUz

      console.log("✅ All data loaded successfully")
      return true
    } catch (error) {
      console.error("❌ Failed to load data:", error)
      throw new Error("Ma'lumotlarni yuklashda xatolik yuz berdi. Internetga ulanishni tekshiring.")
    }
  },

  getImageUrl(collection, level, unit, index) {
    if (collection === "essential") {
      return `${api.baseUrls.essential}/picture/${level}/${unit}/${index}.jpg`
    }
    return `https://via.placeholder.com/120x120/667eea/ffffff?text=No+Image`
  },
}

// ===== Navigation Functions =====
const navigation = {
  switchPage(page) {
    if (page === "landing") {
      utils.showElement(elements.landingPage)
      utils.hideElement(elements.learningPage)
      currentState.page = "landing"
    } else if (page === "learning") {
      utils.hideElement(elements.landingPage)
      utils.showElement(elements.learningPage)
      currentState.page = "learning"
    }
  },

  async goToLearning() {
    navigation.switchPage("learning")

    if (!jsonData.essential || !jsonData.beginner) {
      try {
        await api.loadAllData()
        views.showCollections()
      } catch (error) {
        utils.showError(error.message)
      }
    } else {
      views.showCollections()
    }
  },

  goBack() {
    switch (currentState.view) {
      case "words":
        views.showUnits(currentState.collection, currentState.level)
        break
      case "units":
        views.showLevels(currentState.collection)
        break
      case "levels":
        views.showCollections()
        break
      default:
        views.showCollections()
    }
  },

  updateBackButton() {
    if (currentState.view === "collections") {
      utils.hideElement(elements.backButton)
    } else {
      utils.showElement(elements.backButton)
    }
  },
}

// ===== View Functions =====
const views = {
  showCollections() {
    currentState.view = "collections"
    navigation.updateBackButton()

    utils.updatePageHeader("So'zlar kolleksiyasi", "O'rganish uchun kolleksiyani tanlang")
    utils.clearGrids()
    utils.showContent()
    utils.showElement(elements.collectionsGrid)

    elements.collectionsGrid.innerHTML = `
            <!-- Beginner Collection (Left) -->
            <div class="collection-card beginner bg-gradient-to-br from-pink-500 to-red-500 text-white p-4 sm:p-8 rounded-2xl sm:rounded-3xl cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl" onclick="views.showLevels('beginner')">
                <div class="text-center">
                    <div class="text-4xl sm:text-6xl mb-3 sm:mb-6 animate-bounce">🌟</div>
                    <h3 class="text-xl sm:text-3xl font-bold mb-2 sm:mb-4">Beginner Words</h3>
                    <p class="text-sm sm:text-lg opacity-90 mb-3 sm:mb-6">Boshlang'ich daraja uchun so'zlar</p>
                    <div class="bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4">
                        <div class="text-lg sm:text-2xl font-bold">1000+</div>
                        <div class="text-xs sm:text-sm opacity-80">So'zlar</div>
                    </div>
                </div>
            </div>

            <!-- Essential Collection (Right) -->
            <div class="collection-card essential bg-gradient-to-br from-blue-600 to-purple-600 text-white p-4 sm:p-8 rounded-2xl sm:rounded-3xl cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl" onclick="views.showLevels('essential')">
                <div class="text-center">
                    <div class="text-4xl sm:text-6xl mb-3 sm:mb-6 animate-bounce">📚</div>
                    <h3 class="text-xl sm:text-3xl font-bold mb-2 sm:mb-4">Essential Words</h3>
                    <p class="text-sm sm:text-lg opacity-90 mb-3 sm:mb-6">4000 ta asosiy ingliz so'zi</p>
                    <div class="bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4">
                        <div class="text-lg sm:text-2xl font-bold">4000</div>
                        <div class="text-xs sm:text-sm opacity-80">So'zlar</div>
                    </div>
                </div>
            </div>
        `
  },

  showLevels(collection) {
    currentState.view = "levels"
    currentState.collection = collection
    navigation.updateBackButton()

    const collectionName = collection === "essential" ? "Essential Words" : "Beginner Words"
    utils.updatePageHeader(`${collectionName} - Darajalar`, "O'rganish uchun darajani tanlang")
    utils.clearGrids()
    utils.showContent()
    utils.showElement(elements.levelsGrid)

    const maxLevels = collection === "essential" ? 6 : 4
    const data = jsonData[collection]

    if (!data) {
      utils.showError("Ma'lumotlar topilmadi")
      return
    }

    let levelsHTML = ""
    for (let i = 0; i < maxLevels; i++) {
      if (data[i]) {
        const levelNumber = i + 1
        const wordsCount = Object.keys(data[i]).reduce((total, unitKey) => {
          return total + (Array.isArray(data[i][unitKey]) ? data[i][unitKey].length : 0)
        }, 0)

        const gradientClass = collection === "essential" ? "from-blue-500 to-purple-600" : "from-pink-500 to-red-500"

        levelsHTML += `
                    <div class="bg-white rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer border border-gray-100" onclick="views.showUnits('${collection}', ${i})">
                        <div class="bg-gradient-to-r ${gradientClass} text-white p-4 sm:p-6 rounded-t-xl sm:rounded-t-2xl">
                            <div class="text-center">
                                <div class="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Level ${levelNumber}</div>
                                <div class="text-xs sm:text-sm opacity-90">Daraja ${levelNumber}</div>
                            </div>
                        </div>
                        <div class="p-4 sm:p-6">
                            <div class="text-center">
                                <div class="text-xl sm:text-2xl font-bold text-gray-800 mb-1 sm:mb-2">${wordsCount}</div>
                                <div class="text-sm sm:text-base text-gray-600">ta so'z</div>
                                <div class="mt-3 sm:mt-4 bg-gray-200 rounded-full h-2">
                                    <div class="bg-gradient-to-r ${gradientClass} h-2 rounded-full" style="width: ${Math.random() * 100}%"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                `
      }
    }

    elements.levelsGrid.innerHTML = levelsHTML
  },

  showUnits(collection, level) {
    currentState.view = "units"
    currentState.collection = collection
    currentState.level = level
    navigation.updateBackButton()

    const collectionName = collection === "essential" ? "Essential Words" : "Beginner Words"
    const levelNumber = level + 1
    utils.updatePageHeader(`${collectionName} - Daraja ${levelNumber}`, "O'rganish uchun bo'limni tanlang")
    utils.clearGrids()
    utils.showContent()
    utils.showElement(elements.unitsGrid)

    const data = jsonData[collection][level]

    if (!data) {
      utils.showError("Bu daraja uchun ma'lumotlar topilmadi")
      return
    }

    const maxUnits = collection === "essential" ? 30 : 20
    let unitsHTML = ""
    let unitCount = 0

    for (let j = 0; j < maxUnits; j++) {
      if (data[j] && Array.isArray(data[j]) && data[j].length > 0) {
        const unitNumber = j + 1
        const wordsCount = data[j].length

        const colorClass =
          unitCount % 3 === 0
            ? "from-blue-500 to-blue-600"
            : unitCount % 3 === 1
              ? "from-green-500 to-green-600"
              : "from-purple-500 to-purple-600"

        unitsHTML += `
                    <div class="bg-white rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer border border-gray-100" onclick="views.showWords('${collection}', ${level}, ${j})">
                        <div class="bg-gradient-to-r ${colorClass} text-white p-3 sm:p-6 rounded-t-xl sm:rounded-t-2xl">
                            <div class="text-center">
                                <div class="text-lg sm:text-2xl font-bold mb-1">Unit ${utils.formatNumber(unitNumber)}</div>
                                <div class="text-xs sm:text-sm opacity-90">Bo'lim ${utils.formatNumber(unitNumber)}</div>
                            </div>
                        </div>
                        <div class="p-3 sm:p-6">
                            <div class="text-center">
                                <div class="text-lg sm:text-xl font-bold text-gray-800 mb-1 sm:mb-2">${wordsCount}</div>
                                <div class="text-sm sm:text-base text-gray-600 mb-2 sm:mb-4">ta so'z</div>
                                <div class="flex items-center justify-center text-xs sm:text-sm text-gray-500">
                                    <span class="mr-1 sm:mr-2">📖</span>
                                    <span>O'rganish</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `

        unitCount++
      }
    }

    if (unitCount === 0) {
      utils.showError("Bu daraja uchun bo'limlar mavjud emas")
      return
    }

    elements.unitsGrid.innerHTML = unitsHTML
  },

  showWords(collection, level, unit) {
    currentState.view = "words"
    currentState.collection = collection
    currentState.level = level
    currentState.unit = unit
    navigation.updateBackButton()

    const collectionName = collection === "essential" ? "Essential Words" : "Beginner Words"
    const levelNumber = level + 1
    const unitNumber = unit + 1
    utils.updatePageHeader(
      `${collectionName} - Daraja ${levelNumber}, Bo'lim ${unitNumber}`,
      "So'zlarni o'rganing va eslab qoling",
    )
    utils.clearGrids()
    utils.showContent()
    utils.showElement(elements.wordsList)

    const words = jsonData[collection][level][unit]
    const uzWords =
      uzJsonData[collection] && uzJsonData[collection][level] && uzJsonData[collection][level][unit]
        ? uzJsonData[collection][level][unit]
        : []

    if (!words || !Array.isArray(words)) {
      utils.showError("So'zlar topilmadi")
      return
    }

    const wordsToShow = words.slice(0, 20)
    let wordsHTML = ""

    wordsToShow.forEach((word, index) => {
      const uzWord = uzWords[index]
      const translation = uzWord ? uzWord.w : ""
      const imageUrl = api.getImageUrl(collection, level, unit, index)

      const typeColors = {
        n: "bg-blue-500",
        v: "bg-green-500",
        adj: "bg-purple-500",
        adv: "bg-yellow-500",
        prep: "bg-red-500",
        conj: "bg-indigo-500",
      }

      const typeColor = typeColors[word.tp] || "bg-gray-500"

      wordsHTML += `
                <div class="bg-white rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100">
                    <div class="flex flex-col sm:flex-col lg:flex-row gap-4 sm:gap-6 p-4 sm:p-6">
                        <div class="flex-shrink-0 text-center">
                            <img src="${imageUrl}" 
                                 class="w-24 h-24 sm:w-32 sm:h-32 rounded-lg sm:rounded-xl object-cover shadow-md mx-auto" 
                                 alt="${word.w}"
                                 onerror="this.style.display='none'"
                                 loading="lazy">
                        </div>
                        <div class="flex-1">
                            <div class="flex flex-wrap items-center gap-2 sm:gap-4 mb-3 sm:mb-4 justify-center sm:justify-start">
                                <div class="flex items-center gap-2">
                                    <h3 class="text-xl sm:text-2xl font-bold text-gray-900">${word.w}</h3>
                                    ${tts.createButton(word.w)}
                                </div>
                                ${translation ? `<div class="text-lg sm:text-xl text-blue-600 font-medium">${translation}</div>` : ""}
                                <div class="text-gray-500 italic text-sm sm:text-base">[${word.t}]</div>
                                <span class="${typeColor} text-white px-2 py-1 rounded-full text-xs font-medium uppercase">${word.tp}</span>
                            </div>
                            
                            <div class="space-y-3 sm:space-y-4">
                                <div class="bg-blue-50 p-3 sm:p-4 rounded-lg sm:rounded-xl border-l-4 border-blue-500">
                                    <div class="flex items-start gap-2">
                                        <strong class="text-blue-700 flex-shrink-0 text-sm sm:text-base">Ta'rif:</strong>
                                        <span class="text-gray-700 text-sm sm:text-base">${word.d}</span>
                                        ${tts.createButton(word.d, "ml-2")}
                                    </div>
                                </div>
                                
                                <div class="bg-green-50 p-3 sm:p-4 rounded-lg sm:rounded-xl border-l-4 border-green-500">
                                    <div class="flex items-start gap-2">
                                        <strong class="text-green-700 flex-shrink-0 text-sm sm:text-base">Misol:</strong>
                                        <span class="text-gray-700 italic text-sm sm:text-base">${word.s}</span>
                                        ${tts.createButton(word.s, "ml-2")}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `
    })

    elements.wordsList.innerHTML = wordsHTML

    // Scroll to top
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }, 100)
  },
}

// ===== Event Listeners =====
const events = {
  init() {
    // Navigation events
    elements.startBtn?.addEventListener("click", navigation.goToLearning)
    elements.tryWebBtn?.addEventListener("click", navigation.goToLearning)
    elements.backButton?.addEventListener("click", navigation.goBack)
    elements.retryBtn?.addEventListener("click", navigation.goToLearning)

    // Keyboard navigation
    document.addEventListener("keydown", (event) => {
      switch (event.key) {
        case "Escape":
          if (currentState.page === "learning" && currentState.view !== "collections") {
            navigation.goBack()
          }
          break
        case "h":
        case "H":
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault()
            navigation.switchPage("landing")
          }
          break
      }
    })

    console.log("✅ Event listeners initialized")
  },
}

// ===== Initialization =====
const app = {
  async init() {
    console.log("🚀 Initializing 4000 Words App...")

    try {
      // Initialize event listeners
      events.init()

      // Show landing page by default
      navigation.switchPage("landing")

      console.log("✅ App initialized successfully!")
    } catch (error) {
      console.error("❌ Failed to initialize app:", error)
      utils.showError("Ilovani ishga tushirishda xatolik yuz berdi")
    }
  },
}

// ===== Start Application =====
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", app.init)
} else {
  app.init()
}

// ===== Make functions globally available =====
window.views = views
window.tts = tts
window.navigation = navigation
