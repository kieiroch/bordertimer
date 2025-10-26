const timerDisplay = document.getElementById('timer-display');
const pauseIcon = document.getElementById('pause-icon');
const pathCCW = document.getElementById('path-counter-clockwise');
const otPaths = Array.from(document.querySelectorAll('.ot-path'));

// --- Helper Functions ---
function rgbToHsl(r, g, b) {
    r /= 255, g /= 255, b /= 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max == min) {
        h = s = 0; // achromatic
    } else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [h * 360, s * 100, l * 100];
}

function colorToHsl(color) {
    try {
        let temp = document.createElement("div");
        temp.style.color = color;
        document.body.appendChild(temp);
        let rgbColor = window.getComputedStyle(temp).color;
        document.body.removeChild(temp);
        let rgb = rgbColor.match(/\d+/g).map(Number);
        return rgbToHsl(rgb[0], rgb[1], rgb[2]);
    } catch (e) {
        console.error("Could not convert color:", color, e);
        return [0, 100, 50]; // Default to red
    }
}

// --- Config from URL ---
const params = new URLSearchParams(window.location.search);

// Position Timer Display
const topPos = params.get('top');
const leftPos = params.get('left');
if (topPos) {
    timerDisplay.style.top = topPos;
}
if (leftPos) {
    timerDisplay.style.left = leftPos;
}

// Font color and size
const fontColor = params.get('color');
const fontSize = params.get('fontsize');
if (fontColor) {
    timerDisplay.style.color = fontColor;
}
if (fontSize) {
    timerDisplay.style.fontSize = fontSize;
}

// Pause Icon
const pauseTop = params.get('pausetop');
const pauseLeft = params.get('pauseleft');
const pauseSize = params.get('pausesize');
const pauseColor = params.get('pausecolor');
if (pauseTop) {
    pauseIcon.style.top = pauseTop;
}
if (pauseLeft) {
    pauseIcon.style.left = pauseLeft;
}
if (pauseSize) {
    pauseIcon.style.setProperty('--pause-width', pauseSize);
    const newHeight = `calc(${pauseSize} * 1.5)`;
    pauseIcon.style.setProperty('--pause-height', newHeight);
}
if (pauseColor) {
    pauseIcon.style.setProperty('--pause-color', pauseColor);
}

// Visibility
if (params.has('hidetimer')) {
    timerDisplay.style.display = 'none';
}
if (params.has('hidepause')) {
    pauseIcon.style.display = 'none';
}

// Bar Colors
const barColor = params.get('barcolor');
if (barColor) {
    document.documentElement.style.setProperty('--bar-color', barColor);
}
const overtimeColor = params.get('overtimecolor') || '#ff0000';
const baseOvertimeHsl = colorToHsl(overtimeColor);

const requestedMinutes = parseInt(params.get('minutes')) || 10;
const thickness = parseInt(params.get('thickness')) || 20;

let totalSeconds = requestedMinutes * 60;
let remainingSeconds = totalSeconds;
let pathLength; // Will be set in recalculateLayout
let intervalId;

// --- Main Layout & Timer Functions ---

function recalculateLayout() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const inset = thickness / 2;

    const pathDataCCW = `M${w/2},${inset} L${inset},${inset} L${inset},${h-inset} L${w-inset},${h-inset} L${w-inset},${inset} L${w/2},${inset}`;
    const pathDataCW = `M${w/2},${inset} L${w-inset},${inset} L${w-inset},${h-inset} L${inset},${h-inset} L${inset},${inset} L${w/2},${inset}`;

    pathCCW.setAttribute('d', pathDataCCW);
    pathCCW.style.strokeWidth = `${thickness}px`;
    
otPaths.forEach(p => {
        p.setAttribute('d', pathDataCW);
        p.style.strokeWidth = `${thickness}px`;
    });

    pathLength = pathCCW.getTotalLength();
    pathCCW.style.strokeDasharray = pathLength;
    otPaths.forEach(p => {
        p.style.strokeDasharray = pathLength;
        p.style.strokeDashoffset = pathLength; // FIX: Initialize as empty
    });

    updatePath(); // Redraw timer state with new dimensions
}

function formatTime(seconds) {
    const absSeconds = Math.abs(seconds);
    const min = Math.floor(absSeconds / 60);
    const sec = absSeconds % 60;
    const sign = seconds < 0 ? '-' : '';
    return `${sign}${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function updatePath() {
    if (remainingSeconds >= 0) {
        pathCCW.style.opacity = 1;
        pathCCW.style.pointerEvents = 'auto';
        pathCCW.style.stroke = ''; // Use CSS color (green)

        otPaths.forEach(p => {
            p.style.opacity = 0;
            p.style.pointerEvents = 'none';
        });

        const percentage = remainingSeconds / totalSeconds;
        const offset = pathLength * (1 - percentage);
        pathCCW.style.strokeDashoffset = offset;

    } else { // Overtime
        const overtimeSeconds = -remainingSeconds;

        if (overtimeSeconds === 1) {
            pathCCW.style.opacity = 1;
            let [h, s, l] = baseOvertimeHsl;
            pathCCW.style.stroke = `hsl(${h}, ${s}%, ${l}%)`;
            pathCCW.style.strokeDashoffset = pathLength; // Ensure empty
        } else {
            pathCCW.style.opacity = 0;
            pathCCW.style.pointerEvents = 'none';
        }

        const laps = Math.floor(overtimeSeconds / totalSeconds);
        const overtimePercentageInLap = (overtimeSeconds % totalSeconds) / totalSeconds;

        otPaths.forEach((path, i) => {
            if (i > laps) {
                path.style.opacity = 0;
                path.style.pointerEvents = 'none';
                return;
            }

            path.style.opacity = 1;
            path.style.pointerEvents = 'auto';
            
            let [h, s, l] = baseOvertimeHsl;
            const newLightness = Math.max(10, l - (i * 10));
            path.style.stroke = `hsl(${h}, ${s}%, ${newLightness}%)`;

            if (i < laps) {
                path.style.strokeDashoffset = 0; // Full bar for completed laps
            } else {
                const offset = pathLength * (1 - overtimePercentageInLap);
                path.style.strokeDashoffset = offset;
            }
        });
    }
}

function tick() {
    remainingSeconds--;
    timerDisplay.textContent = formatTime(remainingSeconds);
    updatePath();
}

function startTimer() {
    if (intervalId) {
        clearInterval(intervalId);
    }
    intervalId = setInterval(tick, 1000);
}

// --- Initial Setup & Event Listeners ---

// Initial display
timerDisplay.textContent = formatTime(remainingSeconds);
pauseIcon.style.opacity = 1; // Show pause icon initially

// Set up layout and add resize listener
recalculateLayout(); 
window.addEventListener('resize', recalculateLayout);

// Start/stop timer on click
document.body.addEventListener('click', () => {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        pauseIcon.style.opacity = 1; // Show pause icon
    } else {
        startTimer();
        pauseIcon.style.opacity = 0; // Hide pause icon
    }
});
