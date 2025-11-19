document.addEventListener('DOMContentLoaded', () => {

 
    const decks = {
        1: {
            fileInput: document.getElementById('fileUpload1'),
            platter: document.getElementById('deck-1'),
            statusText: document.getElementById('deck-1-status'),
            playPauseBtn: document.getElementById('play-pause-1'),
            faderKnob: document.getElementById('knob-1'),
            faderTrack: document.getElementById('fader-1-track'),
            eq: {
                high: document.getElementById('eq-hi-1-knob'),
                mid: document.getElementById('eq-mid-1-knob'),
                low: document.getElementById('eq-low-1-knob')
            },
            pitchKnob: document.getElementById('pitch-knob-1'),
            pitchTrack: document.getElementById('pitch-fader-1-track'),
            pitchValueDisplay: document.getElementById('pitch-value-1')
        },
        2: {
            fileInput: document.getElementById('fileUpload2'),
            platter: document.getElementById('deck-2'),
            statusText: document.getElementById('deck-2-status'),
            playPauseBtn: document.getElementById('play-pause-2'),
            faderKnob: document.getElementById('knob-2'),
            faderTrack: document.getElementById('fader-2-track'),
            eq: {
                high: document.getElementById('eq-hi-2-knob'),
                mid: document.getElementById('eq-mid-2-knob'),
                low: document.getElementById('eq-low-2-knob')
            },
            pitchKnob: document.getElementById('pitch-knob-2'),
            pitchTrack: document.getElementById('pitch-fader-2-track'),
            pitchValueDisplay: document.getElementById('pitch-value-2')
        }
    };

    function setupVerticalFader(deckId) {
        const deck = decks[deckId];
        const knob = deck.faderKnob;
        const track = deck.faderTrack;

        knob.addEventListener('mousedown', startDrag);
        knob.addEventListener('touchstart', startDrag, { passive: true });

        function startDrag(e) {
            e.preventDefault();
            document.addEventListener('mousemove', onDrag);
            document.addEventListener('mouseup', endDrag);
            document.addEventListener('touchmove', onDrag, { passive: false });
            document.addEventListener('touchend', endDrag);
        }

        function onDrag(e) {
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            const rect = track.getBoundingClientRect();
            let y = clientY - rect.top;

            y = Math.max(0, Math.min(y, rect.height));
            knob.style.top = `${y - knob.offsetHeight / 2}px`;
        }

        function endDrag() {
            document.removeEventListener('mousemove', onDrag);
            document.removeEventListener('mouseup', endDrag);
            document.removeEventListener('touchmove', onDrag);
            document.removeEventListener('touchend', endDrag);
        }
    }

    setupVerticalFader(1);
    setupVerticalFader(2);

    const crossKnob = document.getElementById('cross-fader-knob');
    const crossTrack = document.getElementById('cross-fader-track');

    crossKnob.addEventListener('mousedown', startXDrag);
    crossKnob.addEventListener('touchstart', startXDrag, { passive: true });

    function startXDrag(e) {
        e.preventDefault();
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', endDrag);
        document.addEventListener('touchmove', onDrag, { passive: false });
        document.addEventListener('touchend', endDrag);
    }

    function onDrag(e) {
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const rect = crossTrack.getBoundingClientRect();
        let x = clientX - rect.left;

        x = Math.max(0, Math.min(x, rect.width));
        crossKnob.style.left = `${x - crossKnob.offsetWidth / 2}px`;
    }

    function endDrag() {
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', endDrag);
        document.removeEventListener('touchmove', onDrag);
        document.removeEventListener('touchend', endDrag);
    }

   
    function setupRotary(knob) {
        let startY = 0;
        let startAngle = 0;

        knob.addEventListener('mousedown', startRotate);
        knob.addEventListener('touchstart', startRotate, { passive: true });

        function startRotate(e) {
            e.preventDefault();
            startY = e.touches ? e.touches[0].clientY : e.clientY;

            const matrix = new DOMMatrix(getComputedStyle(knob).transform);
            startAngle = Math.atan2(matrix.b, matrix.a) * 180 / Math.PI;

            document.addEventListener('mousemove', rotate);
            document.addEventListener('mouseup', endRotate);
            document.addEventListener('touchmove', rotate, { passive: false });
            document.addEventListener('touchend', endRotate);
        }

        function rotate(e) {
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            let delta = (clientY - startY) * -0.5;
            let angle = Math.max(-120, Math.min(120, startAngle + delta));

            knob.style.transform = `rotate(${angle}deg)`;
        }

        function endRotate() {
            document.removeEventListener('mousemove', rotate);
            document.removeEventListener('mouseup', endRotate);
            document.removeEventListener('touchmove', rotate);
            document.removeEventListener('touchend', endRotate);
        }
    }

    setupRotary(decks[1].eq.high);
    setupRotary(decks[1].eq.mid);
    setupRotary(decks[1].eq.low);

    setupRotary(decks[2].eq.high);
    setupRotary(decks[2].eq.mid);
    setupRotary(decks[2].eq.low);

   
    function setupPitch(deckId) {
        const deck = decks[deckId];
        const knob = deck.pitchKnob;
        const track = deck.pitchTrack;
        const display = deck.pitchValueDisplay;

        knob.addEventListener('mousedown', start);
        knob.addEventListener('touchstart', start, { passive: true });

        function start(e) {
            e.preventDefault();
            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', stop);
            document.addEventListener('touchmove', drag, { passive: false });
            document.addEventListener('touchend', stop);
        }

        function drag(e) {
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            const rect = track.getBoundingClientRect();
            let y = clientY - rect.top;

            y = Math.max(0, Math.min(y, rect.height));
            knob.style.top = `${y - knob.offsetHeight / 2}px`;

            const percent = (1 - y / rect.height) * 16 - 8;
            display.textContent = percent.toFixed(1) + "%";
        }

        function stop() {
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('mouseup', stop);
            document.removeEventListener('touchmove', drag);
            document.removeEventListener('touchend', stop);
        }
    }

    setupPitch(1);
    setupPitch(2);
});

