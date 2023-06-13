let modeSelector = document.getElementById('mode-selector'), htmlElement = document.body.parentElement;
let toggleTheme = _ => {
    if (htmlElement.classList.contains('light-theme')) {
        htmlElement.classList.remove('light-theme');
        htmlElement.classList.add('dark-theme');
        modeSelector.children[0].innerHTML = ' Light theme  [Dark theme]';
        localStorage.setItem('mode', 'dark');
    } else {
        htmlElement.classList.remove('dark-theme');
        htmlElement.classList.add('light-theme');
        modeSelector.children[0].innerHTML = '[Light theme]  Dark theme ';
        localStorage.setItem('mode', 'light');
    }
};
if (localStorage.getItem('mode') == 'dark') {
    toggleTheme();
}
modeSelector.addEventListener('click', toggleTheme);