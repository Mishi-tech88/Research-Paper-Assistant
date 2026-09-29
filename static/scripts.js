/* =========================================================================
   RESEARCH PAPER ASSISTANT — Desk Edition
   ========================================================================= */

(function () {
  "use strict";

  /* --------------------------------------------------------------------- */
  /*  Refs                                                                 */
  /* --------------------------------------------------------------------- */

  const uploadForm = document.getElementById("upload-form");
  const fileInput = document.getElementById("file-input");
  const dropzone = document.getElementById("dropzone-label");
  const fileList = document.getElementById("file-list");
  const uploadBtn = document.getElementById("upload-btn");

  const askForm = document.getElementById("ask-form");
  const questionInput = document.getElementById("question");
  const askBtn = document.getElementById("ask-btn");

  const suggestions = document.querySelectorAll(".suggestion");
  const answerSection = document.getElementById("answer-section");
  const copyBtn = document.getElementById("copy-answer");
  const toastContainer = document.getElementById("toast-container");

  /* --------------------------------------------------------------------- */
  /*  State                                                                */
  /* --------------------------------------------------------------------- */

  let stagedFiles = [];
  const MAX_SIZE_MB = 50;

  /* --------------------------------------------------------------------- */
  /*  Toasts                                                               */
  /* --------------------------------------------------------------------- */

  const ICONS = {
    success:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    error:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
  };

  function toast(message, type = "info", duration = 3200) {
    if (!toastContainer) return;

    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.innerHTML = `
            <span class="toast-icon">${ICONS[type] || ICONS.info}</span>
            <span class="toast-msg">${message}</span>
        `;

    toastContainer.appendChild(el);

    setTimeout(() => {
      el.classList.add("removing");
      el.addEventListener("animationend", () => el.remove(), { once: true });
    }, duration);
  }

  /* --------------------------------------------------------------------- */
  /*  Helpers                                                              */
  /* --------------------------------------------------------------------- */

  function formatBytes(bytes) {
    if (!bytes) return "0 B";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function syncFileInput() {
    const dt = new DataTransfer();
    stagedFiles.forEach((f) => dt.items.add(f));
    fileInput.files = dt.files;
  }

  function setBtnLoading(btn, loading, labelText) {
    if (!btn) return;
    btn.classList.toggle("is-loading", loading);
    btn.disabled = loading;
    if (labelText) {
      const label = btn.querySelector(".btn-label");
      if (label) label.textContent = labelText;
    }
  }

  /* --------------------------------------------------------------------- */
  /*  File list rendering                                                  */
  /* --------------------------------------------------------------------- */

  function renderFiles() {
    fileList.innerHTML = "";

    if (stagedFiles.length === 0) {
      fileList.hidden = true;
      uploadBtn.disabled = true;
      return;
    }

    stagedFiles.forEach((file, index) => {
      const item = document.createElement("li");

      const name = document.createElement("span");
      name.className = "name";
      name.textContent = file.name;
      name.title = file.name;

      const size = document.createElement("span");
      size.className = "size";
      size.textContent = formatBytes(file.size);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Remove";
      remove.addEventListener("click", () => {
        stagedFiles.splice(index, 1);
        syncFileInput();
        renderFiles();
        if (stagedFiles.length === 0) {
          toast("Queue cleared.", "info", 1800);
        }
      });

      item.append(name, size, remove);
      fileList.appendChild(item);
    });

    fileList.hidden = false;
    uploadBtn.disabled = false;
  }

  /* --------------------------------------------------------------------- */
  /*  Add files                                                            */
  /* --------------------------------------------------------------------- */

  function addFiles(files) {
    if (!files) return;

    let added = 0,
      skippedType = 0,
      skippedSize = 0,
      skippedDup = 0;

    Array.from(files).forEach((file) => {
      const isPDF = file.name.toLowerCase().endsWith(".pdf");
      if (!isPDF) {
        skippedType++;
        return;
      }

      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        skippedSize++;
        return;
      }

      const dup = stagedFiles.some(
        (f) => f.name === file.name && f.size === file.size,
      );
      if (dup) {
        skippedDup++;
        return;
      }

      stagedFiles.push(file);
      added++;
    });

    syncFileInput();
    renderFiles();

    if (added > 0) {
      toast(`Queued ${added} paper${added > 1 ? "s" : ""}.`, "success");
    }
    if (skippedType > 0) {
      toast(
        `Skipped ${skippedType} non-PDF file${skippedType > 1 ? "s" : ""}.`,
        "error",
      );
    }
    if (skippedSize > 0) {
      toast(
        `Skipped ${skippedSize} file${skippedSize > 1 ? "s" : ""} over ${MAX_SIZE_MB} MB.`,
        "error",
      );
    }
    if (skippedDup > 0 && added === 0) {
      toast(`Already in the queue.`, "info");
    }
  }

  /* --------------------------------------------------------------------- */
  /*  File input + drag-drop                                               */
  /* --------------------------------------------------------------------- */

  fileInput?.addEventListener("change", () => addFiles(fileInput.files));

  if (dropzone) {
    let dragDepth = 0;

    ["dragenter", "dragover"].forEach((evt) => {
      dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragDepth++;
        dropzone.classList.add("is-dragover");
      });
    });

    ["dragleave", "drop"].forEach((evt) => {
      dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragDepth = Math.max(0, dragDepth - 1);
        if (dragDepth === 0) dropzone.classList.remove("is-dragover");
      });
    });

    dropzone.addEventListener("drop", (e) => {
      if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
    });
  }

  ["dragover", "drop"].forEach((evt) => {
    window.addEventListener(evt, (e) => {
      if (!dropzone?.contains(e.target)) e.preventDefault();
    });
  });

  /* --------------------------------------------------------------------- */
  /*  Upload submit                                                        */
  /* --------------------------------------------------------------------- */

  uploadForm?.addEventListener("submit", (e) => {
    if (stagedFiles.length === 0) {
      e.preventDefault();
      toast("Add at least one PDF first.", "error");
      return;
    }
    syncFileInput();
    setBtnLoading(uploadBtn, true, "Processing…");
  });

  /* --------------------------------------------------------------------- */
  /*  Ask submit                                                           */
  /* --------------------------------------------------------------------- */

  askForm?.addEventListener("submit", (e) => {
    const q = questionInput.value.trim();

    if (!q) {
      e.preventDefault();
      questionInput.focus();
      toast("Enter a question first.", "error");
      return;
    }

    setBtnLoading(askBtn, true, "Searching…");
  });

  /* --------------------------------------------------------------------- */
  /*  Suggestion chips                                                     */
  /* --------------------------------------------------------------------- */

  suggestions.forEach((btn) => {
    btn.addEventListener("click", () => {
      const q = btn.getAttribute("data-question");
      if (q && questionInput) {
        questionInput.value = q;
        questionInput.focus();

        // Gold pulse on the input wrapper
        const wrapper = questionInput.closest(".input-wrapper");
        if (wrapper) {
          wrapper.animate(
            [
              { boxShadow: "0 0 0 0 rgba(229,180,92,0.45)" },
              { boxShadow: "0 0 0 14px rgba(229,180,92,0)" },
            ],
            { duration: 620, easing: "ease-out" },
          );
        }
      }
    });
  });

  /* --------------------------------------------------------------------- */
  /*  Copy answer                                                          */
  /* --------------------------------------------------------------------- */

  copyBtn?.addEventListener("click", async () => {
    const target = document.getElementById(copyBtn.dataset.target);
    if (!target) return;

    const text = target.innerText.trim();

    try {
      await navigator.clipboard.writeText(text);
      copyBtn.classList.add("is-copied");
      const label = copyBtn.querySelector("span");
      const original = label.textContent;
      label.textContent = "Copied";

      setTimeout(() => {
        copyBtn.classList.remove("is-copied");
        label.textContent = original;
      }, 1600);
    } catch {
      toast("Clipboard unavailable.", "error");
    }
  });

  /* --------------------------------------------------------------------- */
  /*  Server message → toast                                               */
  /* --------------------------------------------------------------------- */

  document.querySelectorAll("[data-server-message]").forEach((el) => {
    const text = el.textContent.trim();
    const isError = el.classList.contains("notice-error");
    if (text) toast(text, isError ? "error" : "success", 4200);
  });

  /* --------------------------------------------------------------------- */
  /*  Auto-scroll to response panel when answer renders                    */
  /* --------------------------------------------------------------------- */

  if (answerSection?.classList.contains("panel-response-active")) {
    requestAnimationFrame(() => {
      answerSection.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }

  /* --------------------------------------------------------------------- */
  /*  Keyboard shortcuts                                                   */
  /* --------------------------------------------------------------------- */

  document.addEventListener("keydown", (e) => {
    // "/" → focus question input (unless already typing)
    if (
      e.key === "/" &&
      document.activeElement !== questionInput &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey
    ) {
      e.preventDefault();
      questionInput?.focus();
    }

    // Esc → clear question input
    if (e.key === "Escape" && document.activeElement === questionInput) {
      questionInput.value = "";
    }

    // Ctrl/Cmd + Enter → submit ask
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      if (document.activeElement === questionInput) {
        askForm?.requestSubmit();
      }
    }
  });

  /* --------------------------------------------------------------------- */
  /*  Restore button states after back/forward navigation                  */
  /* --------------------------------------------------------------------- */

  window.addEventListener("pageshow", () => {
    setBtnLoading(uploadBtn, false, "Add to archive");
    setBtnLoading(askBtn, false, "Ask");
  });
})();
