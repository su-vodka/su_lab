// ---------------------------------------------
// DOM読み込み後の初期化
// ---------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  // ---------------------------------------------
  // Intersection Observerでフェードイン制御
  // ---------------------------------------------
  const animatedElements = document.querySelectorAll("[data-animate]");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.25 }
  );
  animatedElements.forEach((el) => observer.observe(el));

  // ---------------------------------------------
  // Hero orb burst interactions
  // ---------------------------------------------
  const heroOrb = document.querySelector(".hero-orb");
  if (heroOrb) {
    const particleCanvas = heroOrb.querySelector(".orb-particles");
    const ctx = particleCanvas?.getContext?.("2d") ?? null;
    let particles = [];
    let particleFrameId = null;
    let particleTimeoutId = null;
    let cleanupTimeoutId = null;
    let reducedMotionFeedbackId = null;
    let lastFrameTime = 0;
    let canvasSize = { width: 0, height: 0 };

    const motionQuery = window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : { matches: false, addEventListener: null, addListener: null };
    let prefersReducedMotion = !!motionQuery.matches;

    const parseDuration = (value, fallback) => {
      if (!value) return fallback;
      const trimmed = `${value}`.trim();
      if (!trimmed) return fallback;
      const numeric = parseFloat(trimmed);
      if (Number.isNaN(numeric)) return fallback;
      return trimmed.endsWith("ms") ? numeric : numeric * 1000;
    };

    const syncCanvasSize = () => {
      if (!particleCanvas || !ctx) return;
      const rect = heroOrb.getBoundingClientRect();
      canvasSize = { width: rect.width, height: rect.height };
      const dpr = window.devicePixelRatio || 1;
      particleCanvas.width = rect.width * dpr;
      particleCanvas.height = rect.height * dpr;
      particleCanvas.style.width = `${rect.width}px`;
      particleCanvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
    };

    const stopParticles = () => {
      if (particleFrameId) cancelAnimationFrame(particleFrameId);
      particleFrameId = null;
      if (particleTimeoutId) clearTimeout(particleTimeoutId);
      particleTimeoutId = null;
      particles = [];
      lastFrameTime = 0;
      if (ctx && canvasSize.width && canvasSize.height) {
        ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
        ctx.globalAlpha = 1;
      }
      particleCanvas?.classList.remove("is-active");
    };

    const cleanupBurst = () => {
      heroOrb.classList.remove("is-bursting", "is-reduced-feedback");
      heroOrb.removeAttribute("aria-busy");
      heroOrb.style.removeProperty("--burst-start-delay");
      if (cleanupTimeoutId) clearTimeout(cleanupTimeoutId);
      cleanupTimeoutId = null;
      if (reducedMotionFeedbackId) clearTimeout(reducedMotionFeedbackId);
      reducedMotionFeedbackId = null;
      stopParticles();
    };

    const startParticles = (styles) => {
      if (!particleCanvas || !ctx) return;
      syncCanvasSize();
      const count = (() => {
        const parsed = parseInt(styles.getPropertyValue("--particle-count"), 10);
        return Number.isFinite(parsed) ? parsed : 90;
      })();

      if (!count) return;
      const origin = { x: canvasSize.width / 2, y: canvasSize.height / 2 };
      particles = Array.from({ length: count }, () => {
        const angle = Math.random() * Math.PI * 2;
        const speed = 80 + Math.random() * 140;
        const ttl = 0.55 + Math.random() * 0.55;
        return {
          x: origin.x,
          y: origin.y,
          angle,
          speed,
          ttl,
          life: ttl,
          drift: (Math.random() - 0.5) * 0.4,
          size: 1 + Math.random() * 2.2,
        };
      });

      if (!particles.length) return;
      particleCanvas.classList.add("is-active");
      lastFrameTime = 0;

      const render = (timestamp) => {
        if (!lastFrameTime) lastFrameTime = timestamp;
        const delta = (timestamp - lastFrameTime) / 1000;
        lastFrameTime = timestamp;

        ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
        particles = particles.filter((particle) => particle.life > 0);

        particles.forEach((particle) => {
          particle.life -= delta;
          particle.x += Math.cos(particle.angle) * particle.speed * delta;
          particle.y += Math.sin(particle.angle) * particle.speed * delta;
          particle.angle += particle.drift * delta;
          const intensity = Math.max(particle.life / particle.ttl, 0);
          ctx.globalAlpha = intensity;
          ctx.fillStyle = "rgba(120, 230, 255, 1)";
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fill();
        });

        ctx.globalAlpha = 1;

        if (particles.length) {
          particleFrameId = requestAnimationFrame(render);
        } else {
          stopParticles();
        }
      };

      particleFrameId = requestAnimationFrame(render);

      const particleDuration = parseDuration(
        styles.getPropertyValue("--particle-duration"),
        1100
      );
      if (particleTimeoutId) clearTimeout(particleTimeoutId);
      particleTimeoutId = setTimeout(() => {
        stopParticles();
      }, particleDuration);
    };

    const triggerBurst = () => {
      if (heroOrb.classList.contains("is-bursting")) {
        cleanupBurst();
        heroOrb.getBoundingClientRect(); // force reflow so CSS animations restart
      }

      if (prefersReducedMotion) {
        heroOrb.classList.add("is-reduced-feedback");
        if (reducedMotionFeedbackId) clearTimeout(reducedMotionFeedbackId);
        reducedMotionFeedbackId = setTimeout(
          () => heroOrb.classList.remove("is-reduced-feedback"),
          260
        );
        return;
      }

      const styles = getComputedStyle(heroOrb);
      heroOrb.classList.add("is-bursting");
      heroOrb.setAttribute("aria-busy", "true");
      const ringDurationMs = parseDuration(styles.getPropertyValue("--ring-duration"), 800);
      const ringStackDuration = ringDurationMs * 2;
      const burstDuration = parseDuration(styles.getPropertyValue("--burst-duration"), 700);
      const recoveryDuration = parseDuration(
        styles.getPropertyValue("--recovery-duration"),
        850
      );
      const burstStartDelay = Math.max(ringStackDuration - 500, 0);
      heroOrb.style.setProperty("--burst-start-delay", `${burstStartDelay}ms`);

      startParticles(styles);

      const totalDuration = burstStartDelay + burstDuration + recoveryDuration;

      if (cleanupTimeoutId) clearTimeout(cleanupTimeoutId);
      cleanupTimeoutId = setTimeout(() => {
        cleanupBurst();
      }, totalDuration + 80);
    };

    heroOrb.addEventListener("click", () => {
      triggerBurst();
    });

    heroOrb.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        triggerBurst();
      }
    });

    const handleMotionChange = (event) => {
      prefersReducedMotion = event.matches;
      if (prefersReducedMotion) {
        cleanupBurst();
      }
    };

    if (motionQuery.addEventListener) {
      motionQuery.addEventListener("change", handleMotionChange);
    } else if (motionQuery.addListener) {
      motionQuery.addListener(handleMotionChange);
    }

    window.addEventListener("resize", () => {
      if (heroOrb.classList.contains("is-bursting")) {
        syncCanvasSize();
      }
    });
  }

  // ---------------------------------------------
  // Worksカードのモーダル開閉
  // ---------------------------------------------
  const workCards = document.querySelectorAll(".work-card");
  const modals = document.querySelectorAll(".work-modal");

  const syncBodyScrollLock = () => {
    const hasActiveModal = Array.from(modals).some((modal) => modal.classList.contains("active"));
    document.body.classList.toggle("modal-open", hasActiveModal);
  };

  const openModal = (targetId) => {
    const modal = document.getElementById(targetId);
    if (!modal) return;
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    syncBodyScrollLock();
  };

  const closeModal = (modal) => {
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    syncBodyScrollLock();
  };

  workCards.forEach((card) => {
    card.addEventListener("click", () => {
      const targetId = card.dataset.modal;
      openModal(targetId);
    });
  });

  modals.forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (
        event.target.classList.contains("work-modal") ||
        event.target.classList.contains("close-modal")
      ) {
        closeModal(modal);
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      modals.forEach((modal) => closeModal(modal));
    }
  });

  // ---------------------------------------------
  // Worksカードの自動スクロール（表示時のみ）
  // ---------------------------------------------
  const autoScrollContainers = document.querySelectorAll(".auto-scroll");
  const scrollControllers = new Map();

  autoScrollContainers.forEach((container) => {
    let direction = 1;
    let paused = false;
    let running = false;
    let resumeTimeoutId = null;
    const speed = 1; // px/frame

    const maxScroll = () => container.scrollWidth - container.clientWidth;
    const dotsWrapper = container.nextElementSibling;
    const dots =
      dotsWrapper && dotsWrapper.classList.contains("slider-dots")
        ? (() => {
            dotsWrapper.innerHTML = "";
            const count = container.querySelectorAll(".work-card").length;
            const created = [];
            for (let i = 0; i < count; i += 1) {
              const dot = document.createElement("span");
              dotsWrapper.appendChild(dot);
              created.push(dot);
            }
            if (created.length === 0) {
              const dot = document.createElement("span");
              dotsWrapper.appendChild(dot);
              created.push(dot);
            }
            return created;
          })()
        : [];

    const updateDots = () => {
      if (!dots.length) return;
      const limit = Math.max(0, maxScroll());
      const ratio = limit === 0 ? 0 : container.scrollLeft / limit;
      const activeIndex = Math.min(dots.length - 1, Math.round(ratio * (dots.length - 1)));
      dots.forEach((dot, index) => {
        const isActive = index === activeIndex;
        const isNeighbor = index === activeIndex - 1 || index === activeIndex + 1;
        dot.classList.toggle("active", isActive);
        dot.classList.toggle("neighbor", isNeighbor && !isActive);
      });
    };

    const clearResumeTimeout = () => {
      if (resumeTimeoutId) {
        clearTimeout(resumeTimeoutId);
        resumeTimeoutId = null;
      }
    };

    const pauseNow = () => {
      paused = true;
      clearResumeTimeout();
    };

    const resumeAfter = (delay = 2500) => {
      clearResumeTimeout();
      resumeTimeoutId = setTimeout(() => {
        paused = false;
      }, delay);
    };

    const loop = () => {
      if (!running) return;
      const limit = Math.max(0, maxScroll());
      if (!paused && limit > 0) {
        const next = Math.min(limit, Math.max(0, container.scrollLeft + direction * speed));
        container.scrollLeft = next;
        updateDots();
        if (next <= 0) {
          direction = 1;
          pauseNow();
          resumeAfter(3000);
        } else if (next >= limit) {
          direction = -1;
          pauseNow();
          resumeAfter(3000);
        }
      }
      requestAnimationFrame(loop);
    };

    const start = () => {
      if (running) return;
      running = true;
      loop();
    };

    const stop = () => {
      running = false;
    };

    container.addEventListener("mouseenter", pauseNow);
    container.addEventListener("mouseleave", () => resumeAfter());
    container.addEventListener("touchstart", pauseNow, { passive: true });
    const handleTouchEnd = () => resumeAfter();
    container.addEventListener("touchend", handleTouchEnd);
    container.addEventListener("touchcancel", handleTouchEnd);
    container.addEventListener("scroll", updateDots, { passive: true });

    let isDragging = false;
    let dragStartX = 0;
    let dragStartScroll = 0;

    const getPointerX = (event) => {
      if (typeof event.clientX === "number") return event.clientX;
      if (event.touches && event.touches[0]) return event.touches[0].clientX;
      if (event.changedTouches && event.changedTouches[0]) return event.changedTouches[0].clientX;
      return 0;
    };

    const handlePointerDown = (event) => {
      if (event.target.closest(".work-card")) return; // カード上の操作はモーダル用に保持
      if (event.pointerType === "mouse" && event.button !== 0) return;
      pauseNow();
      isDragging = true;
      dragStartX = getPointerX(event);
      dragStartScroll = container.scrollLeft;
      container.classList.add("is-dragging");
      container.setPointerCapture?.(event.pointerId);
    };

    const handlePointerMove = (event) => {
      if (!isDragging) return;
      const currentX = getPointerX(event);
      const delta = currentX - dragStartX;
      const limit = Math.max(0, maxScroll());
      const target = Math.min(limit, Math.max(0, dragStartScroll - delta));
      container.scrollLeft = target;
      updateDots();
      if (event.cancelable) event.preventDefault();
    };

    const handlePointerUp = (event) => {
      if (!isDragging) return;
      isDragging = false;
      container.classList.remove("is-dragging");
      container.releasePointerCapture?.(event.pointerId);
      resumeAfter();
    };

    const scrollToDot = (index) => {
      const limit = Math.max(0, maxScroll());
      const ratio = dots.length <= 1 ? 0 : index / (dots.length - 1);
      const target = limit * ratio;
      pauseNow();
      container.scrollTo({ left: target, behavior: "smooth" });
      resumeAfter(1600);
      updateDots();
    };

    dots.forEach((dot, index) => {
      dot.addEventListener("click", () => scrollToDot(index));
      dot.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          scrollToDot(index);
        }
      });
      dot.setAttribute("tabindex", "-1");
    });

    container.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    updateDots();
    scrollControllers.set(container, { start, stop });
  });

  const sliderObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const controller = scrollControllers.get(entry.target);
        if (!controller) return;
        if (entry.isIntersecting) {
          controller.start();
        } else {
          controller.stop();
        }
      });
    },
    { threshold: 0.2 }
  );

  autoScrollContainers.forEach((container) => sliderObserver.observe(container));

  // ---------------------------------------------
  // Formspreeを使用した非同期フォーム送信
  // ---------------------------------------------
  const contactForm = document.getElementById("contactForm");
  const thankYouMessage = document.getElementById("thankYouMessage");

  if (contactForm) {
    contactForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const submitButton = contactForm.querySelector("button[type='submit']");
      submitButton.disabled = true;
      submitButton.textContent = "送信中...";

      const payload = Object.fromEntries(new FormData(contactForm).entries());

      try {
        const response = await fetch(contactForm.action, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok || result?.ok === false) {
          const message =
            result?.errors?.map((err) => err.message).join("\n") ??
            "Network response was not ok";
          throw new Error(message);
        }

        contactForm.reset();
        contactForm.style.display = "none";
        thankYouMessage.classList.add("is-visible");
      } catch (error) {
        alert("送信に失敗しました。時間をおいて再度お試しください。");
        console.error("Form submission error:", error);
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = "送信する";
      }
    });
  }
});
