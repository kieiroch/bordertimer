const form = document.getElementById('generator-form');
const urlOutput = document.getElementById('generated-url');
const previewFrame = document.getElementById('preview-frame');

const defaultValues = {
    minutes: '10',
    thickness: '20',
    barcolor: '#00ff00',
    overtimecolor: '#ff0000',
    fontsize: '10vw',
    color: '#ffffff',
    top: '50%',
    left: '50%',
    pausesize: '8vw',
    pausecolor: '#ffffff',
    pausetop: '50%',
    pauseleft: '50%'
};

function generateUrl() {
    const params = new URLSearchParams();
    const inputs = form.elements;

    for (const input of inputs) {
        if (input.id) {
            if (input.type === 'checkbox') {
                if (input.checked) {
                    params.append(input.id, 'true');
                }
                continue; // Move to next input
            }

            const value = input.value;
            // Add to params only if the value is not the default
            if (value && value !== defaultValues[input.id]) {
                // For color inputs, the default value from the picker is full hex, 
                // but the defaultValues map might have shorthand. Let's compare them properly.
                if (input.type === 'color') {
                    // A simple way to compare colors is to see if they match, ignoring case
                    if (value.toLowerCase() !== defaultValues[input.id].toLowerCase()) {
                         params.append(input.id, value);
                    }
                } else {
                    params.append(input.id, value);
                }
            }
        }
    }

    const queryString = params.toString();
    const finalUrl = 'index.html' + (queryString ? '?' + queryString : '');

    urlOutput.textContent = finalUrl;
    previewFrame.src = finalUrl;
}

form.addEventListener('input', generateUrl);

// Initial generation
generateUrl();
