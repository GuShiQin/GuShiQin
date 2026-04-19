(function () {
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const root = document.documentElement;
    const seasonMap = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter'];
    const seasonText = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };
    const weatherText = {
        clear: '晴朗',
        cloudy: '多云',
        fog: '薄雾',
        drizzle: '细雨',
        rain: '雨幕',
        snow: '落雪',
        thunder: '雷暴'
    };
    const state = {
        season: seasonMap[new Date().getMonth()],
        weather: 'clear',
        hour: new Date().getHours(),
        chip: null,
        preview: null,
        seasonSelect: null,
        weatherSelect: null,
        scene: null,
        canvas: null,
        ctx: null,
        particles: [],
        raf: 0,
        flash: 0,
        autoSeason: seasonMap[new Date().getMonth()],
        autoWeather: 'clear',
        pointerX: 0,
        pointerY: 0,
        lastFrameTime: 0,
        interactive: !prefersReducedMotion
    };

    const seasonOptions = ['spring', 'summer', 'autumn', 'winter'];
    const weatherOptions = ['clear', 'cloudy', 'fog', 'drizzle', 'rain', 'snow', 'thunder'];
    const weatherCacheKey = 'gushiqin_weather_cache_v1';
    const weatherCacheMaxAge = 1000 * 60 * 60;
    let toastTimer = 0;
    let postIndexPromise = null;

    function mapWeatherCode(code) {
        if ([0, 1].includes(code)) return 'clear';
        if ([2, 3].includes(code)) return 'cloudy';
        if ([45, 48].includes(code)) return 'fog';
        if ([51, 53, 55, 56, 57].includes(code)) return 'drizzle';
        if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'rain';
        if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
        if ([95, 96, 99].includes(code)) return 'thunder';
        return 'cloudy';
    }

    function mapMetNoSymbol(symbolCode) {
        const code = String(symbolCode || '').toLowerCase();
        if (!code) return 'cloudy';
        if (code.indexOf('thunder') !== -1) return 'thunder';
        if (code.indexOf('snow') !== -1 || code.indexOf('sleet') !== -1 || code.indexOf('ice') !== -1) return 'snow';
        if (code.indexOf('rain') !== -1 || code.indexOf('drizzle') !== -1 || code.indexOf('showers') !== -1) {
            return code.indexOf('light') !== -1 ? 'drizzle' : 'rain';
        }
        if (code.indexOf('fog') !== -1) return 'fog';
        if (code.indexOf('clearsky') !== -1 || code.indexOf('fair') !== -1) return 'clear';
        if (code.indexOf('partlycloudy') !== -1 || code.indexOf('cloudy') !== -1 || code.indexOf('overcast') !== -1) return 'cloudy';
        return 'cloudy';
    }

    function fetchJsonWithTimeout(url, timeoutMs) {
        const controller = typeof AbortController === 'function' ? new AbortController() : null;
        const options = controller ? { signal: controller.signal } : undefined;
        let timeoutHandle = 0;
        if (controller) {
            timeoutHandle = window.setTimeout(function () {
                controller.abort();
            }, timeoutMs || 7000);
        }
        return fetch(url, options)
            .then(function (response) {
                if (timeoutHandle) window.clearTimeout(timeoutHandle);
                if (!response.ok) throw new Error('request_failed_' + response.status);
                return response.json();
            })
            .catch(function (error) {
                if (timeoutHandle) window.clearTimeout(timeoutHandle);
                throw error;
            });
    }

    function ensureBackdrop() {
        if (!document.body) return;
        if (!document.getElementById('dynamicBackdrop')) {
            const backdrop = document.createElement('div');
            backdrop.id = 'dynamicBackdrop';
            document.body.prepend(backdrop);
        }
        if (!document.getElementById('weatherScene')) {
            const scene = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            scene.setAttribute('id', 'weatherScene');
            scene.setAttribute('viewBox', '0 0 1440 900');
            scene.setAttribute('preserveAspectRatio', 'xMidYMid slice');
            document.body.prepend(scene);
        }
        if (!document.getElementById('seasonCanvas')) {
            const canvas = document.createElement('canvas');
            canvas.id = 'seasonCanvas';
            document.body.prepend(canvas);
        }
        state.scene = document.getElementById('weatherScene');
        state.canvas = document.getElementById('seasonCanvas');
        state.ctx = state.canvas.getContext('2d');
    }

    function applyState() {
        document.documentElement.setAttribute('data-season', state.season);
        document.documentElement.setAttribute('data-weather', state.weather);
        document.documentElement.setAttribute('data-dayphase', state.hour >= 18 || state.hour < 6 ? 'night' : 'day');
        renderPreviewControls();
        renderChip();
        renderOrbs();
        renderWeatherScene();
        resizeCanvas();
        buildParticles();
        startFx();
    }

    function renderChip() {
        const titleRight = document.querySelector('.title-right');
        if (!titleRight) return;
        if (!state.chip) {
            state.chip = document.createElement('span');
            state.chip.className = 'weather-chip';
            titleRight.prepend(state.chip);
        }
        state.chip.textContent = seasonText[state.season] + ' · ' + (weatherText[state.weather] || '天气中');
    }

    function renderPreviewControls() {
        const titleRight = document.querySelector('.title-right');
        if (!titleRight) return;
        if (!state.preview) {
            const wrap = document.createElement('div');
            wrap.className = 'weather-preview';
            const seasonSelect = document.createElement('select');
            const weatherSelect = document.createElement('select');

            seasonOptions.forEach(function (value) {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = seasonText[value];
                seasonSelect.appendChild(option);
            });

            weatherOptions.forEach(function (value) {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = weatherText[value];
                weatherSelect.appendChild(option);
            });

            seasonSelect.addEventListener('change', function () {
                state.season = seasonSelect.value;
                applyState();
            });

            weatherSelect.addEventListener('change', function () {
                state.weather = weatherSelect.value;
                applyState();
            });

            wrap.appendChild(seasonSelect);
            wrap.appendChild(weatherSelect);
            titleRight.prepend(wrap);

            state.preview = wrap;
            state.seasonSelect = seasonSelect;
            state.weatherSelect = weatherSelect;
        }

        if (state.seasonSelect) state.seasonSelect.value = state.season;
        if (state.weatherSelect) state.weatherSelect.value = state.weather;
    }

    function bindCopyButtons() {
        document.querySelectorAll('.intro-copy').forEach(function (button) {
            if (button.dataset.bound === '1') return;
            button.dataset.bound = '1';
            button.addEventListener('click', function () {
                const text = button.dataset.copyText || button.textContent.trim();
                const done = function () {
                    button.classList.add('is-copied');
                    showToast('复制成功');
                    window.setTimeout(function () {
                        button.classList.remove('is-copied');
                    }, 900);
                };

                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text).then(done).catch(function () {
                        fallbackCopy(text, done);
                    });
                } else {
                    fallbackCopy(text, done);
                }
            });
        });
    }

    function showToast(message) {
        let toast = document.querySelector('.site-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'site-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add('is-visible');
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(function () {
            toast.classList.remove('is-visible');
        }, 1500);
    }

    function fallbackCopy(text, callback) {
        const input = document.createElement('textarea');
        input.value = text;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        if (typeof callback === 'function') callback();
    }

    function renderWeatherScene() {
        if (!state.scene) return;
        const active = state.weather;
        state.scene.innerHTML = [
            '<defs>',
            '<linearGradient id="rainStroke" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(175,210,255,0)"/><stop offset="100%" stop-color="rgba(123,170,255,0.9)"/></linearGradient>',
            '<filter id="softBlur"><feGaussianBlur stdDeviation="10"/></filter>',
            '</defs>',
            '<g class="weather-layer weather-soft" transform="translate(0 0)">',
            createWeatherGroup('clear', active, createClearScene()),
            createWeatherGroup('cloudy', active, createCloudScene(false)),
            createWeatherGroup('fog', active, createFogScene()),
            createWeatherGroup('drizzle', active, createRainScene(true)),
            createWeatherGroup('rain', active, createRainScene(false)),
            createWeatherGroup('snow', active, createSnowScene()),
            createWeatherGroup('thunder', active, createThunderScene()),
            '</g>'
        ].join('');
    }

    function createWeatherGroup(name, active, content) {
        return '<g data-weather-group="' + name + '" class="' + (name === active ? 'weather-visible' : 'weather-hidden') + '">' + content + '</g>';
    }

    function createClearScene() {
        return [
            '<g class="weather-core" transform="translate(1288 118)">',
            '<circle class="sun-core" cx="0" cy="0" r="54"/>',
            '<circle class="sun-ring weather-stroke" cx="0" cy="0" r="82"/>',
            '</g>',
            createCloudShape(70, 148, 0.58),
            createCloudShape(1188, 228, 0.72)
        ].join('');
    }

    function createCloudScene(denser) {
        return [
            createCloudShape(40, 160, denser ? 1.06 : 0.78),
            createCloudShape(1120, 146, denser ? 1.24 : 0.98),
            createCloudShape(1240, 284, denser ? 0.82 : 0.66)
        ].join('');
    }

    function createFogScene() {
        return [
            createCloudScene(true),
            '<g class="weather-core" filter="url(#softBlur)">',
            createFogBand(-20, 238, 610, 72),
            createFogBand(848, 236, 642, 76),
            createFogBand(82, 352, 480, 54),
            createFogBand(918, 360, 454, 56),
            createFogBand(36, 468, 560, 60),
            createFogBand(844, 474, 544, 62),
            '</g>'
        ].join('');
    }

    function createRainScene(light) {
        return [
            createCloudScene(true),
            light ? '<g class="weather-core" filter="url(#softBlur)">' + createFogBand(80, 248, 430, 34) + createFogBand(932, 248, 430, 34) + '</g>' : ''
        ].join('');
    }

    function createSnowScene() {
        const dots = [];
        const snowPoints = [
            [58, 202], [124, 286], [208, 234], [286, 342], [394, 252], [486, 366], [584, 220], [540, 164],
            [864, 214], [942, 326], [1022, 238], [1108, 352], [1198, 250], [1284, 192], [1378, 306], [1218, 156], [228, 170], [1322, 228]
        ];
        for (let i = 0; i < snowPoints.length; i += 1) {
            const x = snowPoints[i][0];
            const y = snowPoints[i][1];
            dots.push('<circle class="snow-dot" cx="' + x + '" cy="' + y + '" r="' + (2.8 + (i % 4) * 0.8) + '"/>');
        }
        return [createCloudScene(false), '<g class="weather-core">', dots.join(''), '</g>'].join('');
    }

    function createThunderScene() {
        return [
            createRainScene(false),
            '<g class="weather-core" transform="translate(1112 142) scale(1.08)"><path class="bolt" d="M0 0 L38 0 L10 66 L48 66 L-10 150 L8 84 L-26 84 Z"/></g>',
            '<g class="weather-core" transform="translate(188 198) scale(0.86)"><path class="bolt bolt-soft" d="M0 0 L38 0 L10 66 L48 66 L-10 150 L8 84 L-26 84 Z"/></g>'
        ].join('');
    }

    function createCloudShape(x, y, scale) {
        return '<g class="weather-core" transform="translate(' + x + ' ' + y + ') scale(' + scale + ')"><path class="cloud-shape" d="M88 84c0-25 19-44 44-44 8 0 16 2 23 6 10-21 31-34 56-34 35 0 63 27 64 62 24 2 43 21 43 46 0 27-22 48-49 48H100c-33 0-60-26-60-58 0-29 21-53 48-58z"/></g>';
    }

    function createFogBand(x, y, width, height) {
        const radius = height / 2;
        return '<rect class="fog-band" x="' + x + '" y="' + y + '" width="' + width + '" height="' + height + '" rx="' + radius + '" ry="' + radius + '"/>';
    }

    function renderOrbs() {
        const backdrop = document.getElementById('dynamicBackdrop');
        if (!backdrop) return;
        backdrop.innerHTML = '';
        const colors = {
            spring: ['rgba(96, 211, 160, 0.24)', 'rgba(255, 182, 201, 0.2)', 'rgba(132, 198, 255, 0.18)'],
            summer: ['rgba(83, 177, 255, 0.24)', 'rgba(255, 205, 109, 0.22)', 'rgba(54, 224, 201, 0.18)'],
            autumn: ['rgba(240, 153, 72, 0.24)', 'rgba(164, 94, 44, 0.18)', 'rgba(255, 211, 132, 0.18)'],
            winter: ['rgba(129, 173, 255, 0.2)', 'rgba(176, 232, 255, 0.18)', 'rgba(126, 147, 204, 0.18)']
        };
        colors[state.season].forEach(function (color, index) {
            const orb = document.createElement('span');
            orb.className = 'orb';
            orb.style.background = color;
            orb.style.width = (160 + index * 70) + 'px';
            orb.style.height = (160 + index * 70) + 'px';
            orb.style.left = (12 + index * 28) + '%';
            orb.style.top = index === 1 ? '58%' : (10 + index * 20) + '%';
            orb.style.animationDuration = (16 + index * 7) + 's';
            backdrop.appendChild(orb);
        });
    }

    function resizeCanvas() {
        if (!state.canvas) return;
        const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
        state.canvas.width = Math.floor(window.innerWidth * ratio);
        state.canvas.height = Math.floor(window.innerHeight * ratio);
        state.canvas.style.width = window.innerWidth + 'px';
        state.canvas.style.height = window.innerHeight + 'px';
        state.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function buildParticles() {
        if (!state.canvas) return;
        const countByWeather = { clear: 10, cloudy: 10, fog: 18, drizzle: 44, rain: 72, snow: 28, thunder: 82 };
        const total = prefersReducedMotion ? 0 : (countByWeather[state.weather] || 16);
        state.particles = [];
        for (let i = 0; i < total; i += 1) {
            state.particles.push(createParticle(i));
        }
    }

    function createParticle(index) {
        const width = Math.max(window.innerWidth, 1);
        const height = Math.max(window.innerHeight, 1);
        const weather = state.weather;
        const sideBiasedX = Math.random() < 0.5
            ? Math.random() * width * 0.34
            : width * 0.66 + Math.random() * width * 0.34;
        return {
            x: weather === 'fog' || weather === 'snow' || weather === 'cloudy' ? sideBiasedX : Math.random() * width,
            y: weather === 'rain' || weather === 'drizzle' || weather === 'thunder' ? Math.random() * (height + 120) - 120 : Math.random() * height,
            vx: weather === 'snow' ? (Math.random() - 0.5) * 0.8 : (Math.random() - 0.5) * 0.3,
            vy: weather === 'rain' ? 6.2 + Math.random() * 5.6 : weather === 'drizzle' ? 4.2 + Math.random() * 3.2 : weather === 'thunder' ? 6.8 + Math.random() * 5.8 : 0.4 + Math.random() * 1.4,
            size: weather === 'snow' ? 1 + Math.random() * 3 : weather === 'fog' ? 38 + Math.random() * 42 : 1 + Math.random() * 2.2,
            alpha: weather === 'fog' ? 0.1 + Math.random() * 0.14 : weather === 'snow' ? 0.36 + Math.random() * 0.36 : 0.18 + Math.random() * 0.35,
            drift: Math.random() * Math.PI * 2,
            seed: index
        };
    }

    function drawParticle(particle, index, time) {
        const ctx = state.ctx;
        const weather = state.weather;
        ctx.save();
        if (weather === 'rain' || weather === 'drizzle' || weather === 'thunder') {
            ctx.strokeStyle = weather === 'thunder' ? 'rgba(177, 197, 255,' + Math.min(particle.alpha + 0.08, 0.9) + ')' : 'rgba(126, 170, 255,' + Math.min(particle.alpha + 0.1, 0.88) + ')';
            ctx.lineWidth = weather === 'drizzle' ? 0.9 : weather === 'rain' ? 1.15 : 1.25;
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(particle.x - (weather === 'drizzle' ? 2.2 : 2.8), particle.y + (weather === 'drizzle' ? 11 : weather === 'rain' ? 18 : 20));
            ctx.stroke();
        } else if (weather === 'snow') {
            ctx.fillStyle = 'rgba(255,255,255,' + particle.alpha + ')';
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        } else if (weather === 'fog' || weather === 'cloudy') {
            const gradient = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.size);
            gradient.addColorStop(0, 'rgba(255,255,255,' + particle.alpha + ')');
            gradient.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        } else {
            const hue = state.season === 'spring' ? '122, 203, 161' : state.season === 'summer' ? '88, 186, 255' : state.season === 'autumn' ? '255, 174, 97' : '188, 223, 255';
            ctx.fillStyle = 'rgba(' + hue + ',' + particle.alpha + ')';
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
            if (index % 6 === 0) {
                ctx.fillStyle = 'rgba(255,255,255,' + Math.min(particle.alpha + 0.08, 0.8) + ')';
                ctx.fillRect(particle.x, particle.y, 1.5, 1.5);
            }
        }
        ctx.restore();

        particle.x += particle.vx + Math.sin(time / 1200 + particle.seed) * 0.08 + state.pointerX * 0.02;
        particle.y += particle.vy;
        if (weather === 'snow') particle.x += Math.sin(time / 800 + particle.drift) * 0.6 + state.pointerX * 0.04;
        if (weather === 'fog' || weather === 'cloudy') particle.x += Math.sin(time / 1600 + particle.drift) * 0.18 + state.pointerX * 0.03;

        if (particle.y > window.innerHeight + 40) {
            particle.y = -20;
            particle.x = Math.random() * window.innerWidth;
        }
        if (particle.x > window.innerWidth + 40) particle.x = -20;
        if (particle.x < -40) particle.x = window.innerWidth + 20;
    }

    function animate(time) {
        if (!state.ctx) return;
        if (time - state.lastFrameTime < 30) {
            state.raf = window.requestAnimationFrame(animate);
            return;
        }
        state.lastFrameTime = time;
        state.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        if (state.weather === 'thunder' && !prefersReducedMotion) {
            if (Math.random() > 0.992) state.flash = 0.26;
            if (state.flash > 0.01) {
                state.ctx.fillStyle = 'rgba(218, 228, 255,' + state.flash + ')';
                state.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
                state.flash *= 0.92;
            }
        }
        state.particles.forEach(function (particle, index) {
            drawParticle(particle, index, time || 0);
        });
        state.raf = window.requestAnimationFrame(animate);
    }

    function startFx() {
        if (prefersReducedMotion) return;
        if (state.raf) window.cancelAnimationFrame(state.raf);
        state.lastFrameTime = 0;
        state.raf = window.requestAnimationFrame(animate);
    }

    function bindPointerInteraction() {
        if (!state.interactive) return;
        window.addEventListener('pointermove', function (event) {
            const nx = event.clientX / Math.max(window.innerWidth, 1) - 0.5;
            const ny = event.clientY / Math.max(window.innerHeight, 1) - 0.5;
            state.pointerX = nx;
            state.pointerY = ny;
            root.style.setProperty('--mx', (nx * 16).toFixed(2));
            root.style.setProperty('--my', (ny * 12).toFixed(2));
        }, { passive: true });
    }

    function decoratePage() {
        const body = document.body;
        if (!body) return;
        if (!body.classList.contains('page-home') && !body.classList.contains('page-tag') && !body.classList.contains('page-post')) {
            const isPost = !!document.getElementById('postBody');
            body.classList.add(isPost ? 'page-post' : document.querySelector('.tagTitle') ? 'page-tag' : 'page-home');
        }
        if (body.classList.contains('page-post')) {
            const content = document.getElementById('content');
            const postBody = document.getElementById('postBody');
            if (content && postBody && !content.querySelector('.article-shell')) {
                const shell = document.createElement('div');
                shell.className = 'article-shell';
                content.insertBefore(shell, content.firstChild);

                const kicker = content.querySelector('#header .page-kicker');
                if (kicker) {
                    shell.appendChild(kicker.cloneNode(true));
                }

                const title = content.querySelector('#header .postTitle');
                if (title) {
                    shell.appendChild(title.cloneNode(true));
                }

                shell.appendChild(postBody);
                const extraNodes = Array.from(content.childNodes).filter(function (node) {
                    return node !== shell && node.nodeType === 1;
                });
                extraNodes.forEach(function (node) { shell.appendChild(node); });
            }
        }
    }

    function stripHtmlTags(text) {
        return String(text || '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function setMetaContent(selector, value) {
        if (!value) return;
        const node = document.querySelector(selector);
        if (node) {
            node.setAttribute('content', value);
        }
    }

    function applySiteConfig(config) {
        if (!config || typeof config !== 'object') return;
        const body = document.body;
        const isHome = !!(body && body.classList.contains('page-home'));
        const isTag = !!(body && body.classList.contains('page-tag'));

        const title = typeof config.title === 'string' ? config.title.trim() : '';
        const subTitle = typeof config.subTitle === 'string' ? config.subTitle : '';
        const avatarUrl = typeof config.avatarUrl === 'string' ? config.avatarUrl.trim() : '';

        if (title) {
            if (isHome) {
                document.title = title;
            } else if (isTag) {
                document.title = title + ' - Tag';
            }

            document.querySelectorAll('.blogTitle').forEach(function (node) {
                node.textContent = title;
            });
            document.querySelectorAll('#footer1 a').forEach(function (node) {
                node.textContent = title;
            });
            setMetaContent('meta[property="og:title"]', title);
        }

        if (isHome && subTitle) {
            const intro = document.querySelector('.hero-intro p');
            if (intro) {
                intro.innerHTML = subTitle;
            }

            const plainSubTitle = stripHtmlTags(subTitle);
            setMetaContent('meta[name="description"]', plainSubTitle);
            setMetaContent('meta[property="og:description"]', plainSubTitle);
        }

        if (avatarUrl) {
            const avatar = document.getElementById('avatarImg');
            if (avatar) {
                avatar.src = avatarUrl;
            }

            const favicon = document.querySelector('link[rel="icon"]');
            if (favicon) {
                favicon.setAttribute('href', avatarUrl);
            }
            setMetaContent('meta[property="og:image"]', avatarUrl);
        }
    }

    function loadSiteConfig() {
        if (!window.fetch) return;
        const basePath = getBasePath();
        const candidates = [];

        // Local root preview commonly serves files from /docs/, where the source config sits one level up.
        if (location.pathname.indexOf('/docs/') !== -1) {
            candidates.push('../config.json');
        }

        candidates.push(basePath + 'config.json');

        if (basePath === './') {
            candidates.push('../config.json');
        }

        function attempt(index) {
            if (index >= candidates.length) return Promise.resolve();
            return fetch(candidates[index], { cache: 'no-store' })
                .then(function (response) {
                    if (!response.ok) throw new Error('config_request_failed');
                    return response.json();
                })
                .then(function (config) {
                    applySiteConfig(config);
                })
                .catch(function () {
                    return attempt(index + 1);
                });
        }

        return attempt(0);
    }

    function loadPostIndex() {
        if (postIndexPromise) return postIndexPromise;
        postIndexPromise = fetch(getBasePath() + 'postList.json')
            .then(function (response) {
                if (!response.ok) throw new Error('post_index_failed');
                return response.json();
            })
            .catch(function () {
                return loadPostIndexFromScript().catch(function () { return null; });
            });
        return postIndexPromise;
    }

    function loadPostIndexFromScript() {
        return new Promise(function (resolve, reject) {
            if (window.__POST_LIST_DATA__) {
                resolve(window.__POST_LIST_DATA__);
                return;
            }
            const script = document.createElement('script');
            script.src = getBasePath() + 'postList.data.js';
            script.onload = function () {
                if (window.__POST_LIST_DATA__) {
                    resolve(window.__POST_LIST_DATA__);
                } else {
                    reject(new Error('post_index_script_missing_data'));
                }
            };
            script.onerror = function () {
                reject(new Error('post_index_script_failed'));
            };
            document.head.appendChild(script);
        });
    }

    function getBasePath() {
        const pathname = String(location.pathname || '/');
        if (pathname.indexOf('/post/') !== -1) {
            return '../';
        }
        if (!/\.html?$/i.test(pathname) && !pathname.endsWith('/')) {
            return pathname + '/';
        }
        return './';
    }

    function normalizePath(path) {
        const cleaned = String(path || '').replace(/\\/g, '/').replace(/^\.?\//, '').replace(/^\//, '');
        try {
            return decodeURIComponent(cleaned);
        } catch (error) {
            return cleaned;
        }
    }

    function getCurrentPostInfo(data) {
        if (!data) return null;
        const current = normalizePath(location.pathname.split('/docs/').pop() || location.pathname.split('/GuShiQin/').pop() || location.pathname);
        const currentTitleNode = document.querySelector('#header .postTitle, .postTitle');
        const currentTitle = currentTitleNode ? currentTitleNode.textContent.trim() : '';
        return Object.keys(data).reduce(function (found, key) {
            if (found || key === 'labelColorDict') return found;
            const item = data[key];
            const itemPath = normalizePath(item.postUrl);
            if (itemPath === current || normalizePath('docs/' + item.postUrl) === current) {
                return item;
            }
            return currentTitle && String(item.postTitle || '').trim() === currentTitle ? item : null;
        }, null);
    }

    function renderArticleTags() {
        if (!document.body.classList.contains('page-post')) return;
        loadPostIndex().then(function (data) {
            const shell = document.querySelector('.article-shell');
            if (!shell || !data) return;
            const postInfo = getCurrentPostInfo(data);
            if (!postInfo) return;
            const oldMeta = shell.querySelector('.article-meta');
            if (oldMeta) oldMeta.remove();
            const old = shell.querySelector('.article-tag-list');
            if (old) old.remove();
            const postBody = shell.querySelector('#postBody');
            if (!postBody) return;

            const meta = document.createElement('div');
            meta.className = 'article-meta';

            if (postInfo.createdDate) {
                const date = document.createElement('span');
                date.className = 'article-date';
                date.textContent = postInfo.createdDate;
                meta.appendChild(date);
            }

            if (Array.isArray(postInfo.labels) && postInfo.labels.length) {
                postInfo.labels.forEach(function (label) {
                    const chip = document.createElement('span');
                    chip.className = 'article-meta-tag';
                    chip.textContent = label;
                    chip.style.backgroundColor = (data.labelColorDict && data.labelColorDict[label]) || '#008672';
                    chip.style.color = '#fff';
                    meta.appendChild(chip);
                });
            }

            if (meta.children.length) {
                shell.insertBefore(meta, postBody);
            }
        });
    }

    function syncTocLayout() {
        const toc = document.querySelector('.toc');
        if (!toc) return;

        const isPost = document.body && document.body.classList.contains('page-post');
        const shouldShow = isPost && window.innerWidth >= 1600;
        if (!shouldShow) {
            toc.style.setProperty('display', 'none', 'important');
            return;
        }

        const rootStyle = window.getComputedStyle(document.documentElement);
        const parsedMax = parseInt(rootStyle.getPropertyValue('--site-max-width'), 10);
        const siteMaxWidth = Number.isFinite(parsedMax) ? parsedMax : 1120;
        const sideSpace = Math.max((window.innerWidth - siteMaxWidth) / 2, 0);
        if (sideSpace < 220) {
            toc.style.setProperty('display', 'none', 'important');
            return;
        }

        const tocWidth = Math.max(200, Math.min(240, Math.floor(sideSpace - 16)));
        toc.style.setProperty('display', 'block', 'important');
        toc.style.setProperty('position', 'fixed', 'important');
        toc.style.setProperty('top', '118px', 'important');
        toc.style.setProperty('left', 'auto', 'important');
        toc.style.setProperty('right', '16px', 'important');
        toc.style.setProperty('transform', 'none', 'important');
        toc.style.setProperty('width', tocWidth + 'px', 'important');
        toc.style.setProperty('max-height', '70vh', 'important');
        toc.style.setProperty('overflow-y', 'auto', 'important');
        toc.style.setProperty('z-index', '40', 'important');
    }

    function wrapMediaNode(node) {
        if (!node || !node.parentElement || node.closest('.media-shell')) return;
        const wrapper = document.createElement('div');
        const isAudio = node.tagName.toLowerCase() === 'audio';
        const isEmbed = node.tagName.toLowerCase() === 'iframe' || node.tagName.toLowerCase() === 'video';
        wrapper.className = 'media-shell' + (isAudio ? ' media-shell--audio' : '') + (isEmbed ? ' media-shell--embed' : '');
        node.parentElement.insertBefore(wrapper, node);
        wrapper.appendChild(node);
    }

    function decodeEscapedHtml(text) {
        return String(text)
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;|&#x27;/g, "'")
            .replace(/&amp;/g, '&');
    }

    function isSafeMediaSrc(src) {
        if (!src) return false;
        const value = String(src).trim();
        if (!value) return false;
        const lower = value.toLowerCase();
        if (lower.indexOf('javascript:') === 0 || lower.indexOf('data:') === 0 || lower.indexOf('vbscript:') === 0) {
            return false;
        }
        return /^(https?:)?\/\//i.test(value) || /^[./]/.test(value);
    }

    function normalizeMediaSrc(el) {
        const src = el.getAttribute('src');
        if (src) {
            if (!isSafeMediaSrc(src)) return false;
            if (/^\/\//.test(src)) {
                el.setAttribute('src', 'https:' + src);
            }
        }

        const sources = el.querySelectorAll('source[src]');
        for (let i = 0; i < sources.length; i += 1) {
            const source = sources[i];
            const sourceSrc = source.getAttribute('src');
            if (!isSafeMediaSrc(sourceSrc)) return false;
            if (/^\/\//.test(sourceSrc)) {
                source.setAttribute('src', 'https:' + sourceSrc);
            }
        }

        return true;
    }

    function createEmbedNodeFromText(rawText) {
        const template = document.createElement('template');
        template.innerHTML = decodeEscapedHtml(rawText).trim();
        const node = template.content.firstElementChild;
        if (!node) return null;
        const tag = node.tagName.toLowerCase();
        if (tag !== 'iframe' && tag !== 'video' && tag !== 'audio') return null;
        if (!normalizeMediaSrc(node)) return null;

        if (tag === 'iframe') {
            if (!node.hasAttribute('loading')) node.setAttribute('loading', 'lazy');
            if (!node.hasAttribute('referrerpolicy')) node.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
            if (!node.hasAttribute('allow')) node.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
        }
        if ((tag === 'video' || tag === 'audio') && !node.hasAttribute('controls')) {
            node.setAttribute('controls', 'controls');
        }
        return node;
    }

    function restoreEscapedMediaEmbeds() {
        const postBody = document.getElementById('postBody');
        if (!postBody) return;

        const walker = document.createTreeWalker(postBody, NodeFilter.SHOW_TEXT, {
            acceptNode: function (node) {
                if (!node || !node.nodeValue) return NodeFilter.FILTER_REJECT;
                if (!/(?:&lt;|<)(iframe|video|audio)\b/i.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                if (parent.closest('pre, code')) return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            }
        });

        const textNodes = [];
        while (walker.nextNode()) {
            textNodes.push(walker.currentNode);
        }

        const mediaPattern = /(?:&lt;|<)(iframe|video|audio)\b[\s\S]*?(?:&lt;|<)\/\1(?:&gt;|>)/ig;
        textNodes.forEach(function (textNode) {
            const text = textNode.nodeValue;
            let match;
            let changed = false;
            let cursor = 0;
            const frag = document.createDocumentFragment();

            while ((match = mediaPattern.exec(text)) !== null) {
                const before = text.slice(cursor, match.index);
                if (before) {
                    frag.appendChild(document.createTextNode(before));
                }
                const embedNode = createEmbedNodeFromText(match[0]);
                if (embedNode) {
                    frag.appendChild(embedNode);
                    changed = true;
                } else {
                    frag.appendChild(document.createTextNode(match[0]));
                }
                cursor = match.index + match[0].length;
            }

            if (!changed) return;
            const rest = text.slice(cursor);
            if (rest) {
                frag.appendChild(document.createTextNode(rest));
            }
            textNode.parentNode.replaceChild(frag, textNode);
        });
    }

    function enhanceMediaEmbeds() {
        const postBody = document.getElementById('postBody');
        if (!postBody) return;
        Array.prototype.forEach.call(postBody.querySelectorAll('iframe, video, audio, img'), function (node) {
            wrapMediaNode(node);
        });
    }

    function inferFallbackWeather() {
        if (state.season === 'winter') return 'snow';
        if (state.season === 'spring') return 'cloudy';
        if (state.season === 'autumn') return 'cloudy';
        return state.hour >= 19 ? 'cloudy' : 'clear';
    }

    function readWeatherCache() {
        try {
            const raw = window.localStorage.getItem(weatherCacheKey);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return null;
            if (!parsed.timestamp || Date.now() - parsed.timestamp > weatherCacheMaxAge) return null;
            if (typeof parsed.weather !== 'string') return null;
            return parsed;
        } catch (error) {
            return null;
        }
    }

    function writeWeatherCache(payload) {
        try {
            window.localStorage.setItem(weatherCacheKey, JSON.stringify({
                timestamp: Date.now(),
                weather: payload.weather,
                season: payload.season || state.season,
                latitude: payload.latitude,
                longitude: payload.longitude,
                region: payload.region || '',
                city: payload.city || ''
            }));
        } catch (error) {}
    }

    function applyWeatherResult(weather, latitude, longitude, meta) {
        if (typeof weather !== 'string') return;
        state.autoWeather = weather;
        state.weather = weather;
        applyState();
        writeWeatherCache({
            weather: state.autoWeather,
            season: state.season,
            latitude: latitude,
            longitude: longitude,
            region: meta && meta.region,
            city: meta && meta.city
        });
    }

    function loadWeatherFromOpenMeteo(latitude, longitude) {
        const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + latitude + '&longitude=' + longitude + '&current=weather_code&timezone=auto';
        return fetchJsonWithTimeout(url, 7000)
            .then(function (data) {
                if (data && data.current && typeof data.current.weather_code === 'number') {
                    return mapWeatherCode(data.current.weather_code);
                }
                throw new Error('weather_code_missing');
            });
    }

    function loadWeatherFromMetNo(latitude, longitude) {
        const url = 'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=' + latitude + '&lon=' + longitude;
        return fetchJsonWithTimeout(url, 7000)
            .then(function (data) {
                const series = data && data.properties && data.properties.timeseries;
                if (!Array.isArray(series) || !series.length) throw new Error('met_no_timeseries_missing');
                const first = series[0] && series[0].data;
                const symbol =
                    (first && first.next_1_hours && first.next_1_hours.summary && first.next_1_hours.summary.symbol_code) ||
                    (first && first.next_6_hours && first.next_6_hours.summary && first.next_6_hours.summary.symbol_code) ||
                    (first && first.next_12_hours && first.next_12_hours.summary && first.next_12_hours.summary.symbol_code);
                if (!symbol) throw new Error('met_no_symbol_missing');
                return mapMetNoSymbol(symbol);
            });
    }

    function loadWeatherFromCoordinates(latitude, longitude, meta) {
        return loadWeatherFromOpenMeteo(latitude, longitude)
            .catch(function (error) {
                console.warn('[weather] open-meteo failed, fallback to met.no', error);
                return loadWeatherFromMetNo(latitude, longitude);
            })
            .then(function (weather) {
                applyWeatherResult(weather, latitude, longitude, meta);
            });
    }

    function loadWeatherByIp() {
        const cached = readWeatherCache();
        if (cached) {
            state.autoWeather = cached.weather;
            state.weather = cached.weather;
            applyState();
            return Promise.resolve(cached);
        }

        return fetch('https://ipwho.is/')
            .then(function (response) {
                if (!response.ok) throw new Error('ip_request_failed');
                return response.json();
            })
            .then(function (data) {
                if (!data || data.success === false || typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
                    throw new Error('ip_location_invalid');
                }
                return loadWeatherFromCoordinates(data.latitude, data.longitude, {
                    region: data.region,
                    city: data.city
                });
            });
    }

    function loadWeather() {
        state.autoSeason = seasonMap[new Date().getMonth()];
        state.season = state.autoSeason;
        state.autoWeather = inferFallbackWeather();
        state.weather = state.autoWeather;
        applyState();
        if (!window.fetch) return;
        loadWeatherByIp().catch(function (error) {
            console.warn('[weather] ip-based weather failed, keep fallback weather', error);
        });
    }

    function init() {
        ensureBackdrop();
        decoratePage();
        loadSiteConfig();
        restoreEscapedMediaEmbeds();
        enhanceMediaEmbeds();
        bindCopyButtons();
        renderArticleTags();
        syncTocLayout();
        window.setTimeout(syncTocLayout, 0);
        renderPreviewControls();
        bindPointerInteraction();
        loadWeather();
        window.addEventListener('resize', function () {
            resizeCanvas();
            buildParticles();
            syncTocLayout();
        });
        window.addEventListener('load', syncTocLayout);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();