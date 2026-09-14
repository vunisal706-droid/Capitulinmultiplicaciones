// Capitulín - Multiplicaciones Mágicas
// Juego educativo con estilo Mario Bros

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        window.addEventListener('orientationchange', () => setTimeout(() => this.resizeCanvas(), 100));

        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        this.initGame();
        this.initEventListeners();
        this.initPWA();
        
        this.gameLoop();
    }

    resizeCanvas() {
        const isPortrait = window.innerHeight > window.innerWidth;
        
        if (isPortrait) {
            this.canvas.width = Math.min(window.innerWidth, 800);
            this.canvas.height = Math.min(window.innerHeight, 600);
        } else {
            const maxHeight = window.innerHeight;
            this.canvas.height = maxHeight;
            this.canvas.width = Math.min(maxHeight * 1.77, window.innerWidth);
        }
        
        if (this.player) {
            this.player.groundY = this.canvas.height - 50;
        }
    }

    initGame() {
        // Estado del juego
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.gameRunning = false;
        this.gameStarted = false;
        this.isPaused = false;
        this.invincible = false;
        this.invincibleTimer = 0;
        
        // Configuración de tablas
        this.selectedTable = null;
        this.selectedDifficulty = null;
        this.tableMode = 'none';
        this.usedMultipliers = new Set();
        
        // Power-ups
        this.powerUpInventory = { helmet: 0, umbrella: 0, whistle: 0 };
        this.activePowerUps = { helmetHits: 0, umbrellaTime: 0 };
        
        // Entidades
        this.player = {
            x: 50, y: 450, width: 40, height: 50,
            velocityY: 0, velocityX: 0,
            speed: 5, jumpPower: 15, gravity: 0.6,
            isJumping: false, direction: 1,
            groundY: this.canvas.height - 50
        };
        
        this.platforms = [];
        this.crowns = [];
        this.monsters = [];
        this.pencils = [];
        this.witch = null;
        this.witchSpawned = false;
        
        this.monsterSpawnTimer = 0;
        this.keys = {};
        
        // Fondo estilo Mario
        this.clouds = [
            { x: 100, y: 80, size: 50, speed: 0.2 },
            { x: 400, y: 120, size: 60, speed: 0.3 },
            { x: 650, y: 60, size: 45, speed: 0.25 },
            { x: 900, y: 100, size: 55, speed: 0.15 }
        ];
        
        this.mountains = [
            { x: 0, y: this.canvas.height - 50, width: 200, height: 150, color: '#228B22' },
            { x: 300, y: this.canvas.height - 50, width: 250, height: 200, color: '#2E8B57' },
            { x: 700, y: this.canvas.height - 50, width: 180, height: 120, color: '#228B22' }
        ];
        
        this.bushes = [
            { x: 150, y: this.canvas.height - 70, size: 40 },
            { x: 500, y: this.canvas.height - 70, size: 50 },
            { x: 800, y: this.canvas.height - 70, size: 35 }
        ];

        this.jokes = [
            "¿Qué hace una abeja en el gimnasio?\n¡Zum-ba!",
            "¿Cuál es el colmo de un electricista?\nQue su mujer se llame Luz y los hijos le sigan la corriente.",
            "- ¿Por qué los elefantes no usan computadora?\n- Porque le tienen miedo al ratón.",
            "- ¿Qué le dice un techo a otro techo?\n- Techo de menos.",
            "¿Qué le dice un jardinero a otro?\nDisfrutemos mientras podamos.",
            "- Mamá, en el colegio me llaman despistado.\n- Niño, tu casa es la de enfrente.",
            "- ¿Qué le dice una impresora a otra?\n- ¿Esta hoja es tuya o es impresión mía?",
            "- Mamá, ¿qué haces en frente del ordenador con los ojos cerrados?\n- Nada hijo, es que Windows me ha dicho que cierre las pestañas…",
            "- Doctor, doctor! Mire me toco aquí y me duele... ¿sabe qué es lo que me pasa?\n- Usted tiene el dedo roto.",
            "- ¿Sabes que mi hermano anda en bicicleta desde los cuatro años?\n- Mmm, ya debe estar lejos."
        ];
    }

    initEventListeners() {
        // Guardar referencia a this para los event listeners
        const self = this;

        // Controles de tabla y dificultad
        document.querySelectorAll('.table-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.table-btn').forEach(b => b.classList.remove('selected'));
                this.classList.add('selected');
                self.selectedTable = this.dataset.table;
                self.checkStartButton();
            });
        });

        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('selected'));
                this.classList.add('selected');
                self.selectedDifficulty = this.dataset.difficulty;
                self.checkStartButton();
            });
        });

        // Botón de inicio - USAR BIND PARA MANTENER EL CONTEXTO
        const startBtn = document.getElementById('startGameBtn');
        startBtn.addEventListener('click', () => this.startGame());

        document.getElementById('restartBtn').addEventListener('click', () => this.restartGame());
        document.getElementById('shopBtn').addEventListener('click', () => this.openShop());
        document.getElementById('closeShopBtn').addEventListener('click', () => this.closeShop());
        document.getElementById('submitAnswer').addEventListener('click', () => this.checkAnswer());
        document.getElementById('continueBtn').addEventListener('click', () => this.continueGame());
        
        document.getElementById('answerInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.checkAnswer();
        });

        // Power-ups
        document.getElementById('helmetBtn').addEventListener('click', () => this.activateHelmet());
        document.getElementById('umbrellaBtn').addEventListener('click', () => this.activateUmbrella());
        document.getElementById('whistleBtn').addEventListener('click', () => this.activateWhistle());

        document.querySelectorAll('.shop-item').forEach(item => {
            item.addEventListener('click', function() {
                self.buyPowerUp(this.dataset.powerup);
            });
        });

        // Controles táctiles
        ['leftBtn', 'rightBtn', 'jumpBtn'].forEach(id => {
            const btn = document.getElementById(id);
            const key = id === 'leftBtn' ? 'ArrowLeft' : id === 'rightBtn' ? 'ArrowRight' : null;
            
            if (key) {
                btn.addEventListener('mousedown', () => { this.keys[key] = true; });
                btn.addEventListener('mouseup', () => { this.keys[key] = false; });
                btn.addEventListener('touchstart', (e) => { e.preventDefault(); this.keys[key] = true; });
                btn.addEventListener('touchend', (e) => { e.preventDefault(); this.keys[key] = false; });
            } else {
                btn.addEventListener('click', () => {
                    if (!this.player.isJumping && !this.isPaused && this.gameStarted) {
                        this.player.velocityY = -this.player.jumpPower;
                    }
                });
                btn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    if (!this.player.isJumping && !this.isPaused && this.gameStarted) {
                        this.player.velocityY = -this.player.jumpPower;
                    }
                });
            }
        });

        // Teclado
        document.addEventListener('keydown', (e) => {
            if (!this.gameStarted) return;
            this.keys[e.key] = true;
            if ((e.key === ' ' || e.key === 'ArrowUp') && !this.player.isJumping && !this.isPaused) {
                this.player.velocityY = -this.player.jumpPower;
                e.preventDefault();
            }
        });

        document.addEventListener('keyup', (e) => { this.keys[e.key] = false; });
    }

    initPWA() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('sw.js')
                    .then(reg => console.log('Service Worker registrado'))
                    .catch(err => console.log('Error al registrar SW:', err));
            });
        }

        let deferredPrompt;
        const installBtn = document.getElementById('installBtn');

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            installBtn.classList.add('show');
        });

        installBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`User response: ${outcome}`);
                deferredPrompt = null;
                installBtn.classList.remove('show');
            }
        });
    }

    checkStartButton() {
        console.log('checkStartButton:', this.selectedTable, this.selectedDifficulty);
        if (this.selectedTable && this.selectedDifficulty) {
            const startBtn = document.getElementById('startGameBtn');
            startBtn.disabled = false;
            const tableText = this.selectedTable === 'mixto' ? 'Mixto' : `Tabla del ${this.selectedTable}`;
            const diffText = this.selectedDifficulty === 'facil' ? 'Fácil' : this.selectedDifficulty === 'medio' ? 'Medio' : 'Difícil';
            this.tableMode = `${tableText}-${diffText}`;
            console.log('Modo seleccionado:', this.tableMode);
        }
    }

    startGame() {
        console.log('startGame llamado');
        if (!this.selectedTable || !this.selectedDifficulty) {
            console.log('Faltan selecciones');
            return;
        }
        
        document.getElementById('tableMenu').classList.add('hidden');
        document.getElementById('instructions').classList.add('hidden');
        document.getElementById('tableMode').textContent = `📚 ${this.tableMode}`;
        this.gameStarted = true;
        this.gameRunning = true;
        this.usedMultipliers.clear();
        this.updateShopButton();
        this.updatePowerUpButtons();
        this.spawnLevel();
        console.log('Juego iniciado');
    }

    restartGame() {
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.gameRunning = true;
        this.gameStarted = false;
        this.invincible = false;
        this.invincibleTimer = 0;
        this.selectedTable = null;
        this.selectedDifficulty = null;
        this.usedMultipliers.clear();
        this.powerUpInventory = { helmet: 0, umbrella: 0, whistle: 0 };
        this.activePowerUps = { helmetHits: 0, umbrellaTime: 0 };
        
        this.updateActivePowerUps();
        this.updatePowerUpButtons();
        
        document.getElementById('score').textContent = '👑 Coronas: 0';
        document.getElementById('lives').textContent = '❤️ Vidas: 3';
        document.getElementById('level').textContent = '📊 Nivel: 1';
        document.getElementById('tableMode').textContent = '📚 Modo: -';
        document.getElementById('gameOver').classList.remove('show');
        document.getElementById('tableMenu').classList.remove('hidden');
        document.getElementById('instructions').classList.remove('hidden');
        document.getElementById('startGameBtn').disabled = true;
        
        document.querySelectorAll('.table-btn, .difficulty-btn').forEach(b => b.classList.remove('selected'));
        
        this.player.x = 50;
        this.player.y = this.canvas.height - 100;
        this.player.velocityY = 0;
        this.player.velocityX = 0;
        
        this.updateShopButton();
    }

    // ==================== AUDIO ====================
    
    playSound(freq, duration = 0.3) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + duration);
    }

    playSuccessSound() {
        this.playSound(523.25);
        setTimeout(() => this.playSound(659.25), 100);
    }

    playLevelCompleteSound() {
        [523.25, 587.33, 659.25, 783.99].forEach((f, i) => {
            setTimeout(() => this.playSound(f), i * 150);
        });
    }

    playErrorSound() {
        this.playSound(200, 0.5);
    }

    playPowerUpSound() {
        [440, 554.37, 659.25].forEach((f, i) => {
            setTimeout(() => this.playSound(f, 0.2), i * 100);
        });
    }

    playWitchSound() {
        [800, 600, 500, 400, 350].forEach((f, i) => {
            setTimeout(() => this.playSound(f, 0.3), i * 100);
        });
    }

    // ==================== NIVELES Y GENERACIÓN ====================

    spawnLevel() {
        this.createLevelLayout();
        this.spawnCrowns();
        this.spawnPencils();
        this.monsters = [];
        this.monsterSpawnTimer = 0;
        this.witch = null;
        this.witchSpawned = false;
    }

    createLevelLayout() {
        this.platforms = [{ x: 0, y: this.canvas.height - 50, width: this.canvas.width, height: 50 }];
        
        const layouts = [
            [
                { x: this.canvas.width * 0.2, y: this.canvas.height - 150, width: 120, height: 20 }, 
                { x: this.canvas.width * 0.45, y: this.canvas.height - 220, width: 120, height: 20 }, 
                { x: this.canvas.width * 0.7, y: this.canvas.height - 150, width: 120, height: 20 }
            ],
            [
                { x: this.canvas.width * 0.1, y: this.canvas.height - 120, width: 100, height: 20 }, 
                { x: this.canvas.width * 0.25, y: this.canvas.height - 180, width: 100, height: 20 }, 
                { x: this.canvas.width * 0.4, y: this.canvas.height - 240, width: 100, height: 20 }, 
                { x: this.canvas.width * 0.55, y: this.canvas.height - 300, width: 100, height: 20 }, 
                { x: this.canvas.width * 0.7, y: this.canvas.height - 360, width: 100, height: 20 }
            ],
            [
                { x: this.canvas.width * 0.15, y: this.canvas.height - 200, width: 80, height: 20 }, 
                { x: this.canvas.width * 0.3, y: this.canvas.height - 280, width: 80, height: 20 }, 
                { x: this.canvas.width * 0.45, y: this.canvas.height - 200, width: 80, height: 20 }, 
                { x: this.canvas.width * 0.6, y: this.canvas.height - 280, width: 80, height: 20 }, 
                { x: this.canvas.width * 0.75, y: this.canvas.height - 200, width: 80, height: 20 }
            ]
        ];
        
        if (this.level <= 3) {
            this.platforms.push(...layouts[this.level - 1]);
        } else {
            const numPlatforms = 5 + Math.floor(Math.random() * 2);
            const groundY = this.canvas.height - 50;
            const maxJumpHeight = 200;
            const minPlatformGap = 80;
            
            let lastPlatform = {
                x: this.canvas.width * 0.15,
                y: groundY - 100,
                width: 100,
                height: 20
            };
            this.platforms.push(lastPlatform);
            
            for (let i = 1; i < numPlatforms; i++) {
                let attempts = 0;
                let newPlatform;
                
                do {
                    const xProgress = (i / numPlatforms) * this.canvas.width * 0.6;
                    const xRandom = Math.random() * 100;
                    const newX = Math.min(this.canvas.width * 0.15 + xProgress + xRandom, this.canvas.width - 120);
                    
                    const maxY = Math.min(lastPlatform.y + maxJumpHeight * 0.5, groundY - 80);
                    const minY = Math.max(lastPlatform.y - maxJumpHeight * 0.7, this.canvas.height * 0.2);
                    const newY = minY + Math.random() * (maxY - minY);
                    
                    newPlatform = {
                        x: newX,
                        y: newY,
                        width: 80 + Math.random() * 40,
                        height: 20
                    };
                    
                    attempts++;
                } while (attempts < 20 && Math.abs(newPlatform.x - lastPlatform.x) < minPlatformGap);
                
                this.platforms.push(newPlatform);
                lastPlatform = newPlatform;
            }
        }
    }

    spawnPencils() {
        this.pencils = [];
        const pencilColors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1'];
        
        for (let i = 0; i < 3; i++) {
            const x = 150 + i * 250;
            const height = 80 + Math.random() * 40;
            this.pencils.push({
                x: x,
                y: this.canvas.height - 50 - height,
                width: 40,
                height: height,
                color: pencilColors[i % pencilColors.length],
                type: 'vertical'
            });
        }
    }

    spawnCrowns() {
        this.crowns = [];
        const crownCount = Math.min(3 + this.level, 8);
        const availablePlatforms = this.platforms.filter(p => p.y < this.canvas.height - 60);
        
        for (let i = 0; i < Math.min(crownCount, availablePlatforms.length); i++) {
            const platform = availablePlatforms[i % availablePlatforms.length];
            const offsetX = (i % 2) * (platform.width / 2) + platform.width / 4;
            
            const { num1, num2 } = this.generateMultiplication();
            this.crowns.push({
                x: platform.x + offsetX,
                y: platform.y - 40,
                width: 30,
                height: 30,
                num1, num2,
                collected: false,
                floatOffset: Math.random() * Math.PI * 2
            });
        }
    }

    generateMultiplication() {
        let num1, num2;
        
        if (this.selectedTable === 'mixto') {
            if (this.selectedDifficulty === 'facil') {
                const tables = [2, 3, 4, 5];
                num1 = tables[Math.floor(Math.random() * tables.length)];
                
                let attempts = 0;
                do {
                    num2 = Math.floor(Math.random() * 10) + 1;
                    attempts++;
                    if (attempts > 50) {
                        this.usedMultipliers.clear();
                        break;
                    }
                } while (this.usedMultipliers.has(num2));
                
                this.usedMultipliers.add(num2);
            } else if (this.selectedDifficulty === 'medio') {
                num1 = Math.floor(Math.random() * 9) + 2;
                num2 = Math.floor(Math.random() * 10) + 1;
            } else {
                num1 = Math.floor(Math.random() * 11) + 2;
                num2 = Math.floor(Math.random() * 12) + 1;
            }
        } else {
            num1 = parseInt(this.selectedTable);
            
            if (this.selectedDifficulty === 'facil') {
                let attempts = 0;
                do {
                    num2 = Math.floor(Math.random() * 10) + 1;
                    attempts++;
                    if (attempts > 50) {
                        this.usedMultipliers.clear();
                        break;
                    }
                } while (this.usedMultipliers.has(num2));
                
                this.usedMultipliers.add(num2);
            } else if (this.selectedDifficulty === 'medio') {
                num2 = Math.floor(Math.random() * 10) + 1;
            } else {
                num2 = Math.floor(Math.random() * 12) + 1;
            }
        }
        
        return { num1, num2 };
    }

    // ==================== ACTUALIZACIÓN DE ENTIDADES ====================

    updatePlayer() {
        if (this.isPaused) return;
        if (this.invincible) {
            this.invincibleTimer--;
            if (this.invincibleTimer <= 0) this.invincible = false;
        }

        if (this.keys['ArrowLeft']) {
            this.player.velocityX = -this.player.speed;
            this.player.direction = -1;
        } else if (this.keys['ArrowRight']) {
            this.player.velocityX = this.player.speed;
            this.player.direction = 1;
        } else {
            this.player.velocityX *= 0.8;
        }

        this.player.x += this.player.velocityX;
        if (this.player.x < 0) { this.player.x = 0; this.player.velocityX = 0; }
        if (this.player.x + this.player.width > this.canvas.width) { 
            this.player.x = this.canvas.width - this.player.width; 
            this.player.velocityX = 0; 
        }

        this.player.velocityY += this.player.gravity;
        this.player.y += this.player.velocityY;

        this.player.isJumping = true;
        
        this.platforms.forEach(platform => {
            if (this.player.x + this.player.width > platform.x && 
                this.player.x < platform.x + platform.width &&
                this.player.y + this.player.height > platform.y && 
                this.player.y + this.player.height < platform.y + platform.height &&
                this.player.velocityY > 0) {
                this.player.y = platform.y - this.player.height;
                this.player.velocityY = 0;
                this.player.isJumping = false;
            }
        });

        this.pencils.forEach(pencil => {
            if (this.player.x + this.player.width > pencil.x && 
                this.player.x < pencil.x + pencil.width &&
                this.player.y + this.player.height > pencil.y && 
                this.player.y < pencil.y + pencil.height) {
                if (this.player.velocityX > 0 && this.player.x < pencil.x) {
                    this.player.x = pencil.x - this.player.width;
                    this.player.velocityX = 0;
                } else if (this.player.velocityX < 0 && this.player.x > pencil.x) {
                    this.player.x = pencil.x + pencil.width;
                    this.player.velocityX = 0;
                }
                if (this.player.velocityY > 0 && this.player.y < pencil.y) {
                    this.player.y = pencil.y - this.player.height;
                    this.player.velocityY = 0;
                    this.player.isJumping = false;
                }
            }
        });

        this.crowns.forEach(crown => {
            if (!crown.collected && 
                this.player.x + this.player.width > crown.x && 
                this.player.x < crown.x + crown.width &&
                this.player.y + this.player.height > crown.y && 
                this.player.y < crown.y + crown.height) {
                this.collectCrown(crown);
            }
        });

        if (!this.invincible) {
            this.monsters.forEach(monster => {
                if (this.player.x + this.player.width > monster.x && 
                    this.player.x < monster.x + monster.width &&
                    this.player.y + this.player.height > monster.y && 
                    this.player.y < monster.y + monster.height) {
                    this.hitByMonster();
                }
            });
        }
        
        this.spawnWitch();
        this.updateWitch();
    }

    updateMonsters() {
        if (this.isPaused) return;
        
        this.monsterSpawnTimer++;
        const spawnInterval = this.selectedDifficulty === 'facil' ? 240 : (Math.max(120 - this.level * 10, 60));
        
        if (this.monsterSpawnTimer >= spawnInterval) {
            this.spawnFallingMonster();
            this.monsterSpawnTimer = 0;
        }
        
        for (let i = this.monsters.length - 1; i >= 0; i--) {
            const monster = this.monsters[i];
            
            if (monster.falling) {
                monster.y += monster.speed;
                
                const groundY = this.canvas.height - 50 - monster.height;
                if (monster.y >= groundY) {
                    this.monsters.splice(i, 1);
                    continue;
                }
            }
            
            if (monster.y > this.canvas.height + 50) {
                this.monsters.splice(i, 1);
            }
        }
        
        if (this.activePowerUps.umbrellaTime > 0) {
            this.activePowerUps.umbrellaTime--;
            this.updateActivePowerUps();
        }
    }

    spawnFallingMonster() {
        if (this.isPaused || !this.gameRunning) return;
        
        const maxMonsters = this.selectedDifficulty === 'facil' ? 2 : this.selectedDifficulty === 'medio' ? 3 : 4;
        if (this.monsters.length >= maxMonsters) return;
        
        let monsterType = 'normal';
        let speed = 1.5 + this.level * 0.2;
        let color = '#8B008B';
        
        if (this.level >= 4 && Math.random() < 0.3) {
            monsterType = 'fast';
            speed *= 1.5;
            color = '#FF4500';
        }
        
        const monsterX = Math.random() * (this.canvas.width - 100) + 50;
        
        let tooClose = false;
        for (const crown of this.crowns) {
            if (!crown.collected) {
                const dist = Math.abs(monsterX - crown.x);
                if (dist < 80) {
                    tooClose = true;
                    break;
                }
            }
        }
        
        if (!tooClose) {
            this.monsters.push({
                x: monsterX,
                y: -35,
                width: 35,
                height: 35,
                speed: speed,
                type: monsterType,
                color: color,
                falling: true
            });
        }
    }

    updateWitch() {
        if (!this.witch || !this.witch.active) return;
        
        this.witch.x -= this.witch.speed;
        
        if (this.witch.x < -100) {
            this.witch = null;
            return;
        }
        
        if (!this.invincible && 
            this.player.x + this.player.width > this.witch.x && 
            this.player.x < this.witch.x + this.witch.width &&
            this.player.y + this.player.height > this.witch.y && 
            this.player.y < this.witch.y + this.witch.height) {
            this.hitByWitch();
        }
    }

    spawnWitch() {
        if (this.witchSpawned || this.witch) return;
        
        const collectedCount = this.crowns.filter(c => c.collected).length;
        const totalCrowns = this.crowns.length;
        
        if (collectedCount >= Math.ceil(totalCrowns / 2)) {
            this.witchSpawned = true;
            this.playWitchSound();
            
            const uncollectedCrowns = this.crowns.filter(c => !c.collected);
            let avgY = this.canvas.height * 0.5;
            
            if (uncollectedCrowns.length > 0) {
                avgY = uncollectedCrowns.reduce((sum, c) => sum + c.y, 0) / uncollectedCrowns.length;
            }
            
            this.witch = {
                x: this.canvas.width + 70,
                y: avgY - 35,
                width: 70,
                height: 70,
                speed: 1.8,
                active: true
            };
        }
    }

    // ==================== ACCIONES DEL JUGADOR ====================

    collectCrown(crown) {
        crown.collected = true;
        this.playSuccessSound();
        const answer = crown.num1 * crown.num2;
        this.currentQuestion = { num1: crown.num1, num2: crown.num2, answer };
        this.showQuestion();
    }

    hitByMonster() {
        if (this.activePowerUps.umbrellaTime > 0) {
            this.playSuccessSound();
            return;
        }
        
        if (this.activePowerUps.helmetHits > 0) {
            this.activePowerUps.helmetHits--;
            this.updateActivePowerUps();
            this.playSuccessSound();
            return;
        }
        
        this.lives--;
        this.playErrorSound();
        document.getElementById('lives').textContent = `❤️ Vidas: ${this.lives}`;
        this.invincible = true;
        this.invincibleTimer = 90;
        this.player.velocityY = -10;
        this.player.x -= this.player.direction * 30;
        if (this.lives <= 0) this.endGame();
    }

    hitByWitch() {
        if (this.activePowerUps.umbrellaTime > 0) {
            this.playSuccessSound();
            this.witch = null;
            return;
        }
        
        if (this.activePowerUps.helmetHits > 0) {
            this.activePowerUps.helmetHits--;
            this.updateActivePowerUps();
            this.playSuccessSound();
            this.witch = null;
            return;
        }
        
        const crownsLost = Math.min(this.score, 5);
        this.score -= crownsLost;
        document.getElementById('score').textContent = `👑 Coronas: ${this.score}`;
        this.updateShopButton();
        this.playErrorSound();
        this.witch = null;
        this.showNotification(`¡La bruja te quitó ${crownsLost} coronas!`);
    }

    // ==================== UI Y MENÚS ====================

    showQuestion() {
        this.isPaused = true;
        const questionBox = document.getElementById('questionBox');
        const questionText = document.getElementById('questionText');
        const answerInput = document.getElementById('answerInput');
        const feedback = document.getElementById('feedback');
        
        questionText.textContent = `${this.currentQuestion.num1} × ${this.currentQuestion.num2} = ?`;
        answerInput.value = '';
        feedback.textContent = '';
        questionBox.classList.add('show');
        answerInput.focus();
    }

    checkAnswer() {
        const answerInput = document.getElementById('answerInput');
        const feedback = document.getElementById('feedback');
        const userAnswer = parseInt(answerInput.value);
        
        if (userAnswer === this.currentQuestion.answer) {
            feedback.textContent = '¡Correcto! ✨';
            feedback.className = 'correct';
            this.score++;
            document.getElementById('score').textContent = `👑 Coronas: ${this.score}`;
            this.updateShopButton();
            
            setTimeout(() => {
                this.hideQuestion();
                if (this.crowns.every(c => c.collected)) this.nextLevel();
            }, 1000);
        } else {
            feedback.textContent = `¡Incorrecto! = ${this.currentQuestion.answer}`;
            feedback.className = 'incorrect';
            this.lives--;
            this.playErrorSound();
            document.getElementById('lives').textContent = `❤️ Vidas: ${this.lives}`;
            
            if (this.lives <= 0) {
                setTimeout(() => { this.hideQuestion(); this.endGame(); }, 1500);
            } else {
                setTimeout(() => this.hideQuestion(), 2000);
            }
        }
    }

    hideQuestion() {
        document.getElementById('questionBox').classList.remove('show');
        this.isPaused = false;
        this.currentQuestion = null;
    }

    nextLevel() {
        this.level++;
        document.getElementById('level').textContent = `📊 Nivel: ${this.level}`;
        this.isPaused = true;
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = 'bold 40px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('¡NIVEL COMPLETADO!', this.canvas.width/2, this.canvas.height/2);
        
        setTimeout(() => this.showJoke(), 1500);
    }

    showJoke() {
        const jokeBox = document.getElementById('jokeBox');
        const jokeText = document.getElementById('jokeText');
        jokeText.textContent = this.jokes[Math.floor(Math.random() * this.jokes.length)];
        jokeBox.classList.add('show');
        this.playLevelCompleteSound();
    }

    continueGame() {
        document.getElementById('jokeBox').classList.remove('show');
        this.isPaused = false;
        this.spawnLevel();
        this.player.x = 50;
        this.player.y = this.canvas.height - 100;
        this.player.velocityY = 0;
        this.player.velocityX = 0;
    }

    endGame() {
        this.gameRunning = false;
        const gameOver = document.getElementById('gameOver');
        document.getElementById('finalScore').textContent = `Coronas: ${this.score} | Nivel: ${this.level}`;
        
        const msg = this.level >= 5 ? '¡MAESTRO! 🌟👑' : 
                   this.score >= 15 ? '¡Excelente! 🎓' : 
                   this.score >= 10 ? '¡Muy bien! 📚' : '¡Buen intento! 💪';
        document.getElementById('finalMessage').textContent = msg;
        gameOver.classList.add('show');
    }

    // ==================== TIENDA Y POWER-UPS ====================

    openShop() {
        if (this.score < 10 || !this.gameStarted || this.isPaused) return;
        
        this.isPaused = true;
        const shopMenu = document.getElementById('shopMenu');
        document.getElementById('shopCoins').textContent = `Coronas disponibles: ${this.score} 👑`;
        
        document.querySelectorAll('.shop-item').forEach(item => {
            if (this.score >= 10) {
                item.classList.remove('disabled');
            } else {
                item.classList.add('disabled');
            }
        });
        
        shopMenu.classList.add('show');
    }

    closeShop() {
        document.getElementById('shopMenu').classList.remove('show');
        this.isPaused = false;
    }

    buyPowerUp(type) {
        if (this.score < 10) return;
        
        this.score -= 10;
        document.getElementById('score').textContent = `👑 Coronas: ${this.score}`;
        this.playPowerUpSound();
        
        switch(type) {
            case 'extralife':
                this.lives++;
                document.getElementById('lives').textContent = `❤️ Vidas: ${this.lives}`;
                this.showNotification('❤️ +1 Vida');
                break;
            case 'helmet':
                this.powerUpInventory.helmet++;
                this.showNotification('⛑️ Casco Comprado');
                break;
            case 'umbrella':
                this.powerUpInventory.umbrella++;
                this.showNotification('☂️ Paraguas Comprado');
                break;
            case 'whistle':
                this.powerUpInventory.whistle++;
                this.showNotification('📢 Silbato Comprado');
                break;
        }
        
        this.updatePowerUpButtons();
        this.updateActivePowerUps();
        this.closeShop();
        this.updateShopButton();
    }

    activateHelmet() {
        if (this.powerUpInventory.helmet > 0 && !this.isPaused) {
            this.powerUpInventory.helmet--;
            this.activePowerUps.helmetHits = 3;
            this.updatePowerUpButtons();
            this.updateActivePowerUps();
            this.playPowerUpSound();
            this.showNotification('⛑️ Casco Activado');
        }
    }

    activateUmbrella() {
        if (this.powerUpInventory.umbrella > 0 && !this.isPaused) {
            this.powerUpInventory.umbrella--;
            this.activePowerUps.umbrellaTime = 25 * 60;
            this.updatePowerUpButtons();
            this.updateActivePowerUps();
            this.playPowerUpSound();
            this.showNotification('☂️ Paraguas Activado');
        }
    }

    activateWhistle() {
        if (this.powerUpInventory.whistle > 0 && !this.isPaused) {
            this.powerUpInventory.whistle--;
            this.updatePowerUpButtons();
            this.playPowerUpSound();
            this.monsters = [];
            if (this.witch) this.witch = null;
            this.showNotification('📢 ¡Monstruos ahuyentados!');
        }
    }

    updateShopButton() {
        const shopBtn = document.getElementById('shopBtn');
        if (this.score >= 10 && this.gameStarted) {
            shopBtn.classList.remove('disabled');
        } else {
            shopBtn.classList.add('disabled');
        }
    }

    updatePowerUpButtons() {
        document.getElementById('helmetBtn').classList.toggle('show', this.powerUpInventory.helmet > 0 && this.gameStarted);
        document.getElementById('umbrellaBtn').classList.toggle('show', this.powerUpInventory.umbrella > 0 && this.gameStarted);
        document.getElementById('whistleBtn').classList.toggle('show', this.powerUpInventory.whistle > 0 && this.gameStarted);
    }

    updateActivePowerUps() {
        const container = document.getElementById('activePowerUps');
        container.innerHTML = '';
        
        if (this.activePowerUps.helmetHits > 0) {
            const div = document.createElement('div');
            div.className = 'powerup-indicator';
            div.innerHTML = `<span class="icon">⛑️</span> <span>x${this.activePowerUps.helmetHits}</span>`;
            container.appendChild(div);
        }
        
        if (this.activePowerUps.umbrellaTime > 0) {
            const div = document.createElement('div');
            div.className = 'powerup-indicator';
            const secs = Math.ceil(this.activePowerUps.umbrellaTime / 60);
            div.innerHTML = `<span class="icon">☂️</span> <span class="time">${secs}s</span>`;
            container.appendChild(div);
        }
    }

    showNotification(text) {
        let alpha = 1;
        const startTime = Date.now();
        const duration = 2000;
        
        const drawNotif = () => {
            const elapsed = Date.now() - startTime;
            if (elapsed >= duration) return;
            
            alpha = 1 - (elapsed / duration);
            const notifY = this.canvas.height / 2 - 100;
            
            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = '#FFD700';
            this.ctx.font = 'bold 30px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 3;
            this.ctx.strokeText(text, this.canvas.width/2, notifY);
            this.ctx.fillText(text, this.canvas.width/2, notifY);
            this.ctx.restore();
            
            requestAnimationFrame(drawNotif);
        };
        
        drawNotif();
    }

    // ==================== RENDERIZADO ====================

    currentTheme() {
        return THEMES[(this.level - 1) % THEMES.length];
    }

    // Pseudo-aleatorio determinista: el fondo no cambia durante el nivel
    seededRand(seed) {
        const x = Math.sin(seed * 127.1 + this.level * 311.7) * 43758.5453;
        return x - Math.floor(x);
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawBackground();
        this.drawClouds();
        this.drawPlatforms();
        this.drawPencils();
        this.drawCrowns();
        this.drawWitch();
        this.drawMonsters();
        this.drawPlayer();
    }

    drawBackground() {
        const ctx = this.ctx;
        const t = this.currentTheme();
        const W = this.canvas.width, H = this.canvas.height;

        // Cielo con degradado
        const sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, t.skyTop);
        sky.addColorStop(1, t.skyBot);
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, H);

        // Sol con halo
        const sx = W * 0.82, sy = H * 0.14;
        const halo = ctx.createRadialGradient(sx, sy, 10, sx, sy, 70);
        halo.addColorStop(0, t.sun);
        halo.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(sx, sy, 70, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = t.sun;
        ctx.beginPath(); ctx.arc(sx, sy, 26, 0, Math.PI * 2); ctx.fill();

        // Colinas lejanas
        ctx.fillStyle = t.hillFar;
        ctx.beginPath();
        ctx.moveTo(0, H);
        for (let x = 0; x <= W; x += 20) {
            const y = H * 0.72 - Math.sin(x * 0.006 + 2) * H * 0.07 - this.seededRand(Math.floor(x / 160)) * H * 0.04;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H); ctx.closePath(); ctx.fill();

        // Colinas cercanas
        ctx.fillStyle = t.hillNear;
        ctx.beginPath();
        ctx.moveTo(0, H);
        for (let x = 0; x <= W; x += 20) {
            const y = H * 0.85 - Math.sin(x * 0.008 + 9) * H * 0.06 - this.seededRand(Math.floor(x / 120) + 50) * H * 0.03;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H); ctx.closePath(); ctx.fill();

        this.drawDecor(t, W, H);
    }

    drawDecor(t, W, H) {
        const ctx = this.ctx;
        const n = 6;
        for (let i = 0; i < n; i++) {
            const x = (i + 0.5) * (W / n) + (this.seededRand(i + 7) - 0.5) * 60;
            const y = H * (0.82 + this.seededRand(i + 21) * 0.1);
            const s = 0.7 + this.seededRand(i + 33) * 0.6;
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(s, s);
            if (t.decor === 'flores') {
                ctx.strokeStyle = '#2E7D32'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -22); ctx.stroke();
                const cols = ['#FF6B9D', '#FFD93D', '#FF8A5C', '#B983FF'];
                ctx.fillStyle = cols[i % cols.length];
                for (let p = 0; p < 5; p++) {
                    const a = p * Math.PI * 2 / 5;
                    ctx.beginPath(); ctx.arc(Math.cos(a) * 7, -22 + Math.sin(a) * 7, 5, 0, Math.PI * 2); ctx.fill();
                }
                ctx.fillStyle = '#FFF176';
                ctx.beginPath(); ctx.arc(0, -22, 5, 0, Math.PI * 2); ctx.fill();
            } else if (t.decor === 'arboles') {
                ctx.fillStyle = '#6D4C2F';
                ctx.fillRect(-5, -30, 10, 32);
                ctx.fillStyle = '#2F7D4F';
                ctx.beginPath(); ctx.moveTo(0, -85); ctx.lineTo(-28, -28); ctx.lineTo(28, -28); ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#3E9B63';
                ctx.beginPath(); ctx.moveTo(0, -95); ctx.lineTo(-22, -50); ctx.lineTo(22, -50); ctx.closePath(); ctx.fill();
            } else if (t.decor === 'cactus') {
                ctx.fillStyle = '#4E9B4E';
                if (ctx.roundRect) {
                    ctx.beginPath();
                    ctx.roundRect(-8, -50, 16, 52, 8);
                    ctx.roundRect(-26, -38, 12, 20, 6);
                    ctx.roundRect(14, -32, 12, 18, 6);
                    ctx.fill();
                } else {
                    ctx.fillRect(-8, -50, 16, 52);
                    ctx.fillRect(-26, -38, 12, 20);
                    ctx.fillRect(14, -32, 12, 18);
                }
                ctx.fillRect(-26, -24, 12, 6); ctx.fillRect(14, -20, 12, 6);
                if (i % 2 === 0) {
                    ctx.fillStyle = '#FF6B9D';
                    ctx.beginPath(); ctx.arc(0, -52, 5, 0, Math.PI * 2); ctx.fill();
                }
            } else if (t.decor === 'nieve') {
                if (i % 2 === 0) {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.strokeStyle = '#C9DDEE'; ctx.lineWidth = 2;
                    ctx.beginPath(); ctx.arc(0, -12, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                    ctx.beginPath(); ctx.arc(0, -34, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                    ctx.fillStyle = '#333';
                    ctx.beginPath(); ctx.arc(-3, -36, 1.5, 0, Math.PI * 2); ctx.arc(3, -36, 1.5, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#FF7B39';
                    ctx.beginPath(); ctx.moveTo(0, -33); ctx.lineTo(9, -31); ctx.lineTo(0, -29); ctx.closePath(); ctx.fill();
                } else {
                    ctx.fillStyle = '#3E7D5F';
                    ctx.beginPath(); ctx.moveTo(0, -70); ctx.lineTo(-24, -18); ctx.lineTo(24, -18); ctx.closePath(); ctx.fill();
                    ctx.fillStyle = '#FFFFFF';
                    ctx.beginPath(); ctx.moveTo(0, -70); ctx.lineTo(-12, -44); ctx.lineTo(12, -44); ctx.closePath(); ctx.fill();
                }
            } else if (t.decor === 'castillo') {
                ctx.fillStyle = '#B9AFD4';
                ctx.fillRect(-16, -55, 32, 57);
                ctx.fillStyle = '#9E92C4';
                for (let m = -16; m < 16; m += 10) ctx.fillRect(m, -62, 6, 8);
                ctx.fillStyle = '#7E6BB0';
                ctx.beginPath(); ctx.moveTo(0, -88); ctx.lineTo(-14, -60); ctx.lineTo(14, -60); ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#FFE28A';
                ctx.fillRect(-5, -28, 10, 14);
                ctx.beginPath(); ctx.arc(0, -28, 5, Math.PI, 0); ctx.fill();
                ctx.fillStyle = '#E63946';
                ctx.beginPath(); ctx.moveTo(0, -88); ctx.lineTo(13, -83); ctx.lineTo(0, -78); ctx.closePath(); ctx.fill();
            }
            ctx.restore();
        }

        // Copos de nieve animados en el tema de nieve
        if (t.decor === 'nieve') {
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            const now = Date.now() / 1000;
            for (let f = 0; f < 25; f++) {
                const fx = (this.seededRand(f + 100) * W + now * (15 + this.seededRand(f) * 20)) % W;
                const fy = (this.seededRand(f + 200) * H + now * (30 + this.seededRand(f + 5) * 30)) % H;
                ctx.beginPath(); ctx.arc(fx, fy, 2 + this.seededRand(f) * 2, 0, Math.PI * 2); ctx.fill();
            }
        }
    }

    drawClouds() {
        const ctx = this.ctx;
        this.clouds.forEach(cloud => {
            const cx = cloud.x, cy = cloud.y, s = cloud.size;
            // Nube con volumen: sombra inferior suave + cuerpo blanco
            ctx.fillStyle = 'rgba(180,205,225,0.5)';
            ctx.beginPath();
            ctx.arc(cx, cy + 4, s * 0.5, 0, Math.PI * 2);
            ctx.arc(cx + s * 0.4, cy + 4, s * 0.6, 0, Math.PI * 2);
            ctx.arc(cx + s * 0.8, cy + 4, s * 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.beginPath();
            ctx.arc(cx, cy, s * 0.5, 0, Math.PI * 2);
            ctx.arc(cx + s * 0.35, cy - s * 0.22, s * 0.45, 0, Math.PI * 2);
            ctx.arc(cx + s * 0.4, cy, s * 0.6, 0, Math.PI * 2);
            ctx.arc(cx + s * 0.8, cy, s * 0.5, 0, Math.PI * 2);
            ctx.fill();

            cloud.x -= cloud.speed || 0.2;
            if (cloud.x < -s * 2) cloud.x = this.canvas.width + s;
        });
    }

    drawPlatforms() {
        const ctx = this.ctx;
        const t = this.currentTheme();
        this.platforms.forEach(platform => {
            const { x, y, width, height } = platform;

            // Base con degradado
            const base = ctx.createLinearGradient(0, y, 0, y + height);
            base.addColorStop(0, t.platBase);
            base.addColorStop(1, t.platEdge);
            ctx.fillStyle = base;
            ctx.beginPath();
            if (ctx.roundRect) { ctx.roundRect(x, y + 4, width, height - 4, 4); } else { ctx.rect(x, y + 4, width, height - 4); }
            ctx.fill();

            // Textura de la base según tema
            ctx.fillStyle = 'rgba(0,0,0,0.12)';
            if (t.decor === 'castillo') {
                for (let bx = x + 6; bx < x + width - 4; bx += 18) {
                    ctx.fillRect(bx, y + 8, 12, 3);
                }
            } else {
                for (let d = 0; d < Math.floor(width / 22); d++) {
                    const dx = x + 8 + ((d * 37) % Math.max(1, width - 16));
                    const dy = y + 8 + ((d * 23) % Math.max(1, height - 12));
                    ctx.beginPath(); ctx.arc(dx, dy, 1.8, 0, Math.PI * 2); ctx.fill();
                }
            }

            // Capa superior redondeada
            ctx.fillStyle = t.platTop;
            ctx.beginPath();
            if (ctx.roundRect) { ctx.roundRect(x - 2, y - 1, width + 4, 8, 4); } else { ctx.rect(x - 2, y - 1, width + 4, 8); }
            ctx.fill();

            // Detalle superior según tema
            if (t.decor === 'flores' || t.decor === 'arboles') {
                ctx.strokeStyle = t.decor === 'flores' ? '#2E7D32' : '#1F5C33';
                ctx.lineWidth = 2;
                for (let gx = x + 6; gx < x + width - 4; gx += 14) {
                    ctx.beginPath();
                    ctx.moveTo(gx, y - 1);
                    ctx.lineTo(gx - 2, y - 6);
                    ctx.moveTo(gx + 4, y - 1);
                    ctx.lineTo(gx + 5, y - 5);
                    ctx.stroke();
                }
            } else if (t.decor === 'nieve') {
                ctx.fillStyle = '#FFFFFF';
                for (let sx2 = x + 10; sx2 < x + width - 8; sx2 += 26) {
                    ctx.beginPath();
                    ctx.arc(sx2, y - 1, 5, Math.PI, 0);
                    ctx.fill();
                }
            } else if (t.decor === 'cactus') {
                ctx.strokeStyle = 'rgba(143,90,32,0.5)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                for (let wx = x + 4; wx < x + width - 6; wx += 16) {
                    ctx.moveTo(wx, y + 3);
                    ctx.quadraticCurveTo(wx + 4, y + 1, wx + 8, y + 3);
                }
                ctx.stroke();
            }
        });
    }

    drawPencils() {
        const ctx = this.ctx;
        this.pencils.forEach(pencil => {
            const { x, y, width, height, color } = pencil;

            // Sombra en el suelo
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.beginPath();
            ctx.ellipse(x + width / 2, y + height + height * 0.18, width * 0.55, 4, 0, 0, Math.PI * 2);
            ctx.fill();

            // Cuerpo del lápiz con degradado
            const body = ctx.createLinearGradient(x, 0, x + width, 0);
            body.addColorStop(0, 'rgba(0,0,0,0.25)');
            body.addColorStop(0.35, color);
            body.addColorStop(0.6, '#FFFFFF');
            body.addColorStop(0.62, color);
            body.addColorStop(1, 'rgba(0,0,0,0.25)');
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(x + width * 0.2, y);
            ctx.lineTo(x + width * 0.8, y);
            ctx.lineTo(x + width, y + height * 0.1);
            ctx.lineTo(x + width, y + height * 0.9);
            ctx.lineTo(x + width * 0.8, y + height);
            ctx.lineTo(x + width * 0.2, y + height);
            ctx.lineTo(x, y + height * 0.9);
            ctx.lineTo(x, y + height * 0.1);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 0.45;
            ctx.fillStyle = body;
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.strokeStyle = 'rgba(120,80,20,0.7)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Punta de madera
            const tipHeight = height * 0.15;
            const wood = ctx.createLinearGradient(x, 0, x + width, 0);
            wood.addColorStop(0, '#C79A62');
            wood.addColorStop(0.5, '#F0D2A8');
            wood.addColorStop(1, '#C79A62');
            ctx.fillStyle = wood;
            ctx.beginPath();
            ctx.moveTo(x + width * 0.2, y + height);
            ctx.lineTo(x + width * 0.5, y + height + tipHeight);
            ctx.lineTo(x + width * 0.8, y + height);
            ctx.closePath();
            ctx.fill();

            // Mina
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.moveTo(x + width * 0.35, y + height + tipHeight * 0.3);
            ctx.lineTo(x + width * 0.5, y + height + tipHeight);
            ctx.lineTo(x + width * 0.65, y + height + tipHeight * 0.3);
            ctx.closePath();
            ctx.fill();

            // Goma y virola
            const eraserHeight = height * 0.1;
            ctx.fillStyle = '#FF9FB0';
            ctx.beginPath();
            if (ctx.roundRect) { ctx.roundRect(x + width * 0.1, y - eraserHeight, width * 0.8, eraserHeight, 3); }
            else { ctx.rect(x + width * 0.1, y - eraserHeight, width * 0.8, eraserHeight); }
            ctx.fill();

            const ferrule = ctx.createLinearGradient(x, 0, x + width, 0);
            ferrule.addColorStop(0, '#9E9E9E');
            ferrule.addColorStop(0.5, '#EDEDED');
            ferrule.addColorStop(1, '#9E9E9E');
            ctx.fillStyle = ferrule;
            ctx.fillRect(x + width * 0.12, y, width * 0.76, height * 0.09);

            // Brillo lateral
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.fillRect(x + width * 0.28, y + height * 0.15, width * 0.12, height * 0.7);
        });
    }

    drawGoldCrown(cx, cy, w, sparkle) {
        const ctx = this.ctx;
        const h = w * 0.7;
        ctx.save();
        ctx.translate(cx, cy);
        const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
        g.addColorStop(0, '#FFE566');
        g.addColorStop(0.5, '#FFD700');
        g.addColorStop(1, '#E0A800');
        ctx.fillStyle = g;
        ctx.strokeStyle = '#B8860B';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-w / 2, h / 2);
        ctx.lineTo(-w / 2, -h * 0.1);
        ctx.lineTo(-w / 4, h * 0.15);
        ctx.lineTo(0, -h / 2);
        ctx.lineTo(w / 4, h * 0.15);
        ctx.lineTo(w / 2, -h * 0.1);
        ctx.lineTo(w / 2, h / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Joyas
        ctx.fillStyle = '#E63946';
        ctx.beginPath(); ctx.arc(0, h * 0.2, w * 0.09, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2A9D8F';
        ctx.beginPath(); ctx.arc(-w * 0.28, h * 0.25, w * 0.06, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4361EE';
        ctx.beginPath(); ctx.arc(w * 0.28, h * 0.25, w * 0.06, 0, Math.PI * 2); ctx.fill();
        // Brillo
        if (sparkle) {
            const tw = (Math.sin(Date.now() / 250 + cx) + 1) / 2;
            ctx.fillStyle = `rgba(255,255,255,${0.4 + tw * 0.6})`;
            ctx.beginPath();
            ctx.arc(-w * 0.3, -h * 0.15, 2 + tw * 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    drawCrowns() {
        const ctx = this.ctx;
        this.crowns.forEach(crown => {
            if (crown.collected) return;
            ctx.save();
            ctx.translate(crown.x, crown.y + Math.sin(Date.now() / 300 + crown.x) * 3);
            ctx.rotate(Math.sin(Date.now() / 250 + crown.x) * 0.15);
            // Halo dorado
            const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 22);
            glow.addColorStop(0, 'rgba(255,215,0,0.45)');
            glow.addColorStop(1, 'rgba(255,215,0,0)');
            ctx.fillStyle = glow;
            ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
            this.drawGoldCrown(0, 0, 26, true);
            ctx.restore();
        });
    }

    drawPlayer() {
        const ctx = this.ctx;
        if (this.invincible && Math.floor(Date.now() / 100) % 2 === 0) ctx.globalAlpha = 0.5;

        const player = this.player;
        const px = player.x, py = player.y;
        const cx = px + player.width / 2;
        const moving = Math.abs(player.velocityX) > 0.5;
        const walk = moving && !player.isJumping ? Math.sin(Date.now() / 70) : 0;
        const bob = moving && !player.isJumping ? Math.abs(Math.sin(Date.now() / 140)) * 2 : 0;

        // Sombra en el suelo
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.beginPath();
        ctx.ellipse(cx, py + player.height + 2, player.isJumping ? 12 : 16, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(cx, py + player.height / 2 - bob);
        if (player.direction === -1) ctx.scale(-1, 1);
        // Estiramiento leve al saltar
        if (player.isJumping) ctx.scale(0.95, 1.06);
        ctx.translate(-20, -25); // sistema local 40x50

        // Piernas animadas
        ctx.fillStyle = '#0059B3';
        ctx.save();
        ctx.translate(13, 35); ctx.rotate(walk * 0.35);
        ctx.fillRect(-5, 0, 10, 14);
        ctx.fillStyle = '#333';
        ctx.fillRect(-6, 12, 13, 4); // zapato
        ctx.restore();
        ctx.fillStyle = '#0066CC';
        ctx.save();
        ctx.translate(27, 35); ctx.rotate(-walk * 0.35);
        ctx.fillRect(-5, 0, 10, 14);
        ctx.fillStyle = '#333';
        ctx.fillRect(-6, 12, 13, 4);
        ctx.restore();

        // Camiseta con degradado y borde
        const shirt = ctx.createLinearGradient(0, 20, 0, 38);
        shirt.addColorStop(0, '#FF7B5C');
        shirt.addColorStop(1, '#E84A2E');
        ctx.fillStyle = shirt;
        ctx.beginPath();
        if (ctx.roundRect) { ctx.roundRect(5, 20, 30, 18, 5); } else { ctx.rect(5, 20, 30, 18); }
        ctx.fill();
        ctx.strokeStyle = '#C43A21';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Brazos (balanceo al andar)
        ctx.fillStyle = '#FFD700';
        ctx.save();
        ctx.translate(4, 23); ctx.rotate(-walk * 0.4);
        ctx.fillRect(-4, 0, 6, 13);
        ctx.fillStyle = '#FFD4A3';
        ctx.beginPath(); ctx.arc(-1, 14, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#FFD700';
        ctx.save();
        ctx.translate(36, 23); ctx.rotate(walk * 0.4);
        ctx.fillRect(-2, 0, 6, 13);
        ctx.fillStyle = '#FFD4A3';
        ctx.beginPath(); ctx.arc(1, 14, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        // Cabeza con sombreado
        const face = ctx.createRadialGradient(17, 9, 3, 20, 12, 13);
        face.addColorStop(0, '#FFE3C0');
        face.addColorStop(1, '#F5C089');
        ctx.fillStyle = face;
        ctx.beginPath();
        ctx.arc(20, 12, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(180,120,60,0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Pelo rizado
        ctx.fillStyle = '#4B2E1F';
        ctx.beginPath();
        ctx.arc(12, 4, 7, 0, Math.PI * 2);
        ctx.arc(20, 2, 7, 0, Math.PI * 2);
        ctx.arc(28, 4, 7, 0, Math.PI * 2);
        ctx.arc(9, 9, 5, 0, Math.PI * 2);
        ctx.arc(31, 9, 5, 0, Math.PI * 2);
        ctx.fill();

        // Ojos con blanco y pupila
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.ellipse(16, 10, 3.4, 4, 0, 0, Math.PI * 2);
        ctx.ellipse(25, 10, 3.4, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        const blink = Math.sin(Date.now() / 900) > 0.97;
        if (blink) {
            ctx.strokeStyle = '#4B2E1F'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(13, 10); ctx.lineTo(19, 10);
            ctx.moveTo(22, 10); ctx.lineTo(28, 10); ctx.stroke();
        } else {
            ctx.fillStyle = '#3B2410';
            ctx.beginPath();
            ctx.arc(17, 10.5, 1.9, 0, Math.PI * 2);
            ctx.arc(26, 10.5, 1.9, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FFF';
            ctx.beginPath();
            ctx.arc(17.7, 9.8, 0.7, 0, Math.PI * 2);
            ctx.arc(26.7, 9.8, 0.7, 0, Math.PI * 2);
            ctx.fill();
        }

        // Mejillas
        ctx.fillStyle = 'rgba(255,120,120,0.35)';
        ctx.beginPath();
        ctx.arc(13, 15, 2.5, 0, Math.PI * 2);
        ctx.arc(28, 15, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Sonrisa
        ctx.strokeStyle = '#7A3B10';
        ctx.lineWidth = 1.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(20.5, 13, 5, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
        ctx.lineCap = 'butt';

        // Corona vectorial (¡es Capitulín!)
        this.drawGoldCrown(20, -4, 18, true);

        ctx.restore();

        if (this.activePowerUps.helmetHits > 0) {
            ctx.font = '20px Arial';
            ctx.fillText('⛑️', px + 10, py - 14);
        }

        if (this.activePowerUps.umbrellaTime > 0) {
            ctx.font = '24px Arial';
            ctx.fillText('☂️', px + 25, py - 10);
        }

        ctx.globalAlpha = 1;
    }

    drawMonsters() {
        const ctx = this.ctx;
        this.monsters.forEach(monster => {
            const mx = monster.x, my = monster.y;
            const w = monster.width, h = monster.height;
            const wob = Math.sin(Date.now() / 130 + mx) * 1.5;

            ctx.save();
            ctx.translate(0, wob);

            // Sombra
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.beginPath();
            ctx.ellipse(mx + w / 2, my + h + 3 - wob, w * 0.45, 4, 0, 0, Math.PI * 2);
            ctx.fill();

            // Cuerpo redondeado con degradado
            const body = ctx.createLinearGradient(mx, my, mx, my + h);
            body.addColorStop(0, monster.color);
            body.addColorStop(1, 'rgba(0,0,0,0.25)');
            ctx.fillStyle = monster.color;
            ctx.beginPath();
            if (ctx.roundRect) { ctx.roundRect(mx, my, w, h, 10); } else { ctx.rect(mx, my, w, h); }
            ctx.fill();
            ctx.fillStyle = body;
            ctx.beginPath();
            if (ctx.roundRect) { ctx.roundRect(mx, my, w, h, 10); } else { ctx.rect(mx, my, w, h); }
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Pinchos superiores
            ctx.fillStyle = '#4B0082';
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(mx + 3 + i * (w - 6) / 3, my + 2);
                ctx.lineTo(mx + 3 + i * (w - 6) / 3 + (w - 6) / 6, my - 9 - Math.sin(Date.now() / 200 + i) * 1.5);
                ctx.lineTo(mx + 3 + (i + 1) * (w - 6) / 3, my + 2);
                ctx.closePath();
                ctx.fill();
            }

            // Ojos que siguen al jugador
            const lookX = Math.max(-2, Math.min(2, (this.player.x - mx) / 60));
            ctx.fillStyle = '#FFF';
            ctx.beginPath();
            ctx.arc(mx + w * 0.3, my + 12, 5.5, 0, Math.PI * 2);
            ctx.arc(mx + w * 0.7, my + 12, 5.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#D62828';
            ctx.beginPath();
            ctx.arc(mx + w * 0.3 + lookX, my + 12, 3, 0, Math.PI * 2);
            ctx.arc(mx + w * 0.7 + lookX, my + 12, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(mx + w * 0.3 + lookX, my + 12, 1.4, 0, Math.PI * 2);
            ctx.arc(mx + w * 0.7 + lookX, my + 12, 1.4, 0, Math.PI * 2);
            ctx.fill();

            // Cejas enfadadas
            ctx.strokeStyle = '#2A004F';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(mx + w * 0.18, my + 4); ctx.lineTo(mx + w * 0.4, my + 8);
            ctx.moveTo(mx + w * 0.82, my + 4); ctx.lineTo(mx + w * 0.6, my + 8);
            ctx.stroke();

            // Boca con dientes
            ctx.fillStyle = '#5A0E0E';
            ctx.beginPath();
            if (ctx.roundRect) { ctx.roundRect(mx + w * 0.15, my + h * 0.55, w * 0.7, h * 0.28, 4); } else { ctx.rect(mx + w * 0.15, my + h * 0.55, w * 0.7, h * 0.28); }
            ctx.fill();
            ctx.fillStyle = '#FFF';
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.moveTo(mx + w * 0.17 + i * w * 0.17, my + h * 0.55);
                ctx.lineTo(mx + w * 0.17 + i * w * 0.17 + w * 0.08, my + h * 0.72);
                ctx.lineTo(mx + w * 0.17 + (i + 1) * w * 0.17, my + h * 0.55);
                ctx.closePath();
                ctx.fill();
            }

            // Patitas
            ctx.fillStyle = '#4B0082';
            const step = Math.sin(Date.now() / 100 + mx) * 2;
            ctx.beginPath();
            ctx.ellipse(mx + w * 0.25, my + h + 1 + step * 0.5, 5, 3, 0, 0, Math.PI * 2);
            ctx.ellipse(mx + w * 0.75, my + h + 1 - step * 0.5, 5, 3, 0, 0, Math.PI * 2);
            ctx.fill();

            if (monster.falling) {
                ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
                ctx.beginPath();
                ctx.moveTo(mx + w / 2 - 5, my + h);
                ctx.lineTo(mx + w / 2, my + h + 8);
                ctx.lineTo(mx + w / 2 + 5, my + h);
                ctx.fill();
            }

            ctx.restore();
        });
    }

    drawWitch() {
        if (!this.witch || !this.witch.active) return;

        const ctx = this.ctx;
        const witch = this.witch;
        ctx.save();

        const scale = witch.width / 50;
        const float = Math.sin(Date.now() / 220) * 3;
        ctx.translate(0, float);

        // Estela mágica
        ctx.fillStyle = 'rgba(180,120,255,0.25)';
        for (let s = 1; s <= 4; s++) {
            ctx.beginPath();
            ctx.arc(witch.x + (70 + s * 14) * scale, witch.y + (50 + Math.sin(Date.now() / 150 + s) * 4) * scale, (6 - s) * scale, 0, Math.PI * 2);
            ctx.fill();
        }

        // Palo de la escoba
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(witch.x + 12 * scale, witch.y + 50 * scale, 40 * scale, 4 * scale);

        // Paja de la escoba
        ctx.fillStyle = '#DAA520';
        for (let i = 0; i < 7; i++) {
            const offset = (i % 2) * 2;
            ctx.fillRect(witch.x + (50 + i * 4) * scale, witch.y + (47 - offset) * scale, 2 * scale, (10 + offset) * scale);
        }

        // Cuerpo con vestido negro
        ctx.fillStyle = '#1A1A1A';
        ctx.beginPath();
        ctx.moveTo(witch.x + 25 * scale, witch.y + 30 * scale);
        ctx.lineTo(witch.x + 18 * scale, witch.y + 50 * scale);
        ctx.lineTo(witch.x + 32 * scale, witch.y + 50 * scale);
        ctx.closePath();
        ctx.fill();

        // Brazos
        ctx.fillRect(witch.x + 15 * scale, witch.y + 32 * scale, 8 * scale, 3 * scale);
        ctx.fillRect(witch.x + 27 * scale, witch.y + 32 * scale, 8 * scale, 3 * scale);

        // Manos verdes
        ctx.fillStyle = '#90EE90';
        ctx.beginPath();
        ctx.arc(witch.x + 12 * scale, witch.y + 33 * scale, 3 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Cabeza verde con volumen
        const skin = ctx.createRadialGradient(
            witch.x + 21 * scale, witch.y + 16 * scale, 2 * scale,
            witch.x + 25 * scale, witch.y + 20 * scale, 13 * scale
        );
        skin.addColorStop(0, '#B8F5B8');
        skin.addColorStop(1, '#6FBF6F');
        ctx.fillStyle = skin;
        ctx.beginPath();
        ctx.arc(witch.x + 25 * scale, witch.y + 20 * scale, 12 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Verruga
        ctx.fillStyle = '#7A8B7A';
        ctx.beginPath();
        ctx.arc(witch.x + 18 * scale, witch.y + 23 * scale, 2 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Pelo salvaje
        ctx.fillStyle = '#4B4B4B';
        ctx.beginPath();
        ctx.arc(witch.x + 14 * scale, witch.y + 16 * scale, 4 * scale, 0, Math.PI * 2);
        ctx.arc(witch.x + 36 * scale, witch.y + 16 * scale, 4 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Sombrero puntiagudo
        ctx.fillStyle = '#1A1A1A';
        ctx.beginPath();
        ctx.moveTo(witch.x + 25 * scale, witch.y + 2 * scale);
        ctx.lineTo(witch.x + 15 * scale, witch.y + 13 * scale);
        ctx.lineTo(witch.x + 35 * scale, witch.y + 13 * scale);
        ctx.closePath();
        ctx.fill();

        // Banda dorada
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(witch.x + 15 * scale, witch.y + 13 * scale, 20 * scale, 2 * scale);

        // Ala del sombrero
        ctx.fillStyle = '#1A1A1A';
        ctx.beginPath();
        if (ctx.roundRect) { ctx.roundRect(witch.x + 12 * scale, witch.y + 13 * scale, 26 * scale, 3 * scale, 2 * scale); }
        else { ctx.rect(witch.x + 12 * scale, witch.y + 13 * scale, 26 * scale, 3 * scale); }
        ctx.fill();

        // Ojos malvados
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.arc(witch.x + 20 * scale, witch.y + 19 * scale, 3 * scale, 0, Math.PI * 2);
        ctx.arc(witch.x + 30 * scale, witch.y + 19 * scale, 3 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(witch.x + 20 * scale, witch.y + 19 * scale, 1.5 * scale, 0, Math.PI * 2);
        ctx.arc(witch.x + 30 * scale, witch.y + 19 * scale, 1.5 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Nariz larga curva
        ctx.fillStyle = '#7FD67F';
        ctx.beginPath();
        ctx.moveTo(witch.x + 22 * scale, witch.y + 22 * scale);
        ctx.quadraticCurveTo(witch.x + 16 * scale, witch.y + 25 * scale, witch.x + 18 * scale, witch.y + 28 * scale);
        ctx.lineTo(witch.x + 24 * scale, witch.y + 24 * scale);
        ctx.closePath();
        ctx.fill();

        // Sonrisa malvada
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        ctx.arc(witch.x + 25 * scale, witch.y + 26 * scale, 6 * scale, 0, Math.PI);
        ctx.stroke();

        // Dientes puntiagudos
        ctx.fillStyle = '#FFF';
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(witch.x + (20 + i * 5) * scale, witch.y + 26 * scale);
            ctx.lineTo(witch.x + (21.5 + i * 5) * scale, witch.y + 29 * scale);
            ctx.lineTo(witch.x + (23 + i * 5) * scale, witch.y + 26 * scale);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    }
}

// ===== TEMAS VISUALES POR NIVEL =====
const THEMES = [
    { name: 'Pradera',  skyTop: '#7EC8F0', skyBot: '#EAF8FF', hillFar: '#A8DBA8', hillNear: '#7CC47C',
      platTop: '#3FA34D', platBase: '#8B5A2B', platEdge: '#6E4620', decor: 'flores', sun: '#FFE066' },
    { name: 'Bosque',   skyTop: '#8FD3C7', skyBot: '#F0FBF5', hillFar: '#5FA777', hillNear: '#3E8E5A',
      platTop: '#2E7D46', platBase: '#5D4028', platEdge: '#432D1B', decor: 'arboles', sun: '#FFF3B0' },
    { name: 'Desierto', skyTop: '#FFCF9E', skyBot: '#FFF3E0', hillFar: '#EFC988', hillNear: '#DDA65B',
      platTop: '#E8B44C', platBase: '#B9772E', platEdge: '#8F5A20', decor: 'cactus', sun: '#FF9F5A' },
    { name: 'Nieve',    skyTop: '#B7DFF5', skyBot: '#F4FAFF', hillFar: '#DCEFF9', hillNear: '#C2E2F4',
      platTop: '#FFFFFF', platBase: '#8FA6C4', platEdge: '#6C84A6', decor: 'nieve', sun: '#FFF8D6' },
    { name: 'Castillo', skyTop: '#C9B8F0', skyBot: '#FCEFF9', hillFar: '#B49AD9', hillNear: '#9678C4',
      platTop: '#C9B26A', platBase: '#8E8EA8', platEdge: '#6C6C86', decor: 'castillo', sun: '#FFE9A8' }
];

// Arranque del juego
window.addEventListener('DOMContentLoaded', () => new Game());
