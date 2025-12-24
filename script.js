let chapters = document.querySelectorAll(".chapter");
let current = Number(localStorage.getItem("chapter")) || 0;
let infinite = localStorage.getItem("infinite") === "true";

/* SHOW CHAPTER */
function showChapter(i) {
  chapters.forEach(c => c.classList.remove("active"));
  chapters[i].classList.add("active");

  current = i;
  localStorage.setItem("chapter", i);

  document.getElementById("chapterTitle").innerText =
    chapters[i].dataset.title;

  restoreScroll(i);
  updateProgress();
  loadComments();
  renderReviews();
  
}



/* NAVIGATION */
function changeChapter(step) {
  current = Math.min(Math.max(current + step, 0), chapters.length - 1);
  showChapter(current);
}

/* SCROLL SAVE */
let scrollTimeout;

chapters.forEach((ch, i) => {
  ch.addEventListener("scroll", () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      localStorage.setItem("scroll" + i, ch.scrollTop);
    }, 200);
  });
});


function restoreScroll(i) {
  let pos = localStorage.getItem("scroll" + i);
  if (pos) chapters[i].scrollTop = pos;
}

/* MODES */
function toggleInfinite() {
  infinite = !infinite;
  document.body.classList.toggle("infinite", infinite);
  localStorage.setItem("infinite", infinite);
}

function toggleDarkMode() {
  document.body.classList.toggle("dark");
  localStorage.setItem("dark", document.body.classList.contains("dark"));
}
if (localStorage.getItem("dark") === "true") {
  document.body.classList.add("dark");
}


function toggleComicMode() {
  document.body.classList.toggle("comic");
}

/* FONT SIZE */
function fontSize(change) {
  let size = Number(localStorage.getItem("font")) || 16;
  size += change;
  size = Math.min(Math.max(size, 14), 22);
  document.documentElement.style.setProperty("--font", size + "px");
  localStorage.setItem("font", size);
}

/* PROGRESS */
function updateProgress() {
  document.getElementById("progressBar").style.width =
    ((current + 1) / chapters.length * 100) + "%";
}

function scrollToChapters() {
  document.getElementById("chapters").scrollIntoView({behavior:"smooth"});
}

/* LOAD SAVED */
if (infinite) document.body.classList.add("infinite");
let savedFont = localStorage.getItem("font");
if (savedFont) document.documentElement.style.setProperty("--font", savedFont+"px");

showChapter(current);

/* ================= FIREBASE COMMENTS ================= */

function chapterPath() {
  return "comments/chapter_" + current;
}

function loadComments() {
  const list = document.getElementById("commentList");
  if (!list) return;

  list.innerHTML = "";

  db.ref(chapterPath()).off(); // prevent duplicates
  db.ref(chapterPath()).on("child_added", snap => {
    const c = snap.val();
    const div = document.createElement("div");
    div.className = "comment";

    div.innerHTML = `
      <div class="avatar">${c.name.charAt(0).toUpperCase()}</div>
      <strong>${c.name}</strong>
      <small>${c.time}</small>
      <p>${c.text}</p>
    `;

    list.appendChild(div);
  });
}

function addComment() {
  const name = document.getElementById("username").value.trim();
  const text = document.getElementById("commentText").value.trim();

  if (!name || !text) {
    alert("Please enter name and comment");
    return;
  }

  db.ref(chapterPath()).push({
    name,
    text,
    time: new Date().toLocaleString()
  });

  document.getElementById("commentText").value = "";
}



let selectedRating = 0;

function rate(value) {
  selectedRating = value;
  document.querySelectorAll(".stars span").forEach((star, i) => {
    star.classList.toggle("active", i < value);
  });
}

/* ================= FIREBASE REVIEWS ================= */

function reviewPath() {
  return "reviews/chapter_" + current;
}

function saveReview() {
  if (selectedRating === 0) {
    alert("Please select a rating");
    return;
  }

  const text = document.getElementById("reviewText").value.trim();

  db.ref(reviewPath()).push({
    rating: selectedRating,
    text,
    time: new Date().toLocaleDateString()
  });

  document.getElementById("reviewText").value = "";
  document.getElementById("reviewMsg").innerText = "✅ Review submitted!";
  selectedRating = 0;
  rate(0);
}

function renderReviews() {
  const list = document.getElementById("reviewList");
  if (!list) return;

  list.innerHTML = "";

  db.ref(reviewPath()).off();
  db.ref(reviewPath()).on("value", snap => {
    const reviews = [];
    snap.forEach(s => reviews.push(s.val()));
    if (reviews.length === 0) return;

    const best = getBestReview(reviews);

    if (best) {
      list.innerHTML += `
        <div class="review-bubble best pinned">
          <span class="badge">🏆 Best Review</span>
          <strong>⭐ ${best.rating}</strong>
          <p>${best.text || "No written review"}</p>
          <small>${best.time}</small>
        </div>
      `;
    }

    reviews.forEach(r => {
      if (r === best) return;
      list.innerHTML += `
        <div class="review-bubble">
          <strong>⭐ ${r.rating}</strong>
          <p>${r.text || "No written review"}</p>
          <small>${r.time}</small>
        </div>
      `;
    });

    updateAverageRating(reviews);
    updateTopRatedBadge(reviews);
  });
}

function updateAverageRating(reviews) {
  const avg =
    reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  document.getElementById("avgRating").innerText =
    `⭐ ${avg.toFixed(1)} / 5 (${reviews.length} reviews)`;
}

function updateTopRatedBadge(reviews) {
  const badge = document.getElementById("topRatedBadge");
  const avg =
    reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

  badge.style.display = avg >= 4 ? "block" : "none";
}

function getBestReview(reviews) {
  return reviews.reduce((best, curr) => {
    if (!best) return curr;
    if (curr.rating > best.rating) return curr;
    if (curr.rating === best.rating &&
        (curr.text || "").length > (best.text || "").length)
      return curr;
    return best;
  }, null);
}


/* ========= FLOATING CONTROLS LOGIC ========= */
const panel = document.getElementById("floatingControls");
const toggleBtn = panel.querySelector(".toggle-panel");
const darkBtn = document.getElementById("darkBtn");
const comicBtn = document.getElementById("comicBtn");
const infBtn = document.getElementById("infBtn");

/* Restore position */
const savedPos = JSON.parse(localStorage.getItem("floatingPos"));
if (savedPos) {
  panel.style.right = "auto";
  panel.style.bottom = "auto";
  panel.style.left = savedPos.x + "px";
  panel.style.top = savedPos.y + "px";
}

/* Collapse toggle */
toggleBtn.onclick = () => {
  panel.classList.toggle("collapsed");
};

/* Active state sync */
function syncButtons() {
  darkBtn.classList.toggle("active", document.body.classList.contains("dark"));
  comicBtn.classList.toggle("active", document.body.classList.contains("comic"));
  infBtn.classList.toggle("active", document.body.classList.contains("infinite"));
}
syncButtons();

/* Patch existing toggles */
const _dark = toggleDarkMode;
toggleDarkMode = function () {
  _dark();
  syncButtons();
};

const _comic = toggleComicMode;
toggleComicMode = function () {
  _comic();
  syncButtons();
};

const _inf = toggleInfinite;
toggleInfinite = function () {
  _inf();
  syncButtons();
};

/* Auto hide on scroll */
let lastScroll = window.scrollY;
window.addEventListener("scroll", () => {
  if (window.scrollY > lastScroll) {
    panel.classList.add("hidden");
  } else {
    panel.classList.remove("hidden");
  }
  lastScroll = window.scrollY;
});

/* Drag to move */
let isDragging = false;

panel.addEventListener("mousedown", e => {
  if (e.target.tagName !== "BUTTON") {
    isDragging = true;
  }
});

document.addEventListener("mousemove", e => {
  if (!isDragging) return;

  panel.style.left = e.clientX - panel.offsetWidth / 2 + "px";
  panel.style.top = e.clientY - panel.offsetHeight / 2 + "px";
  panel.style.right = "auto";
  panel.style.bottom = "auto";
});

document.addEventListener("mouseup", () => {
  if (!isDragging) return;
  isDragging = false;

  localStorage.setItem(
    "floatingPos",
    JSON.stringify({
      x: panel.offsetLeft,
      y: panel.offsetTop
    })
  );
});


document.querySelector(".toggle-panel")
  ?.addEventListener("click", () => {
    document.getElementById("floatingControls")
      .classList.toggle("collapsed");
  });


