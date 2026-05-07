import { getDriverEvents, setDriverEvents, getRemarksMarkers, setRemarksMarkers, drawGridAndLine, updateHoursFromEvents } from './canvas.js';
import { checkWarnings } from './ui-validation.js';
import { showGlobalMessage, setDropdownValue } from './globals-utils.js';


let driverEvents, remarksMarkers;

// Hook to local DOM element directly since this is an ES6 module now
export function setupPdfParser() {
  const dropZone = document.getElementById("dropZone");
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
  });
  dropZone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
  });
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0)
      processFile(e.dataTransfer.files[0]);
  });
  document
    .getElementById("pdfUpload")
    .addEventListener("change", function (event) {
      if (event.target.files && event.target.files.length > 0)
        processFile(event.target.files[0]);
    });
}

// Initializers moved to setupPdfParser

function processFile(file) {
  if (file && file.type === "application/pdf") {
    let fileReader = new FileReader();
    fileReader.onload = function () {
      let typedarray = new Uint8Array(this.result);
      pdfjsLib
        .getDocument(typedarray)
        .promise.then((pdf) => {
          return pdf.getPage(1).then((page) => {
            return page.getTextContent();
          });
        })
        .then((textContent) => {
          try {
            let textItems = textContent.items.map((item) => item.str);
            parseDispatchDataSafariSafe(textItems);
          } catch (e) {
            showGlobalMessage("Error extracting data: " + e.message);
            console.error(e);
          }
        })
        .catch((err) => {
          showGlobalMessage(
            "Error reading PDF. Details: " + (err.message || err),
          );
          console.error(err);
        });
    };
    fileReader.readAsArrayBuffer(file);
  }
}

function parseDispatchDataSafariSafe(textItems) {
  let fullText = textItems.join(" ");
  let dateMatch = fullText.match(/Date:\s*(\d{4}\/\d{2}\/\d{2})/i);
  if (dateMatch)
    document.getElementById("date").value = dateMatch[1].replace(/\//g, "-");

  let dutyMatch = fullText.match(
    /Duty\s*#(?:[\s\-\/\|]*(?:Time-?In|Signature|Duty|List|Division:?|MST|TDA|CJW|SCO|SBB|Time-?out|REG|SBT|SRB|RDO))*\s*([A-Z0-9]+(?:\+[A-Z0-9]+)?)/i,
  );
  if (dutyMatch) document.getElementById("dutyNum").value = dutyMatch[1];

  let empMatch = fullText.match(/(\d{3,6})\s*-\s*([A-Za-z]+)\s+([A-Za-z]+)/);
  let empId = "";
  if (empMatch) {
    empId = empMatch[1];
    document.getElementById("empNum").value = empId;
    document.getElementById("driverName").value =
      empMatch[3] + " " + empMatch[2];
  }

  if (!empId) {
    showGlobalMessage("Could not locate driver information in the document.");
    return;
  }

  let cityMap = {
    CJW: "Salinas, CA",
    SCO: "King City, CA",
    TDA: "Monterey, CA",
    SBB: "King City, CA",
  };
  let locationMatches = fullText.match(/\b(CJW|SCO|TDA|SBB)\b/gi);
  let defaultCity = "Monterey, CA";

  if (locationMatches && locationMatches.length > 0) {
    let firstLoc = locationMatches[0].toUpperCase();
    let lastLoc = locationMatches[locationMatches.length - 1].toUpperCase();
    setDropdownValue("fromCity", cityMap[firstLoc] || firstLoc);
    setDropdownValue("toCity", cityMap[lastLoc] || lastLoc);

    let termSelect = document.getElementById("homeTerminal");
    let firstLocCode = firstLoc === "SBB" ? "SCO" : firstLoc;
    for (let i = 0; i < termSelect.options.length; i++) {
      if (termSelect.options[i].value === firstLocCode) {
        termSelect.selectedIndex = i;
        break;
      }
    }
    defaultCity = cityMap[firstLoc] || defaultCity;
  }

  let rowSplitRegex = new RegExp("(?=" + empId + "\\b)", "g");
  let rows = fullText.split(rowSplitRegex);
  let totalMiles = 0.0;
  let vehicles = new Set();

  driverEvents = [];
  remarksMarkers = [];

  function parseTime(timeStr) {
    let match = timeStr.match(/(\d{1,2})(\d{2})([ap])/);
    if (!match) return 0;
    let hrs = parseInt(match[1]);
    let mins = parseInt(match[2]);
    let isPm = match[3] === "p";
    if (isPm && hrs !== 12) hrs += 12;
    if (!isPm && hrs === 12) hrs = 0;
    return hrs + mins / 60;
  }

  let lastCityName = defaultCity;

  rows.forEach((row) => {
    let times = row.match(/(\d{1,2}\d{2}[ap])/g);
    if (!times || times.length < 2) return;

    let start = times[0];
    let end = times[1];

    let rowLocMatch = row.match(/\b(CJW|SCO|TDA|SBB)\b/i);
    if (rowLocMatch)
      lastCityName = cityMap[rowLocMatch[1].toUpperCase()] || lastCityName;

    let beforeTime = row.split(start)[0];
    let possibleVehicles = beforeTime.match(/\b\d{2,5}\b/g);
    if (possibleVehicles) {
      possibleVehicles.forEach((num) => {
        if (num === empId) return;
        let afterNumRegex = new RegExp("\\b" + num + "\\s+(.*)");
        let afterMatch = beforeTime.match(afterNumRegex);
        if (afterMatch && afterMatch[1]) {
          let nextWord = afterMatch[1].trim().split(/\s+/)[0];
          if (!/^[A-Z]{3,6}$/.test(nextWord)) vehicles.add(num);
        } else {
          vehicles.add(num);
        }
      });
    }

    let lowerRow = row.toLowerCase();
    let status = "DRIVE";
    let isReliefUnit = /\b(tda|cjw|sco|sbb)\s*-\s*\d+\b/i.test(lowerRow);

    if (lowerRow.includes("unpaid")) status = "OFF";
    else if (
      lowerRow.includes("sign-on") ||
      lowerRow.includes("standby") ||
      lowerRow.includes("rest") ||
      lowerRow.includes("joinup") ||
      lowerRow.includes("prep in") ||
      lowerRow.includes("prep out") ||
      lowerRow.includes("travel") ||
      isReliefUnit
    )
      status = "ON";
    else status = "DRIVE";

    if (!isReliefUnit) {
      let milesMatch = row.match(/(\d+\.\d{3,4})/g);
      if (milesMatch)
        totalMiles += parseFloat(milesMatch[milesMatch.length - 1]);
    }

    let startDec = parseTime(start);
    let endDec = parseTime(end);
    let duration = endDec - startDec;
    if (duration < 0) duration += 24;

    driverEvents.push({
      status: status,
      startHour: startDec,
      endHour: endDec,
      city: lastCityName,
    });
  });

  if (vehicles.size > 0)
    document.getElementById("vehicleNum").value =
      Array.from(vehicles).join(", ");
  document.getElementById("totalMiles").value = totalMiles.toFixed(1);

  let lastStatus = "OFF";
  let lastEndHour = 0;

  driverEvents.forEach((ev) => {
    if (ev.startHour > lastEndHour + 0.02) lastStatus = "OFF";
    if (ev.status === "ON" && lastStatus !== "ON") {
      if (!remarksMarkers.some((m) => Math.abs(m.time - ev.startHour) < 0.05)) {
        remarksMarkers.push({ time: ev.startHour, city: ev.city });
      }
    }
    lastStatus = ev.status;
    lastEndHour = ev.endHour;
  });
  setDriverEvents(driverEvents);
  setRemarksMarkers(remarksMarkers);

  document.getElementById("chkPassengers").checked = true;
  document.getElementById("remarksContainer").style.borderColor = "#ccc";
  document.getElementById("remarksContainer").classList.remove("warning-field");

  updateHoursFromEvents();
  document
    .querySelectorAll("input[required]")
    .forEach((el) => (el.style.borderColor = "#ccc"));
  drawGridAndLine();
  checkWarnings();
}
