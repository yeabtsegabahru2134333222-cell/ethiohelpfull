const KEY = "ethiohelpful_v2";
const THEME_KEY = "ethiohelpful_theme";

const defaultState = {
  profile: {
    name: "", grade: "", location: "", route: "",
    interests: "", strengths: "", concerns: "", finance: "", goal: ""
  },
  milestones: [],
  experiments: []
};

let state = load();

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    return {
      profile: { ...defaultState.profile, ...(raw.profile || {}) },
      milestones: raw.milestones || [],
      experiments: raw.experiments || []
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
  renderAll();
}

const qs = s => document.querySelector(s);
const qsa = s => [...document.querySelectorAll(s)];

function escapeHtml(str) {
  return String(str || "").replace(/[&<>\"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c])
  );
}

/* ========== Theme (light / dark) ========== */
function getSavedTheme() {
  return localStorage.getItem(THEME_KEY); // 'dark' | 'light' | null
}

function saveTheme(value) {
  if (value === null) localStorage.removeItem(THEME_KEY);
  else localStorage.setItem(THEME_KEY, value);
}

function systemPrefersDark() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(theme) {
  // theme: 'dark' | 'light' | null (null = follow system)
  const html = document.documentElement;
  html.classList.remove('dark', 'light');
  if (theme === 'dark') html.classList.add('dark');
  else if (theme === 'light') html.classList.add('light');

  // Update toggle button state if present
  const btn = qs('#theme-toggle');
  if (btn) {
    const pressed = theme === 'dark' || (theme === null && systemPrefersDark());
    btn.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    btn.textContent = pressed ? '☀️' : '🌙';
  }
}

function initTheme() {
  const saved = getSavedTheme();
  if (saved === 'dark' || saved === 'light') {
    applyTheme(saved);
  } else {
    // Follow system preference
    applyTheme(null);
  }

  // Update when system preference changes (only when user hasn't explicitly chosen)
  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener && mq.addEventListener('change', e => {
      if (!getSavedTheme()) applyTheme(null);
    });
  }

  // Attach click handler
  const btn = qs('#theme-toggle');
  if (btn) {
    btn.addEventListener('click', () => {
      // Toggle between dark and light; if currently following system, use system as base
      const cur = getSavedTheme();
      let next;
      if (cur === 'dark') next = 'light';
      else if (cur === 'light') next = null; // cycle back to system
      else {
        // following system -> switch to opposite explicit
        next = systemPrefersDark() ? 'light' : 'dark';
      }
      saveTheme(next);
      applyTheme(next);
    });
  }
}

/* ========== Navigation ========== */
function showView(id) {
  qsa(".view").forEach(v => v.classList.remove("active"));
  const el = qs("#" + id);
  if (el) el.classList.add("active");

  qsa(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.view === id));

  const titles = {
    dashboard: { title: "Welcome", eyebrow: "YOUR SPACE" },
    guide: { title: "AI Guide", eyebrow: "GUIDANCE" },
    roadmap: { title: "Your roadmap", eyebrow: "DIRECTION" },
    paths: { title: "Path ideas", eyebrow: "EXPLORE" },
    profile: { title: "Your profile", eyebrow: "ABOUT YOU" },
    journal: { title: "Exploration", eyebrow: "LEARN BY DOING" }
  };
  const t = titles[id] || { title: "Ethiohelpful", eyebrow: "" };
  qs("#page-title").textContent = t.title;
  qs("#page-eyebrow").textContent = t.eyebrow;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

qsa(".nav-btn").forEach(b => b.onclick = () => showView(b.dataset.view));
qsa("[data-view-target]").forEach(b => b.onclick = () => showView(b.dataset.viewTarget));
qsa("[data-open-guide]").forEach(b => b.onclick = () => showView("guide"));
qs("#edit-profile-btn").onclick = () => showView("profile");

/* ========== Render ========== */
function renderProfile() {
  const p = state.profile;
  const name = p.name ? `Hi, ${p.name}` : "Not set yet";
  const summary = p.interests
    ? `Interested in ${p.interests}.${p.goal ? ` Goal: ${p.goal}.` : ""}`
    : "Add a few details so guidance can be more relevant to you.";

  qs("#dash-name").textContent = name;
  qs("#dash-summary").textContent = summary;

  const chips = [p.grade, p.location, p.route].filter(Boolean);
  qs("#dash-chips").innerHTML = chips.map(c => `<span class="chip">${escapeHtml(c)}</span>`).join("");

  qs("#dash-focus-title").textContent = p.goal || "Find your direction";
  qs("#dash-focus-text").textContent = p.concerns || "Start with what you already know. Direction can change as you learn more.";

  const form = qs("#profile-form");
  Object.keys(p).forEach(k => {
    if (form.elements[k]) form.elements[k].value = p[k] || "";
  });
}

function renderRoadmap() {
  const list = qs("#roadmap-list");
  if (!state.milestones.length) {
    list.innerHTML = `<div class="empty-state">No milestones yet. Add goals as you explore — they can change later.</div>`;
  } else {
    list.innerHTML = state.milestones.map((m, i) => `
      <div class="roadmap-item">
        <div class="stage-tag">${escapeHtml(m.stage)}</div>
        <div>
          <h3>${escapeHtml(m.title)}</h3>
          <p>${m.done ? "Completed." : "Still ahead — take it when you're ready."}</p>
        </div>
        <button class="check ${m.done ? "done" : ""}" onclick="toggleMilestone(${i})">${m.done ? "✓" : ""}</button>
      </div>
    `).join("");
  }

  const done = state.milestones.filter(m => m.done).length;
  const total = state.milestones.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  qs("#dash-progress-pct").textContent = pct + "%";
  qs("#dash-progress-fill").style.width = pct + "%";
  qs("#dash-progress-text").textContent = total
    ? `${done} of ${total} milestones completed.`
    : "No milestones yet.";

  const stages = ["Explore", "Develop", "Prepare", "Next stage"];
  qs("#timeline-snapshot").innerHTML = `
    <div class="timeline">
      ${stages.map((s, i) => {
        const has = state.milestones.some(m => m.stage === s);
        const isDone = state.milestones.some(m => m.stage === s && m.done);
        return `
          <div class="stage ${isDone ? "done" : ""}">
            <div class="stage-dot">${isDone ? "✓" : i + 1}</div>
            <h4>${s}</h4>
            <p>${has ? "Milestones added" : "Waiting for next step"}</p>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderJournal() {
  const el = qs("#journal-list");
  if (!state.experiments.length) {
    el.innerHTML = `<div class="empty-state" style="grid-column:1/-1">No explorations yet. Try something small and record what you learned about yourself.</div>`;
    return;
  }
  el.innerHTML = state.experiments.map(e => `
    <article class="journal-card">
      <span class="date">${new Date(e.date).toLocaleDateString()}</span>
      <h3>${escapeHtml(e.title)}</h3>
      <p>${escapeHtml(e.learning)}</p>
    </article>
  `).join("");
}

/* Path ideas — practical starting points for Ethiopian students */
const PATHS = [
  {
    tag: "STEM",
    title: "Engineering & Technology",
    desc: "Build, design, and solve practical problems. Strong math and physics help.",
    steps: ["Strengthen math & physics this year", "Try a small coding or electronics project", "Research local engineering programs (AAU, ASTU, etc.)", "Look into competitive scholarships early"]
  },
  {
    tag: "Health",
    title: "Medicine & Health Sciences",
    desc: "High competition. Requires excellent grades and long-term commitment.",
    steps: ["Focus heavily on biology & chemistry", "Understand entrance requirements early", "Talk to medical students or doctors if possible", "Have a backup plan (nursing, lab tech, public health)"]
  },
  {
    tag: "Business",
    title: "Business, Economics & Finance",
    desc: "Useful in almost every sector. Mix of analysis and people skills.",
    steps: ["Improve math and English", "Read basic economics or business news", "Try a small trading or project idea", "Explore local universities and private colleges"]
  },
  {
    tag: "Tech",
    title: "Computer Science & IT",
    desc: "Growing demand. You can start learning skills before university.",
    steps: ["Learn basic programming (Python or web)", "Build 1–2 small projects you can show", "Practice English for technical reading", "Research CS programs and online certifications"]
  },
  {
    tag: "Social",
    title: "Law, Social Sciences & Education",
    desc: "Strong writing, reading, and critical thinking matter more than pure STEM scores.",
    steps: ["Read widely and write regularly", "Practice clear argument and analysis", "Research entrance requirements for law/education", "Consider volunteering or teaching practice"]
  },
  {
    tag: "Creative",
    title: "Design, Media & Creative Fields",
    desc: "Portfolio and real work often matter as much as grades.",
    steps: ["Start building a simple portfolio now", "Learn free design or video tools", "Study both creative skill and basic business", "Look at local creative industries and freelancing"]
  },
  {
    tag: "Abroad",
    title: "Study Abroad Path",
    desc: "Possible but requires early planning, strong academics, and usually funding.",
    steps: ["Research countries & requirements 1–2 years ahead", "Improve English (IELTS/TOEFL if needed)", "Track scholarships (government, university, private)", "Prepare a realistic budget and timeline"]
  },
  {
    tag: "Local",
    title: "Strong Local University Path",
    desc: "Many excellent options inside Ethiopia. Focus on grades and clear priorities.",
    steps: ["Know the national exam and placement system", "Rank your preferred departments honestly", "Visit or research campuses if possible", "Build skills that help after graduation"]
  }
];

function renderPaths() {
  qs("#paths-grid").innerHTML = PATHS.map(p => `
    <article class="path-card">
      <span class="tag">${p.tag}</span>
      <h3>${p.title}</h3>
      <p>${p.desc}</p>
      <ul>${p.steps.map(s => `<li>${s}</li>`).join("")}</ul>
    </article>
  `).join("");
}

function renderAll() {
  renderProfile();
  renderRoadmap();
  renderJournal();
  renderPaths();
}

function toggleMilestone(i) {
  state.milestones[i].done = !state.milestones[i].done;
  save();
}

/* ========== Forms ========== */
qs("#profile-form").onsubmit = e => {
  e.preventDefault();
  const f = new FormData(e.target);
  for (const [k, v] of f.entries()) state.profile[k] = v.trim();
  save();
  qs("#save-status").textContent = "Saved ✓";
  setTimeout(() => qs("#save-status").textContent = "", 1800);
  showView("dashboard");
};

function openModal(id) { qs("#" + id).classList.remove("hidden"); }
function closeModals() { qsa(".modal").forEach(m => m.classList.add("hidden")); }
qsa("[data-close]").forEach(b => b.onclick = closeModals);

qs("#add-milestone").onclick = () => openModal("milestone-modal");
qs("#add-experiment").onclick = () => openModal("experiment-modal");

qs("#milestone-form").onsubmit = e => {
  e.preventDefault();
  const f = new FormData(e.target);
  state.milestones.push({ title: f.get("title"), stage: f.get("stage"), done: false });
  e.target.reset();
  closeModals();
  save();
};

qs("#experiment-form").onsubmit = e => {
  e.preventDefault();
  const f = new FormData(e.target);
  state.experiments.unshift({
    title: f.get("title"),
    learning: f.get("learning"),
    date: new Date().toISOString()
  });
  e.target.reset();
  closeModals();
  save();
};

/* ========== Smarter local AI guide ========== */
const messagesEl = qs("#messages");

function addMessage(text, who = "ai") {
  const div = document.createElement("div");
  div.className = "bubble " + who;
  div.textContent = text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function guideReply(input) {
  const p = state.profile;
  const low = input.toLowerCase().trim();
  const name = p.name ? p.name.split(" ")[0] : null;
  const hasContext = !!(p.grade || p.interests || p.goal || p.concerns);

  // Empty
  if (!low || low.length < 2) {
    return "What’s on your mind? Interests, confusion about the future, grades, studying abroad, money, or just “I don’t know where to start” — any of that works.";
  }

  // Simple greetings
  if (/^(hi|hello|hey|selam|good morning|good afternoon|good evening)\b/.test(low)) {
    if (name) return `Hey ${name}. What’s on your mind today?`;
    return "Hey. What’s on your mind? You can ask about directions, grades, studying abroad, or just say you’re stuck.";
  }

  // User pushing back about profile gate
  if (low.includes("understand") || low.includes("till then") || low.includes("until") || low.includes("without profile") || low.includes("not understand")) {
    return "I can still help without a full profile. General advice is fine. Filling grade + interests just makes suggestions more relevant to you. Ask me anything — start, paths, abroad, exams or goals.";
  }

  // Study abroad
  if (low.includes("abroad") || low.includes("foreign") || low.includes("outside ethiopia") || low.includes("scholarship abroad") || low.includes("study outside")) {
    let reply = "Studying abroad is possible but needs early, realistic planning. ";
    if (p.finance && p.finance.toLowerCase().includes("significant")) {
      reply += "Since funding looks important for you, treat scholarships as a main track and keep strong local options open. ";
    }
    reply += "Useful moves: research countries/programs 1–2 years ahead, strengthen English and grades, track scholarship deadlines, and always keep a solid Ethiopia backup. Want to dig into one country or scholarships?";
    return reply;
  }

  // Grade 11 / 12 / exams
  if (low.includes("grade 11") || low.includes("grade 12") || low.includes("national exam") || low.includes("entrance") || low.includes("matric") || low.includes("placement")) {
    return "In Grade 11–12 the practical focus is usually: strong subject performance, understanding the national exam and placement system, and narrowing to 2–3 realistic directions (not one single perfect path).";
  }

  // Don’t know / stuck / confused
  if (low.includes("start") || low.includes("confused") || low.includes("lost") || low.includes("don't know") || low.includes("dont know") || low.includes("stuck") || low.includes("no idea")) {
    if (hasContext) {
      const bits = [];
      if (p.grade) bits.push(`you’re in ${p.grade}`);
      if (p.interests) bits.push(`you’ve mentioned interest in ${p.interests}`);
      if (p.concerns) bits.push(`and you’re unsure about “${p.concerns}”`);
      const ctx = bits.length ? "Given that " + bits.join(", ") + " — " : "";
      return ctx + "You don’t need the whole future decided. Pick one small next action: browse Path ideas, try a tiny experiment related to something you’re curious about, or add one milestone to your roadmap.";
    }
    return "Totally normal. You don’t need a full plan. A good move is to list 2–3 things you’re even slightly curious about, then check the Path ideas section for overlap. Or just tell me one subject you like and we’ll start there.";
  }

  // Interests / what to study
  if (low.includes("interest") || low.includes("explore") || low.includes("what should i study") || low.includes("which field") || low.includes("what to study") || low.includes("career")) {
    if (p.interests) {
      return `You mentioned interest in “${p.interests}”. Next useful step: pick one small experiment (short project, conversation with someone in that area, or focused reading). Then notice what you enjoy.`;
    }
    return "Start rough: name 2–3 subjects, activities, or problems you don’t mind spending time on. Then look at Path ideas and see what overlaps. You can also just tell me one thing you like and I'll suggest a small test.";
  }

  // Money / scholarships
  if (low.includes("money") || low.includes("financial") || low.includes("scholarship") || low.includes("afford") || low.includes("cost") || low.includes("fee") || low.includes("expensive")) {
    return "Money is a real constraint for a lot of students. Treat it as information, not a dead end. Practical angles: public universities in Ethiopia, early scholarship research (local + international), and short-term skills you can develop with free resources.";
  }

  // Goals / plan / roadmap
  if (low.includes("goal") || low.includes("plan") || low.includes("roadmap") || low.includes("next step") || low.includes("what next")) {
    if (p.goal) {
      return `Your current stated goal is “${p.goal}”. Treat it as a working hypothesis, not a permanent contract. Break it into stages (Explore → Develop → Prepare → Next). You can add milestones and adjust them as you learn.`;
    }
    return "A useful plan is usually smaller than people think. Try: one direction to explore this month, one skill or subject to strengthen, and one concrete information gap to close (requirements, costs, or deadlines).";
  }

  // Strengths
  if (low.includes("strength") || low.includes("good at") || low.includes("skill") || low.includes("talent")) {
    if (p.strengths) {
      return `You listed strengths around: ${p.strengths}. Useful question: which of those do you actually enjoy using, not just perform okay at? Enjoyment + ability is a better signal than ability alone.`;
    }
    return "List 3–5 things you do better than average or that people ask you for help with. Then notice which ones give you energy. That mix is more useful than a generic “what should I become”.";
  }

  // Profile / about me
  if (low.includes("profile") || low.includes("about me") || low.includes("my info")) {
    if (hasContext) {
      const parts = [];
      if (p.name) parts.push(`Name: ${p.name}`);
      if (p.grade) parts.push(`Grade: ${p.grade}`);
      if (p.location) parts.push(`Location: ${p.location}`);
      if (p.route) parts.push(`Route: ${p.route}`);
      if (p.interests) parts.push(`Interests: ${p.interests}`);
      if (p.goal) parts.push(`Goal: ${p.goal}`);
      return "Here’s what I currently have from your profile:\n" + parts.join("\n") + "\n\nYou can update any of this in My Profile. What do you want to work on?";
    }
    return "Your profile is still mostly empty. Adding grade and interests makes my suggestions more specific, but you can keep talking without it. What do you want to figure out?";
  }

  // Thanks
  if (low.includes("thank") || low.includes("thanks") || low.includes("ameseginalehu")) {
    return "Anytime. Come back whenever something feels unclear.";
  }

  // Fallback — still try to be useful and human
  if (name) {
    return `Got it, ${name}. I can work with that. Tell me a bit more about what you’re trying to figure out (a field, a worry, a decision, or even “I’m just stuck”) and I’ll help you think it through.`;
  }
  if (hasContext && p.interests) {
    return `Okay. Given your interest in ${p.interests}, the useful move is usually to test it with a small action rather than only thinking about it. Want ideas for a quick experiment, or do you want to update your profile?`;
  }
  return "I’m with you. Give me a bit more to work with — a subject you like, something that worries you, a path you’re considering, or just “help me start” — and I’ll respond from there.";
}

qs("#chat-form").onsubmit = e => {
  e.preventDefault();
  const input = qs("#chat-input");
  const text = input.value.trim();
  if (!text) return;
  addMessage(text, "user");
  input.value = "";
  setTimeout(() => addMessage(guideReply(text)), 400);
};

qsa("[data-prompt]").forEach(b => {
  b.onclick = () => {
    qs("#chat-input").value = b.dataset.prompt;
    qs("#chat-form").requestSubmit();
  };
});

/* Init */
initTheme();
renderAll();
