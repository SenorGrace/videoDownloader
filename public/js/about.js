// Step 1: Get DOM elements
let nextDom = document.getElementById('next');
let prevDom = document.getElementById('prev');

let carouselDom = document.querySelector('.carousel');
let SliderDom = carouselDom.querySelector('.list');
let thumbnailBorderDom = document.querySelector('.carousel .thumbnail');
let thumbnailItemsDom = thumbnailBorderDom.querySelectorAll('.item');
let timeDom = document.querySelector('.time'); // Update to match its new independent placement

let circularImageDom = document.getElementById('circular-image'); // New element for the circular thumbnail

thumbnailBorderDom.appendChild(thumbnailItemsDom[0]);
let timeRunning = 3000; // Duration of the running time
let timeAutoNext = 7000; // Duration before auto-next

// Step 2: Event listeners for next/prev buttons
nextDom.onclick = function () {
    showSlider('next');
};

prevDom.onclick = function () {
    showSlider('prev');
};

let runTimeOut;
let runNextAuto = setTimeout(() => {
    nextDom.click();
}, timeAutoNext);

function showSlider(type) {
    let SliderItemsDom = SliderDom.querySelectorAll('.list .item');
    let thumbnailItemsDom = document.querySelectorAll('.carousel .thumbnail .item');

    // Manage slider logic
    if (type === 'next') {
        SliderDom.appendChild(SliderItemsDom[0]);
        thumbnailBorderDom.appendChild(thumbnailItemsDom[0]);
        carouselDom.classList.add('next');
    } else {
        SliderDom.prepend(SliderItemsDom[SliderItemsDom.length - 1]);
        thumbnailBorderDom.prepend(thumbnailItemsDom[thumbnailItemsDom.length - 1]);
        carouselDom.classList.add('prev');
    }

    // Update circular thumbnail
    updateCircularThumbnail();

    // Trigger animation on .time
    timeDom.style.animation = 'none'; // Reset animation
    setTimeout(() => {
        timeDom.style.animation = ''; // Trigger runningTime animation
        timeDom.classList.add(type); // Add class for animation
    }, 10);

    // Remove animation class after duration
    clearTimeout(runTimeOut);
    runTimeOut = setTimeout(() => {
        carouselDom.classList.remove('next');
        carouselDom.classList.remove('prev');
        timeDom.classList.remove('next');
        timeDom.classList.remove('prev');
    }, timeRunning);

    // Reset auto-next timer
    clearTimeout(runNextAuto);
    runNextAuto = setTimeout(() => {
        nextDom.click();
    }, timeAutoNext);
}

// Function to update the circular thumbnail
function updateCircularThumbnail() {
    let activeThumbnail = thumbnailBorderDom.querySelector('.item img');
    if (activeThumbnail) {
        circularImageDom.src = activeThumbnail.src;

        // Optional: Add an active class for animation
        circularImageDom.classList.add('active');
        setTimeout(() => {
            circularImageDom.classList.remove('active');
        }, 300);
    }
}

// Initialize the circular thumbnail with the first image
updateCircularThumbnail();
