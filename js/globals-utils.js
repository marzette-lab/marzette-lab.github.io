export function setupGlobals() {
  let d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const todayStr = `${year}-${month}-${day}`;

  const dateInput = document.getElementById("date");
  if (dateInput) {
    dateInput.setAttribute("max", todayStr);
    dateInput.value = todayStr;
  }

  const cancelBtn = document.getElementById("btn-confirm-cancel");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      document.getElementById("globalConfirmModal").style.display = "none";
      if (confirmCallback) confirmCallback(false);
    });
  }

  const yesBtn = document.getElementById("btn-confirm-yes");
  if (yesBtn) {
    yesBtn.addEventListener("click", () => {
      document.getElementById("globalConfirmModal").style.display = "none";
      if (confirmCallback) confirmCallback(true);
    });
  }

  const pCancelBtn = document.getElementById("btn-prompt-cancel");
  if (pCancelBtn) {
    pCancelBtn.addEventListener("click", () => {
      document.getElementById("globalPromptModal").style.display = "none";
      if (promptCallback) promptCallback(null);
    });
  }

  const pSubmitBtn = document.getElementById("btn-prompt-submit");
  if (pSubmitBtn) pSubmitBtn.addEventListener("click", submitPrompt);

  const pInput = document.getElementById("globalPromptInput");
  if (pInput) {
    pInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submitPrompt();
      if (e.key === "Escape") {
        document.getElementById("globalPromptModal").style.display = "none";
        if (promptCallback) promptCallback(null);
      }
    });
  }

  const dismissHandler = (e) => {
    if (["INPUT", "SELECT", "TEXTAREA", "CANVAS"].includes(e.target.tagName)) {
      hideGlobalMessage();
    }
  };
  document.addEventListener("focusin", dismissHandler);
  document.addEventListener("click", dismissHandler);
}

export function setDropdownValue(id, value) {
  const select = document.getElementById(id);
  const opts = Array.from(select.options);
  if (opts.some((opt) => opt.value === value)) {
    select.value = value;
  } else {
    const defaultOpt = opts.find(
      (opt) => opt.value === "Monterey, CA" || opt.value === "Salinas, CA",
    );
    if (defaultOpt) select.value = defaultOpt.value;
  }
}

let confirmCallback = null;
export function showGlobalConfirm(msg, callback) {
  const el = document.getElementById("globalConfirmModal");
  const textEl = document.getElementById("globalConfirmText");
  if (!el || !textEl) return callback(false);
  textEl.innerHTML = msg;
  el.style.display = "flex";
  confirmCallback = callback;
}

let globalMessageTimeout = null;

export function hideGlobalMessage() {
  const el = document.getElementById("globalErrorMsg");
  if (el && el.style.display !== "none" && !el.classList.contains("fade-out")) {
    el.classList.add("fade-out");
    setTimeout(() => {
      if (el.classList.contains("fade-out")) {
        el.style.display = "none";
        el.classList.remove("fade-out");
      }
    }, 400);
  }
  if (globalMessageTimeout) {
    clearTimeout(globalMessageTimeout);
    globalMessageTimeout = null;
  }
}

export function showGlobalMessage(msg, isSuccess = false) {
  const el = document.getElementById("globalErrorMsg");
  if (!el) return;
  
  if (globalMessageTimeout) clearTimeout(globalMessageTimeout);
  
  const iconClass = isSuccess ? "fa-solid fa-circle-check" : "fa-solid fa-triangle-exclamation";
  el.innerHTML = `<i class="${iconClass}" style="font-size: 18px; animation: icon-pulse-glow 2s infinite ease-in-out;"></i> ${msg}`;
  el.className = isSuccess ? "global-error success-msg no-print" : "global-error no-print";
  el.style.display = "flex";
  
  globalMessageTimeout = setTimeout(() => {
    hideGlobalMessage();
  }, 10000);
  
  window.scrollTo({ top: 0, behavior: "smooth" });
}

let promptCallback = null;
export function showGlobalPrompt(title, msg, placeholder, callback) {
  const el = document.getElementById("globalPromptModal");
  const titleEl = document.getElementById("globalPromptTitle");
  const textEl = document.getElementById("globalPromptText");
  const inputEl = document.getElementById("globalPromptInput");
  if (!el || !inputEl) return callback(null);
  titleEl.innerText = title;
  textEl.innerText = msg;
  inputEl.placeholder = placeholder || "";
  inputEl.value = "";
  el.style.display = "flex";
  inputEl.focus();
  promptCallback = callback;
}

function submitPrompt() {
  document.getElementById("globalPromptModal").style.display = "none";
  if (promptCallback) {
    promptCallback(document.getElementById("globalPromptInput").value.trim() || null);
  }
}
