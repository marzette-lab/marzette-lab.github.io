const openVideo = () => {
  document.getElementById("videoModal").style.display = "flex";
  const video = document.querySelector(".video-container video");
  if (video) video.play().catch((e) => console.log("Autoplay prevented by browser.", e));
};

const closeVideo = (event) => {
  if (event) event.stopPropagation();
  document.getElementById("videoModal").style.display = "none";
  const video = document.querySelector(".video-container video");
  if (video) { video.pause(); video.currentTime = 0; }
};

const openRoundingGuide = () => { document.getElementById("roundingModal").style.display = "flex"; };
const closeRoundingGuide = (event) => {
  if (event) event.stopPropagation();
  document.getElementById("roundingModal").style.display = "none";
};

const openManualModal = () => {
  const errBox = document.getElementById("manualErrorMsg");
  if (errBox) errBox.style.display = "none";
  document.getElementById("manualEntryModal").style.display = "flex";
};

const closeManualModal = (event) => {
  if (event) event.stopPropagation();
  document.getElementById("manualEntryModal").style.display = "none";
};

function evaluateMileage(inputElement) {
  let val = inputElement.value.trim();
  if (val && val.includes("+")) {
    let parts = val.split("+");
    let sum = 0;
    for (let part of parts) {
      let num = parseFloat(part.trim());
      if (!isNaN(num)) sum += num;
    }
    inputElement.value = sum.toFixed(1);
  } else if (val) {
    let num = parseFloat(val);
    if (!isNaN(num)) inputElement.value = num.toFixed(1);
  }
}

function handleDropdownCityAdd(selectElement) {
  if (selectElement.value === "Other") {
    window.showGlobalPrompt("Custom City", "Enter Custom City (e.g., San Jose, CA):", "City, ST", (customCity) => {
      if (customCity && customCity.trim() !== "") {
        let newOption = document.createElement("option");
        newOption.value = customCity.trim();
        newOption.text = customCity.trim();
        selectElement.add(newOption, selectElement.options[selectElement.options.length - 1]);
        selectElement.value = customCity.trim();
      } else {
        selectElement.value = "";
      }
      if (window.checkPrintExceptionState) window.checkPrintExceptionState();
    });
  }
  if (selectElement.checkValidity()) selectElement.style.borderColor = "#ccc";
  if (selectElement.value.trim() !== "") selectElement.classList.remove("warning-field");
  if (window.checkPrintExceptionState) window.checkPrintExceptionState();
}

function addCity(city) {
  if (city === "Other...") {
    window.showGlobalPrompt("Custom City", "Enter City and ST (e.g., San Jose, CA):", "City, ST", (customCity) => {
      if (customCity) validateAndPushCity(customCity);
      else document.getElementById("cityContextMenu").style.display = "none";
    });
    return;
  }
  validateAndPushCity(city);
}

function validateAndPushCity(cityVal) {
  document.getElementById("cityContextMenu").style.display = "none";
  let formatValid = /^[^,]+,\s*[A-Za-z]{2}$/.test(cityVal.trim());
  if (formatValid) {
    let snappedTime = window.snapToNearestOnDutyStart(window.pendingMarkerTime);
    remarksMarkers.push({ time: snappedTime, city: cityVal.trim() });
    
    drawGridAndLine();
    const cw = document.getElementById("canvasWrapper");
    if (cw) {
      cw.classList.remove("warning-field");
      cw.style.borderColor = "#333";
      cw.style.backgroundColor = "#fff";
    }
    if (window.checkPrintExceptionState) window.checkPrintExceptionState();
  } else {
    window.showGlobalMessage("Invalid format. Please enter City, ST (e.g., Monterey, CA).");
  }
}

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btn-city-monterey").addEventListener("click", () => addCity("Monterey, CA"));
  document.getElementById("btn-city-salinas").addEventListener("click", () => addCity("Salinas, CA"));
  document.getElementById("btn-city-kingcity").addEventListener("click", () => addCity("King City, CA"));
  document.getElementById("btn-city-other").addEventListener("click", () => addCity("Other..."));
  
  document.getElementById("videoModal").addEventListener("click", closeVideo);
  document.getElementById("video-modal-content").addEventListener("click", (event) => event.stopPropagation());
  document.getElementById("btn-close-video").addEventListener("click", closeVideo);
  
  document.getElementById("roundingModal").addEventListener("click", closeRoundingGuide);
  document.getElementById("rounding-modal-content").addEventListener("click", (event) => event.stopPropagation());
  document.getElementById("btn-close-rounding").addEventListener("click", closeRoundingGuide);
  
  document.getElementById("btn-open-manual").addEventListener("click", openManualModal);
  document.getElementById("btn-close-manual").addEventListener("click", closeManualModal);
  document.getElementById("manual-entry-modal-content").addEventListener("click", (event) => event.stopPropagation());
  document.getElementById("manualEntryModal").addEventListener("click", closeManualModal);
  
  document.getElementById("btn-toolbar-refresh").addEventListener("click", () => window.location.reload());
  document.getElementById("btn-toolbar-print-exception").addEventListener("click", () => printException());
  document.getElementById("btn-toolbar-tutorial").addEventListener("click", () => openVideo());
  document.getElementById("btn-toolbar-print").addEventListener("click", () => validateAndPrint());
  
  document.getElementById("fromCity").addEventListener("change", function () { handleDropdownCityAdd(this); });
  document.getElementById("toCity").addEventListener("change", function () { handleDropdownCityAdd(this); });
  
  const btnInfoMiles = document.getElementById("btn-info-miles");
  if (btnInfoMiles) {
    btnInfoMiles.addEventListener("click", (event) => {
      event.preventDefault();
      showGlobalMessage("Do not include RU miles in your total.");
    });
  }

  document.getElementById("btn-info-rounding").addEventListener("click", () => openRoundingGuide());
  document.getElementById("btn-grid-fill-off").addEventListener("click", () => fillOffDuty());
  document.getElementById("btn-grid-clear").addEventListener("click", () => clearGrid());

  const showManualError = (msg) => {
    const errBox = document.getElementById("manualErrorMsg");
    if (errBox) { errBox.innerText = msg; errBox.style.display = "block"; }
  };

  document.getElementById("btn-manual-add").addEventListener("click", () => {
    const errBox = document.getElementById("manualErrorMsg");
    if (errBox) errBox.style.display = "none";

    const status = document.getElementById("manualStatus").value;
    const startStr = document.getElementById("manualStart").value;
    const endStr = document.getElementById("manualEnd").value;

    if (!startStr || !endStr) { showManualError("Please enter both start and end times."); return; }

    const startDec = parseTimeToDecimal(startStr);
    let endDec = parseTimeToDecimal(endStr);
    if (endDec < startDec) endDec += 24;
    if (startDec === endDec) { showManualError("Start and End times cannot be exactly the same."); return; }

    addEvent({ status, startHour: startDec, endHour: endDec });
    updateHoursFromEvents();
    drawGridAndLine();

    document.getElementById("manualStart").value = "";
    document.getElementById("manualEnd").value = "";
    window.showGlobalMessage("Duty time added successfully.", true);
  });

  document.getElementById("btn-manual-remark-add").addEventListener("click", () => {
    const errBox = document.getElementById("manualErrorMsg");
    if (errBox) errBox.style.display = "none";

    const timeStr = document.getElementById("manualRemarkTime").value;
    const cityVal = document.getElementById("manualCity").value.trim();

    if (!timeStr) { showManualError("Please select a time for the remark."); return; }
    if (!cityVal) { showManualError("Please enter a City and State."); return; }
    let formatValid = /^[^,]+,\s*[A-Za-z]{2}$/.test(cityVal);
    if (!formatValid) { showManualError("Invalid format. Please use City, ST (e.g., Monterey, CA)"); return; }

    let timeDec = parseTimeToDecimal(timeStr);
    timeDec = window.snapToNearestOnDutyStart(timeDec);
    
    remarksMarkers.push({ time: timeDec, city: cityVal });
    drawGridAndLine();

    document.getElementById("manualRemarkTime").value = "";
    document.getElementById("manualCity").value = "";
    const cw = document.getElementById("canvasWrapper");
    if (cw) { cw.classList.remove("warning-field"); cw.style.borderColor = "#333"; cw.style.backgroundColor = "#fff"; }
    window.showGlobalMessage("City remark added successfully.", true);
    if (window.checkPrintExceptionState) window.checkPrintExceptionState();
  });

  const autoRoundTime = (e) => {
    let val = e.target.value;
    if (!val) return;
    let [h, m] = val.split(":");
    let mins = parseInt(m);
    
    // FEATURE UPDATE: Round manual entries to nearest 7.5-minute increment mathematically
    const intervals = [0, 8, 15, 23, 30, 38, 45, 53, 60];
    let closest = intervals.reduce((prev, curr) => 
      Math.abs(curr - mins) < Math.abs(prev - mins) ? curr : prev
    );

    if (closest === 60) {
      closest = 0;
      h = String((parseInt(h) + 1) % 24).padStart(2, "0");
    }
    e.target.value = `${h}:${String(closest).padStart(2, "0")}`;
  };

  document.getElementById("manualStart").addEventListener("change", autoRoundTime);
  document.getElementById("manualEnd").addEventListener("change", autoRoundTime);
  document.getElementById("manualRemarkTime").addEventListener("change", autoRoundTime);

  window.addEventListener("beforeprint", () => {
    drawGridAndLine(true);
    let printClone = document.getElementById("print-clone-container");
    if (printClone) printClone.remove();

    printClone = document.createElement("div");
    printClone.id = "print-clone-container";
    printClone.style.pageBreakBefore = "always";

    const originalContainer = document.querySelector(".container");
    const clonedHtml = originalContainer.cloneNode(true);
    printClone.appendChild(clonedHtml);

    const originalCanvas = document.getElementById("logGrid");
    const clonedCanvas = printClone.querySelector("#logGrid");
    if (originalCanvas && clonedCanvas) clonedCanvas.getContext("2d").drawImage(originalCanvas, 0, 0);

    const orgInputs = originalContainer.querySelectorAll("input, select, textarea");
    const newInputs = printClone.querySelectorAll("input, select, textarea");
    orgInputs.forEach((input, index) => {
      if (newInputs[index]) {
        if (input.type === "checkbox" || input.type === "radio") newInputs[index].checked = input.checked;
        else newInputs[index].value = input.value;
      }
    });
    document.body.appendChild(printClone);
  });

  window.addEventListener("afterprint", () => {
    drawGridAndLine(false);
    const printClone = document.getElementById("print-clone-container");
    if (printClone) printClone.remove();
  });

  const totalMilesInput = document.getElementById("totalMiles");
  if(totalMilesInput) {
    totalMilesInput.addEventListener("blur", function () { evaluateMileage(this); });
    totalMilesInput.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); this.blur(); }});
  }

  // BUG FIX: Explicitly initialize the grid on page load so the 24hr OFF block paints properly
  if (typeof updateHoursFromEvents === "function") updateHoursFromEvents();
  if (typeof drawGridAndLine === "function") drawGridAndLine();
  if (typeof window.checkPrintExceptionState === "function") window.checkPrintExceptionState();
});

function parseTimeToDecimal(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(":");
  const hrs = parseInt(parts[0], 10);
  const mins = parseInt(parts[1], 10);
  return hrs + mins / 60;
}