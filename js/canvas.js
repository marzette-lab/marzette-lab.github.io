const canvasConfig = {
  leftMargin: 100,
  topMargin: 35,
  gridHeight: 150,
  get gridWidth() { return 820 - this.leftMargin - 100; },
  get gridBottom() { return this.topMargin + this.gridHeight; },
  get remarksLineY() { return this.gridBottom + 20; },
};

const getStatusY = (status) => {
  const { topMargin, gridHeight } = canvasConfig;
  const rowHeight = gridHeight / 3;
  const multipliers = { OFF: 0.5, DRIVE: 1.5, ON: 2.5 };
  return topMargin + rowHeight * (multipliers[status] || 0.5);
};

function formatTime(decimalHours) {
  if (decimalHours < 0) decimalHours = 0;
  if (decimalHours > 24) decimalHours = 24;
  let hrs = Math.floor(decimalHours);
  let mins = Math.round((decimalHours - hrs) * 60);
  if (mins === 60) { hrs++; mins = 0; }
  let ampm = hrs >= 12 && hrs < 24 ? "PM" : "AM";
  let dispHrs = hrs % 12;
  if (dispHrs === 0) dispHrs = 12;
  let dispMins = mins.toString().padStart(2, "0");
  return `${dispHrs}:${dispMins} ${ampm}`;
}

function clearGrid() {
  window.showGlobalConfirm(
    "Are you sure you want to completely clear the grid?",
    (confirmed) => {
      if (confirmed) {
        driverEvents = [{ status: "OFF", startHour: 0, endHour: 24 }];
        remarksMarkers = [];
        updateHoursFromEvents();
        drawGridAndLine();
        const cw = document.getElementById("canvasWrapper");
        cw.classList.remove("warning-field");
        cw.style.borderColor = "#333";
        cw.style.backgroundColor = "#fff";
        
        if (window.checkPrintExceptionState) window.checkPrintExceptionState();
      }
    },
  );
}

function drawGridAndLine(isPrinting = false) {
  const canvas = document.getElementById("logGrid");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const { leftMargin, topMargin, gridWidth, gridHeight, gridBottom, remarksLineY } = canvasConfig;
  const labels = ["OFF DUTY", "DRIVING", "ON DUTY"];
  const numRows = labels.length;
  const rowHeight = gridHeight / numRows;

  // Print Fix: Force solid black on print to avoid faint blue lines on B&W printers
  const lineColor = isPrinting ? "#000000" : "#0000FF";
  const errColor = isPrinting ? "#000000" : "red";

  ctx.font = "14px Arial";
  ctx.fillStyle = "#000";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  for (let i = 0; i <= numRows; i++) {
    const y = topMargin + i * rowHeight;
    if (i < numRows) {
      if (labels[i] === "ON DUTY") {
        ctx.fillText("ON DUTY", leftMargin - 10, y + rowHeight / 2 - 10);
        ctx.font = "9px Arial";
        ctx.fillText("(SB/PRE-TRIP/", leftMargin - 10, y + rowHeight / 2 + 4);
        ctx.fillText("RU/ETC.)", leftMargin - 10, y + rowHeight / 2 + 14);
        ctx.font = "14px Arial";
      } else if (labels[i] === "DRIVING") {
        ctx.fillText("DRIVING", leftMargin - 10, y + rowHeight / 2 - 6);
        ctx.font = "10px Arial";
        ctx.fillText("(BUS ONLY)", leftMargin - 10, y + rowHeight / 2 + 8);
        ctx.font = "14px Arial";
      } else {
        ctx.fillText(labels[i], leftMargin - 10, y + rowHeight / 2);
      }
    }
    ctx.beginPath(); ctx.moveTo(leftMargin, y); ctx.lineTo(leftMargin + gridWidth, y); ctx.stroke();
  }

  const textY = gridBottom + 18;
  ctx.textAlign = "right";
  ctx.fillText("REMARKS", leftMargin - 10, remarksLineY + 12);
  ctx.beginPath(); ctx.moveTo(leftMargin, remarksLineY); ctx.lineTo(leftMargin + gridWidth, remarksLineY); ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  const hourWidth = gridWidth / 24;
  for (let i = 0; i < 24; i++) {
    const x = leftMargin + i * hourWidth;
    ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(x, topMargin); ctx.lineTo(x, gridBottom);
    ctx.lineWidth = i === 0 || i === 12 ? 2 : 1; ctx.stroke(); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, remarksLineY); ctx.lineTo(x, remarksLineY + 15); ctx.stroke();

    const x30 = x + hourWidth / 2;
    ctx.setLineDash([4, 4]); ctx.strokeStyle = "#666"; ctx.beginPath(); ctx.moveTo(x30, topMargin); ctx.lineTo(x30, gridBottom); ctx.stroke();
    ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(x30, remarksLineY); ctx.lineTo(x30, remarksLineY + 10); ctx.stroke();

    ctx.setLineDash([]); ctx.strokeStyle = "#000";
    const x15 = x + hourWidth * 0.25;
    const x45 = x + hourWidth * 0.75;
    const tickLength = 8;
    for (let j = 0; j <= numRows; j++) {
      const yLine = topMargin + j * rowHeight;
      ctx.beginPath(); ctx.moveTo(x15, yLine - tickLength / 2); ctx.lineTo(x15, yLine + tickLength / 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x45, yLine - tickLength / 2); ctx.lineTo(x45, yLine + tickLength / 2); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(x15, remarksLineY); ctx.lineTo(x15, remarksLineY + 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x45, remarksLineY); ctx.lineTo(x45, remarksLineY + 6); ctx.stroke();

    let hourText = i === 0 ? "12a" : i === 12 ? "12p" : i > 12 ? i - 12 : i;
    ctx.fillText(hourText, x, topMargin - 4); ctx.fillText(hourText, x, textY);
  }

  const finalX = leftMargin + gridWidth;
  ctx.beginPath(); ctx.moveTo(finalX, topMargin); ctx.lineTo(finalX, gridBottom); ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(finalX, remarksLineY); ctx.lineTo(finalX, remarksLineY + 15); ctx.stroke();
  ctx.fillText("12a", finalX, topMargin - 4); ctx.fillText("12a", finalX, textY);

  if (!isPrinting) {
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    ctx.font = "italic 16px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Click & Drag on a row to paint time. Double-click a line to delete it.", leftMargin + gridWidth / 2, remarksLineY + 38);
    ctx.fillText("Click this box to add City/State markers.", leftMargin + gridWidth / 2, remarksLineY + 58);
    ctx.restore();
  }

  window.hasInvalidTransitions = false;

  if (driverEvents.length > 0) {
    ctx.lineWidth = 4;
    let lastX = leftMargin + (driverEvents[0].startHour / 24) * gridWidth;
    let lastY = getStatusY(driverEvents[0].status);
    let prevStatus = driverEvents[0].status;

    for (let i = 0; i < driverEvents.length; i++) {
      let event = driverEvents[i];
      let currentY = getStatusY(event.status);
      let startX = leftMargin + (event.startHour / 24) * gridWidth;
      let endX = leftMargin + (event.endHour / 24) * gridWidth;

      if (startX === lastX && currentY !== lastY) {
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        
        if ((prevStatus === "OFF" && event.status === "DRIVE") || 
            (prevStatus === "DRIVE" && event.status === "OFF")) {
          ctx.strokeStyle = errColor;
          window.hasInvalidTransitions = true;
        } else {
          ctx.strokeStyle = lineColor;
        }
        
        ctx.lineTo(startX, currentY);
        ctx.stroke();
      } 
      
      ctx.beginPath();
      ctx.strokeStyle = lineColor;
      if (startX > lastX || (startX === lastX && currentY !== lastY)) {
        ctx.moveTo(startX, currentY);
      } else {
        ctx.moveTo(lastX, lastY); 
      }
      ctx.lineTo(endX, currentY);
      ctx.stroke();

      lastX = endX;
      lastY = currentY;
      prevStatus = event.status;
    }
    ctx.lineWidth = 1;
  }

  remarksMarkers.forEach((m) => {
    let mx = leftMargin + (m.time / 24) * gridWidth;
    ctx.strokeStyle = lineColor; ctx.fillStyle = lineColor;
    ctx.beginPath(); ctx.moveTo(mx, gridBottom); ctx.lineTo(mx, remarksLineY + 20); ctx.stroke();
    ctx.save(); ctx.translate(mx, remarksLineY + 25); ctx.rotate(-Math.PI / 4);
    ctx.textAlign = "right"; ctx.textBaseline = "middle"; ctx.font = "bold 12px Arial";
    ctx.fillText(m.city, 0, 0); ctx.restore();
  });
}

function addEvent(newEvent) {
  let result = [];
  for (let ev of driverEvents) {
    if (ev.endHour <= newEvent.startHour || ev.startHour >= newEvent.endHour) {
      result.push(ev);
    } else if (ev.startHour >= newEvent.startHour && ev.endHour <= newEvent.endHour) {
    } else if (ev.startHour < newEvent.startHour && ev.endHour <= newEvent.endHour) {
      ev.endHour = newEvent.startHour;
      result.push(ev);
    } else if (ev.startHour >= newEvent.startHour && ev.endHour > newEvent.endHour) {
      ev.startHour = newEvent.endHour;
      result.push(ev);
    } else if (ev.startHour < newEvent.startHour && ev.endHour > newEvent.endHour) {
      result.push({ status: ev.status, startHour: ev.startHour, endHour: newEvent.startHour });
      result.push({ status: ev.status, startHour: newEvent.endHour, endHour: ev.endHour });
    }
  }

  if (newEvent.startHour < newEvent.endHour) result.push(newEvent);
  result.sort((a, b) => a.startHour - b.startHour);
  driverEvents = [];
  
  for (let ev of result) {
    if (driverEvents.length > 0) {
      let last = driverEvents[driverEvents.length - 1];
      if (last.status === ev.status && last.endHour === ev.startHour) {
        last.endHour = ev.endHour;
        continue;
      }
    }
    driverEvents.push(ev);
  }
  if (window.checkPrintExceptionState) window.checkPrintExceptionState();
}

function fillOffDuty() {
  let gaps = [];
  let curr = 0;
  driverEvents.forEach((ev) => {
    if (ev.startHour > curr) gaps.push({ start: curr, end: ev.startHour });
    curr = ev.endHour;
  });
  if (curr < 24) gaps.push({ start: curr, end: 24 });
  gaps.forEach((g) => addEvent({ status: "OFF", startHour: g.start, endHour: g.end }));
  
  updateHoursFromEvents();
  drawGridAndLine();
  if (window.checkPrintExceptionState) window.checkPrintExceptionState();
}

// Canvas interactions
const canvas = document.getElementById("logGrid");
const tooltip = document.getElementById("timeTooltip");
const canvasWrapper = document.getElementById("canvasWrapper");
const contextMenu = document.getElementById("cityContextMenu");

let isDrawingLine = false;
let drawStatus = null;
let drawStart = null;
let drawCurrent = null;

let isDraggingMarker = false;
let dragTarget = null;
let startDragX = 0;
window.pendingMarkerTime = null; 

function showCityMenu(x, y, time) {
  window.pendingMarkerTime = time;
  contextMenu.style.display = "flex";
  contextMenu.style.left = x + "px";
  contextMenu.style.top = y + "px";
}

function hideCityMenu() { contextMenu.style.display = "none"; }

document.addEventListener("mousedown", (e) => {
  if (!contextMenu.contains(e.target) && e.target.id !== "logGrid") { hideCityMenu(); }
});

canvas.addEventListener("mousedown", function (e) {
  if (e.button !== 0) return;
  hideCityMenu();

  let rect = canvas.getBoundingClientRect();
  let x = e.clientX - rect.left;
  let y = e.clientY - rect.top;
  if (x < canvasConfig.leftMargin || x > canvasConfig.leftMargin + canvasConfig.gridWidth) return;

  let clickedTime = (x - canvasConfig.leftMargin) / (canvasConfig.gridWidth / 24);
  // FEATURE UPDATE: Snapping logic changed to 7.5 mins (8 parts of an hour)
  let snappedTime = Math.round(clickedTime * 8) / 8;
  startDragX = x;

  if (y > canvasConfig.gridBottom) {
    let clickedMarkerIndex = remarksMarkers.findIndex((m) => {
      let mx = canvasConfig.leftMargin + (m.time / 24) * canvasConfig.gridWidth;
      return x >= mx - 80 && x <= mx + 20 && y >= canvasConfig.remarksLineY;
    });

    if (clickedMarkerIndex !== -1) {
      isDraggingMarker = true;
      dragTarget = clickedMarkerIndex;
      return;
    }
    showCityMenu(e.pageX, e.pageY, snappedTime);
    return;
  }

  if (y >= canvasConfig.topMargin && y <= canvasConfig.gridBottom) {
    let rowHeight = canvasConfig.gridHeight / 3;
    let relY = y - canvasConfig.topMargin;
    if (relY < rowHeight) drawStatus = "OFF";
    else if (relY < 2 * rowHeight) drawStatus = "DRIVE";
    else drawStatus = "ON";

    isDrawingLine = true;
    drawStart = snappedTime;
    drawCurrent = snappedTime;
  }
});

canvas.addEventListener("mousemove", function (e) {
  let rect = canvas.getBoundingClientRect();
  let x = e.clientX - rect.left;
  let y = e.clientY - rect.top;

  if (x < canvasConfig.leftMargin || x > canvasConfig.leftMargin + canvasConfig.gridWidth || y < canvasConfig.topMargin) {
    tooltip.style.display = "none";
    return;
  }

  let time = (x - canvasConfig.leftMargin) / (canvasConfig.gridWidth / 24);
  // FEATURE UPDATE: Snapping logic changed to 7.5 mins (8 parts of an hour)
  let snappedTime = Math.round(time * 8) / 8;

  tooltip.style.display = "block";
  tooltip.style.left = e.pageX + 15 + "px";
  tooltip.style.top = e.pageY + 15 + "px";
  tooltip.innerText = formatTime(snappedTime);

  if (isDraggingMarker && dragTarget !== null) {
    let clampedTime = Math.max(0, Math.min(24, snappedTime));
    remarksMarkers[dragTarget].time = clampedTime;
    drawGridAndLine();
    return;
  }

  if (isDrawingLine) {
    drawCurrent = Math.max(0, Math.min(24, snappedTime));
    drawGridAndLine();
    const ctx = canvas.getContext("2d");
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(0, 0, 255, 0.5)";
    let tempY = getStatusY(drawStatus);
    let startX = canvasConfig.leftMargin + (drawStart / 24) * canvasConfig.gridWidth;
    let currentX = canvasConfig.leftMargin + (drawCurrent / 24) * canvasConfig.gridWidth;
    ctx.beginPath(); ctx.moveTo(startX, tempY); ctx.lineTo(currentX, tempY); ctx.stroke(); ctx.lineWidth = 1;
  }
});

canvas.addEventListener("mouseup", function (e) {
  if (isDraggingMarker) {
    let x = e.clientX - canvas.getBoundingClientRect().left;
    if (Math.abs(x - startDragX) < 5) {
      window.showGlobalConfirm("Remove this city marker?", (confirmed) => {
        if (confirmed) { remarksMarkers.splice(dragTarget, 1); drawGridAndLine(); if (window.checkPrintExceptionState) window.checkPrintExceptionState(); }
      });
    }
    isDraggingMarker = false;
    dragTarget = null;
    drawGridAndLine();
  }

  if (isDrawingLine) {
    if (drawStart !== drawCurrent) {
      let t1 = Math.min(drawStart, drawCurrent);
      let t2 = Math.max(drawStart, drawCurrent);
      if (t1 !== t2) addEvent({ status: drawStatus, startHour: t1, endHour: t2 });
    } else {
      let index = driverEvents.findIndex((ev) => ev.status === drawStatus && drawStart > ev.startHour && drawStart < ev.endHour);
      if (index !== -1) {
        let ev = driverEvents[index];
        driverEvents.splice(index, 1, 
          { status: ev.status, startHour: ev.startHour, endHour: drawStart },
          { status: ev.status, startHour: drawStart, endHour: ev.endHour }
        );
      }
    }
    isDrawingLine = false;
    updateHoursFromEvents();
    drawGridAndLine();
  }
});

canvas.addEventListener("dblclick", function (e) {
  let rect = canvas.getBoundingClientRect();
  let x = e.clientX - rect.left;
  let y = e.clientY - rect.top;
  if (x < canvasConfig.leftMargin || x > canvasConfig.leftMargin + canvasConfig.gridWidth) return;
  if (y < canvasConfig.topMargin || y > canvasConfig.gridBottom) return;

  let time = (x - canvasConfig.leftMargin) / (canvasConfig.gridWidth / 24);
  let rowHeight = canvasConfig.gridHeight / 3;
  let relY = y - canvasConfig.topMargin;
  let clickStatus = "";
  if (relY < rowHeight) clickStatus = "OFF";
  else if (relY < 2 * rowHeight) clickStatus = "DRIVE";
  else clickStatus = "ON";

  let index = driverEvents.findIndex((ev) => ev.status === clickStatus && time >= ev.startHour && time <= ev.endHour);
  if (index !== -1) {
    driverEvents.splice(index, 1);
    updateHoursFromEvents();
    drawGridAndLine();
    if (window.checkPrintExceptionState) window.checkPrintExceptionState();
  }
});

canvas.addEventListener("mouseleave", () => {
  isDrawingLine = false;
  isDraggingMarker = false;
  dragTarget = null;
  tooltip.style.display = "none";
  updateHoursFromEvents();
  drawGridAndLine();
});