document.addEventListener('DOMContentLoaded', () => {
    /* ======================================================================
       1. 3D CAROUSEL LOGIC
       ====================================================================== */
    const cards = document.querySelectorAll('.cert-card');
    const scene = document.querySelector('.carousel-scene');
    
    // Scroll state
    let currentScroll = 0;
    let targetScroll = 0;
    const maxScroll = cards.length - 1;
    
    // Mouse state for Camera Parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    // Linear Interpolation
    const lerp = (start, end, factor) => start + (end - start) * factor;

    // Listen to scroll / wheel events
    window.addEventListener('wheel', (e) => {
        // Prevent default scrolling to handle it ourselves if needed, 
        // but it's a fixed viewport so we just capture the delta
        targetScroll += Math.sign(e.deltaY) * 0.4;
        // Clamp the scroll target
        targetScroll = Math.max(0, Math.min(maxScroll, targetScroll));
    });

    // Touch support for scrolling
    let touchStartX = 0;
    window.addEventListener('touchstart', e => {
        touchStartX = e.touches[0].clientX;
    });
    window.addEventListener('touchmove', e => {
        const touchX = e.touches[0].clientX;
        const delta = touchStartX - touchX;
        targetScroll += delta * 0.01;
        targetScroll = Math.max(0, Math.min(maxScroll, targetScroll));
        touchStartX = touchX;
    });

    // Listen to mouse movement for Camera Parallax
    window.addEventListener('mousemove', (e) => {
        // Normalize mouse coordinates from -1 to 1
        targetMouseX = (e.clientX / window.innerWidth) * 2 - 1;
        targetMouseY = -(e.clientY / window.innerHeight) * 2 + 1; // Invert Y
    });

    function updateCarousel() {
        // Lerp scroll for elastic easing
        currentScroll = lerp(currentScroll, targetScroll, 0.08);

        // Lerp mouse for smooth camera parallax
        mouseX = lerp(mouseX, targetMouseX, 0.05);
        mouseY = lerp(mouseY, targetMouseY, 0.05);

        // Apply Camera Parallax to the entire scene
        scene.style.transform = `rotateX(${mouseY * 5}deg) rotateY(${mouseX * 10}deg)`;

        // Update each card's position based on scroll
        cards.forEach((card, index) => {
            // Make cards visible on first frame
            if (!card.classList.contains('visible')) {
                card.classList.add('visible');
            }

            // Calculate offset relative to current scroll
            // If offset is 0, the card is in the center
            const offset = index - currentScroll;
            const absOffset = Math.abs(offset);

            // Positioning variables
            const translateX = offset * 280; // Distance between cards
            const translateZ = -absOffset * 180; // Depth push back
            // Rotate cards facing slightly inwards
            const rotateY = -offset * 15; 
            
            // Scaling for depth illusion
            const scale = Math.max(0.6, 1 - (absOffset * 0.15));

            // Z-index sorting: center card should be on top
            const zIndex = Math.round(100 - absOffset * 10);

            card.style.transform = `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`;
            card.style.zIndex = zIndex;

            // Fade out cards that are too far away
            card.style.opacity = Math.max(0, 1 - (absOffset * 0.6));
        });

        requestAnimationFrame(updateCarousel);
    }

    // Start the animation loop
    updateCarousel();

    /* ======================================================================
       2. CARD HOVER TILT (Local Parallax)
       ====================================================================== */
    cards.forEach(card => {
        const glass = card.querySelector('.cert-glass');
        const glare = card.querySelector('.glare');

        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            // Calculate local mouse position within the card (0 to 1)
            const localX = (e.clientX - rect.left) / rect.width;
            const localY = (e.clientY - rect.top) / rect.height;

            // Convert to -1 to 1
            const tiltX = (localY - 0.5) * 2; // -1 (top) to 1 (bottom)
            const tiltY = (localX - 0.5) * 2; // -1 (left) to 1 (right)

            // Apply 3D tilt
            glass.style.transform = `rotateX(${-tiltX * 15}deg) rotateY(${tiltY * 15}deg) scale3d(1.05, 1.05, 1.05)`;
            
            // Move glare
            glare.style.transform = `translate(${tiltY * -20}%, ${tiltX * -20}%) rotate(30deg)`;
        });

        card.addEventListener('mouseleave', () => {
            // Reset transforms on mouse leave
            glass.style.transform = `rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
            glare.style.transform = `translate(-50%, -50%) rotate(30deg)`;
        });
    });

    /* ======================================================================
       3. BACKGROUND CANVAS PARTICLES (Floating Orbs)
       ====================================================================== */
    const canvas = document.getElementById('bgCanvas');
    const ctx = canvas.getContext('2d');

    let width, height;
    let particles = [];

    function resizeCanvas() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    class Particle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.size = Math.random() * 3 + 1; // Size 1 to 4
            this.speedX = (Math.random() - 0.5) * 0.5;
            this.speedY = (Math.random() - 0.5) * 0.5;
            this.baseAlpha = Math.random() * 0.5 + 0.1;
            // Cyan or Blue
            this.color = Math.random() > 0.5 ? 'rgba(0, 243, 255,' : 'rgba(0, 102, 255,';
        }

        update() {
            // Mouse repulsion
            const dx = (targetMouseX * width / 2 + width / 2) - this.x;
            const dy = (-targetMouseY * height / 2 + height / 2) - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const force = (100 - dist) / 100;

            if (dist < 100) {
                this.x -= dx * force * 0.2;
                this.y -= dy * force * 0.2;
            }

            this.x += this.speedX;
            this.y += this.speedY;

            // Wrap around edges
            if (this.x < 0) this.x = width;
            if (this.x > width) this.x = 0;
            if (this.y < 0) this.y = height;
            if (this.y > height) this.y = 0;
        }

        draw() {
            // Pulse effect
            const alpha = this.baseAlpha + Math.sin(Date.now() * 0.001 * this.speedX * 10) * 0.1;
            
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `${this.color}${Math.max(0, alpha)})`;
            ctx.fill();

            // Glow
            ctx.shadowBlur = 15;
            ctx.shadowColor = `${this.color}0.8)`;
        }
    }

    function initParticles() {
        particles = [];
        const particleCount = Math.floor(window.innerWidth / 20); // Responsive amount
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }
    }

    initParticles();

    function animateParticles() {
        ctx.clearRect(0, 0, width, height);
        
        // Reset shadow for performance
        ctx.shadowBlur = 0;

        particles.forEach(p => {
            p.update();
            p.draw();
        });

        // Draw light streaks/connections if close
        ctx.shadowBlur = 0;
        ctx.lineWidth = 0.5;
        for (let i = 0; i < particles.length; i++) {
            for (let j = i; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 120) {
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(0, 243, 255, ${0.15 * (1 - distance / 120)})`;
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }

        requestAnimationFrame(animateParticles);
    }

    animateParticles();

    /* ======================================================================
       4. CERTIFICATE MODAL LOGIC
       ====================================================================== */
    const certModal = document.getElementById('certModal');
    const modalCloseBtn = document.querySelector('.modal-close');
    const modalBackdrop = document.querySelector('.modal-backdrop');

    function openModal() {
        certModal.classList.add('active');
    }

    function closeModal() {
        certModal.classList.remove('active');
    }

    // Use event delegation for better reliability with 3D transforms
    document.addEventListener('click', (e) => {
        const card = e.target.closest('.cert-card');
        if (card) {
            console.log("Certificate clicked!");
            
            // Set the image based on the clicked card
            const imageSrc = card.getAttribute('data-image');
            const modalImage = document.getElementById('modalImage');
            
            // Update Image
            if (imageSrc) {
                modalImage.src = imageSrc;
            } else {
                modalImage.src = "html_certificate.png"; // Fallback
            }
            
            openModal();
        }
    });

    modalCloseBtn.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', closeModal);

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && certModal.classList.contains('active')) {
            closeModal();
        }
    });

    // Typing Effect
    const typingLines = [
        "Welcome to My Certification Showcase...",
        "Each certificate reflects my dedication...",
        "Scroll down to explore my achievements..."
    ];

    let lineIdx = 0;
    let charIdx = 0;
    const typingSpeed = 50;
    const typingElement = document.getElementById("typing-text");

    function typeEffect() {
        if (lineIdx < typingLines.length) {
            if (charIdx < typingLines[lineIdx].length) {
                typingElement.textContent += typingLines[lineIdx].charAt(charIdx);
                charIdx++;
                setTimeout(typeEffect, typingSpeed);
            } else {
                setTimeout(() => {
                    typingElement.textContent = "";
                    charIdx = 0;
                    lineIdx = (lineIdx + 1) % typingLines.length; // Loop back
                    typeEffect();
                }, 2000);
            }
        }
    }

    // Start typing effect after a short delay
    setTimeout(typeEffect, 2000);

});
