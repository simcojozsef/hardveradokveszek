const categoryIcons = {
    motherboard: '/images/category-icons/motherboard.png',
    cpu: '/images/category-icons/cpu.png',
    ram: '/images/category-icons/ram.png',
    gpu: '/images/category-icons/gpu.png',
    ssd: '/images/category-icons/ssd.png',
    hdd: '/images/category-icons/hdd.png',
    'pc-case': '/images/category-icons/pc-case.png',
    'power-supply': '/images/category-icons/power-supply.png',
    'cpu-cooler': '/images/category-icons/cpu-cooler.png',
    monitor: '/images/category-icons/monitor.png',
    laptop: '/images/category-icons/laptop.png',
    router: '/images/category-icons/router.png',
    switch: '/images/category-icons/switch.png',
    keyboard: '/images/category-icons/keyboard.png',
    mouse: '/images/category-icons/mouse.png',
    gamepad: '/images/category-icons/gamepad.png',
    'vr-headset': '/images/category-icons/vr-headset.png',
    webcam: '/images/category-icons/webcam.png',
    microphone: '/images/category-icons/microphone.png',
    headphones: '/images/category-icons/headphones.png',
    speakers: '/images/category-icons/speakers.png',
    soundbar: '/images/category-icons/soundbar.png',
    amplifier: '/images/category-icons/amplifier.png',
    dac: '/images/category-icons/dac.png',
    tv: '/images/category-icons/tv.png',
    projector: '/images/category-icons/projector.png',
    camera: '/images/category-icons/camera.png',
    dslr: '/images/category-icons/dslr.png',
    mirrorless: '/images/category-icons/mirrorless.png',
    'video-camera': '/images/category-icons/video-camera.png',
    lens: '/images/category-icons/lens.png',
    drone: '/images/category-icons/drone.png',
    tripod: '/images/category-icons/tripod.png',
    flash: '/images/category-icons/flash.png',
    smartphone: '/images/category-icons/smartphone.png',
    iphone: '/images/category-icons/iphone.png',
    'android-phone': '/images/category-icons/android-phone.png',
    tablet: '/images/category-icons/tablet.png',
    smartwatch: '/images/category-icons/smartwatch.png',
    'smart-ring': '/images/category-icons/smart-ring.png',
    'ebook-reader': '/images/category-icons/ebook-reader.png',
    'sim-card': '/images/category-icons/sim-card.png',
    'power-bank': '/images/category-icons/power-bank.png',
    charger: '/images/category-icons/charger.png',
    cable: '/images/category-icons/cable.png',
    software: '/images/category-icons/software.png',
    game: '/images/category-icons/game.png',
    playstation: '/images/category-icons/playstation.png',
    xbox: '/images/category-icons/xbox.png',
    nintendo: '/images/category-icons/nintendo.png',
};

/*
 * Uploaded category icons live in Laravel's public storage. They must be
 * requested from the same origin the app is served from, otherwise the
 * browser treats them as a cross-origin (localhost) request and prompts
 * for local network access. Product images already rely on server-built
 * absolute URLs, so here we deliberately keep everything origin-relative.
 */
export function getCategoryIcon(icon, iconKey) {
    // 1. No uploaded icon -> use built-in icon
    if (!icon && iconKey && categoryIcons[iconKey]) {
        return categoryIcons[iconKey];
    }

    // 2. No icon at all -> default
    if (!icon) {
        return '/images/category-icons/default.png';
    }

    // 3. Full URL already supplied by backend
    if (/^https?:\/\//i.test(icon)) {
        return icon;
    }

    // 4. Laravel storage path already has /storage/
    if (icon.startsWith('/storage/')) {
        return icon;
    }

    if (icon.startsWith('storage/')) {
        return `/${icon}`;
    }

    // 5. Database stores paths like:
    //    categories/546/example.webp
    if (icon.startsWith('categories/')) {
        return `/storage/${icon}`;
    }

    // 6. Other absolute frontend paths
    if (icon.startsWith('/')) {
        return icon;
    }

    // 7. Final fallback
    return `/${icon}`;
}