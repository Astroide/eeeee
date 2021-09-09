let modeSelector = document.getElementById('mode-selector'), htmlElement = document.querySelector('hmtl');
modeSelector.addEventListener('click', _ => {
    if (htmlElement.classList.contains('light-theme')) {
        htmlElement.classList.remove('light-theme');
        htmlElement.classList.add('dark-theme');
        modeSelector.children[0].innerHTML = ' Light theme  [Dark theme]';
    } else {
        htmlElement.classList.remove('dark-theme');
        htmlElement.classList.add('light-theme');
        modeSelector.children[0].innerHTML = '[Light theme]  Dark theme ';
    }
});