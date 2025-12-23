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
  updateAverageRating();
  updateTopRatedBadge();
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

function getChapterKey() {
  return "comments_chapter_" + current;
}

/* Load comments */
function loadComments() {
  const list = document.getElementById("commentList");
  if (!list) return;

  list.innerHTML = "";
  const comments = JSON.parse(localStorage.getItem(getChapterKey())) || [];

  comments.forEach(c => {
  const div = document.createElement("div");
  div.className = "comment";

  const letter = c.name.charAt(0).toUpperCase();

  div.innerHTML = `
    <div class="avatar">${letter}</div>
    <strong>${c.name}</strong>
    <small>${c.time}</small>
    <p>${c.text}</p>
  `;
  list.appendChild(div);
});

}

/* Add comment */
function postComment() {
  const name = document.getElementById("username").value.trim();
  const text = document.getElementById("commentText").value.trim();

  if (!name || !text) {
    alert("Please enter name and comment");
    return;
  }

  const comments = JSON.parse(localStorage.getItem(getChapterKey())) || [];

  comments.push({
    name,
    text,
    time: new Date().toLocaleString()
  });

  localStorage.setItem(getChapterKey(), JSON.stringify(comments));

  document.getElementById("commentText").value = "";
  loadComments();
}


let selectedRating = 0;

function rate(value) {
  selectedRating = value;
  document.querySelectorAll(".stars span").forEach((star, i) => {
    star.classList.toggle("active", i < value);
  });
}

function reviewKey() {
  return "reviews_chapter_" + current;
}

function saveReview() {
  if (selectedRating === 0) {
    alert("Please select a rating");
    return;
  }

  const text = document.getElementById("reviewText").value.trim();

  const reviews = JSON.parse(localStorage.getItem(reviewKey())) || [];

  reviews.push({
    rating: selectedRating,
    text,
    time: new Date().toLocaleDateString()
  });

  localStorage.setItem(reviewKey(), JSON.stringify(reviews));

  document.getElementById("reviewText").value = "";
  document.getElementById("reviewMsg").innerText = "✅ Review submitted!";
  selectedRating = 0;
  rate(0);

  renderReviews();
  updateAverageRating();
}
function updateAverageRating() {
  const reviews = JSON.parse(localStorage.getItem(reviewKey())) || [];
  if (reviews.length === 0) return;

  const avg =
    reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  document.getElementById("avgRating").innerText =
    `⭐ ${avg.toFixed(1)} / 5 (${reviews.length} reviews)`;
}
function getTopRatedChapter() {
  let best = { chapter: null, avg: 0 };

  for (let i = 0; i < chapters.length; i++) {
    const reviews = JSON.parse(
      localStorage.getItem("reviews_chapter_" + i)
    ) || [];

    if (reviews.length === 0) continue;

    const avg =
      reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

    if (avg > best.avg) {
      best = { chapter: i, avg };
    }
  }
  return best;
}

function updateTopRatedBadge() {
  const best = getTopRatedChapter();
  const badge = document.getElementById("topRatedBadge");

  if (!badge) return;

  if (best.chapter === current) {
    badge.style.display = "block";
  } else {
    badge.style.display = "none";
  }
}

function renderReviews() {
  const list = document.getElementById("reviewList");
  if (!list) return;

  const reviews = JSON.parse(localStorage.getItem(reviewKey())) || [];
  list.innerHTML = "";

  if (reviews.length === 0) return;

  const best = getBestReview(reviews);

  // 🏆 BEST REVIEW FIRST
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

  // OTHER REVIEWS
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
}


function getBestReview(reviews) {
  if (!reviews || reviews.length === 0) return null;

  // Highest rating, then longest text
  return reviews.reduce((best, curr) => {
    if (!best) return curr;
    if (curr.rating > best.rating) return curr;
    if (curr.rating === best.rating && curr.text.length > best.text.length)
      return curr;
    return best;
  }, null);
}
document.getElementById("year").textContent = new Date().getFullYear();

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



