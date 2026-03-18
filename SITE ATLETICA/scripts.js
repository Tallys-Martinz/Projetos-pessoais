const observerOptions = {
    root: null,
    threshold: 0.2
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            
            entry.target.classList.remove('opacity-0', '-translate-x-10', 'translate-y-10');
            entry.target.classList.add('opacity-100', 'translate-x-0', 'translate-y-0');
        }
    });
}, observerOptions);

document.querySelectorAll('.reveal-scroll').forEach((el) => {
    observer.observe(el);
});