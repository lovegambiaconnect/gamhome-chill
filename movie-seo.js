(() => {
  const grid = document.querySelector("#videoGrid");
  if (!grid) return;
  const slug = value => String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "movie";
  const requested = new URLSearchParams(window.location.search).get("watch");
  let opened = false;
  function enhanceCards() {
    grid.querySelectorAll("article.movie").forEach(card => {
      const play = card.querySelector("[data-play]");
      const heading = card.querySelector(".movie-copy h3");
      if (play && heading && !heading.querySelector("a")) {
        const id = play.getAttribute("data-play");
        const title = heading.textContent.trim();
        const link = document.createElement("a");
        link.className = "movie-link";
        link.href = "/movie/" + encodeURIComponent(id) + "/" + slug(title);
        link.textContent = title;
        heading.replaceChildren(link);
      }
      if (!opened && requested && play && play.getAttribute("data-play") === requested) {
        opened = true;
        play.click();
      }
    });
  }
  new MutationObserver(enhanceCards).observe(grid, { childList: true, subtree: true });
  enhanceCards();
})();
