// main1.js (VERSI DIPERBARUI - Player UI dengan HP & Cursed Energy)

import * as THREE from 'three';
import { Arena } from './components/Arena.js';
import { Player } from './components/Player.js';
import { Enemy } from './components/Enemy.js'; 
import { Projectile } from './components/Projectile.js';
import { DismantleProjectile } from './components/DismantleProjectile.js';
import { CameraManager } from './components/CameraManager.js';
import { PlayerControls } from './components/PlayerControls.js';
import { KeyboardControls } from './components/KeyboardControls.js';
import { VFXManager } from './components/VFXManager.js';

class Game {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a232a);
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);
        this.clock = new THREE.Clock();

        this.enemies = [];
        this.projectiles = []; 

        this.cameraManager = null;
        this.arena = null;
        this.player = null;
        this.playerControls = null;
        this.keyboardControls = null;
        
        this.vfxManager = null;

        // --- Referensi ke elemen HP Bar Player ---
        this.playerHpBarContainer = document.getElementById('player-hp-bar-container');
        this.playerHpBarFill = document.getElementById('player-hp-bar-fill');
        
        // --- TAMBAHKAN 1: Referensi ke elemen Bar Energi ---
        this.playerCeBarContainer = document.getElementById('player-ce-bar-container');
        this.playerCeBarFill = document.getElementById('player-ce-bar-fill');

        this.tempWorldVector = new THREE.Vector3();

        // --- Referensi ke wadah HP musuh & Map ---
        this.enemyHpBarsArea = document.getElementById('enemy-hp-bars-area');
        this.enemyHpBarElements = new Map();

        // --- Properti untuk Skill Aktif ---
        this.activeGravityOrb = null;
    }

    async init() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
        directionalLight.position.set(10, 20, 5);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
        
        this.arena = new Arena(this.scene);
        this.keyboardControls = new KeyboardControls();
        this.playerControls = new PlayerControls(); 

        this.vfxManager = new VFXManager(this.scene);
        this.player = new Player(this.scene, this.keyboardControls, this.vfxManager);

        console.log("Mulai me-load aset game...");
        await Promise.all([
            this.player.initialize('models/character.fbx'), 
            this.vfxManager.init()                          
        ]);
        console.log("Semua aset berhasil di-load. Memulai game...");
        
        this.cameraManager = new CameraManager(this.camera, this.player.model, this.renderer.domElement);

        // --- Tampilkan HP Bar & Bar Energi Player ---
        if (this.player && this.player.model) {
            if (this.playerHpBarContainer) this.playerHpBarContainer.style.visibility = 'visible';
            // --- TAMBAHKAN 2: Tampilkan Bar Energi ---
            if (this.playerCeBarContainer) this.playerCeBarContainer.style.visibility = 'visible';
        }

        // --- [START] BAGIAN SPAWN MUSUH (Tidak Berubah) ---
        
        const minionConfig = {
            hp: 20, size: 1, color: 0xffa500, attackType: 'ranged', cooldown: 3, moveSpeed: 0 
        };

        const bossConfig = {
            hp: 350, size: 3.5, color: 0x8b0000, attackType: 'mixed', 
            moveSpeed: 3.5, minChaseDistance: 4.0, 
            meleeRange: 4.0, meleeDamage: 25, meleeCooldown: 1.8,
            canUseDismantle: true, dismantleDamage: 30, dismantleCooldown: 5.0, dismantleRange: 20,
            canUseDomain: true, domainTriggerHp: 0.6, domainCooldown: 25.0,
        };

        console.log("Spawning Boss...");
        const boss = new Enemy(
            this.scene, 
            this.player, 
            (pos, dir, options) => this.spawnProjectile(pos, dir, options), 
            bossConfig
        );
        boss.mesh.position.set(0, bossConfig.size / 2, -15); 
        this.enemies.push(boss);
        this.createEnemyHpBar(boss);
        console.log("Boss spawned.");

        const numberOfMinions = 5;
        const spawnRadius = 15; 
        console.log(`Spawning ${numberOfMinions} minions...`);
        for (let i = 0; i < numberOfMinions; i++) {
            const angle = Math.random() * Math.PI * 2; 
            const x = Math.cos(angle) * spawnRadius * (0.5 + Math.random() * 0.5); 
            const z = Math.sin(angle) * spawnRadius * (0.5 + Math.random() * 0.5); 
            const y = minionConfig.size / 2; 
            const minion = new Enemy(
                this.scene, 
                this.player, 
                (pos, dir, options) => this.spawnProjectile(pos, dir, options), 
                minionConfig 
            );
            minion.mesh.position.set(x, y, z); 
            this.enemies.push(minion);
            this.createEnemyHpBar(minion); 
        }
        console.log("Minions spawned.");
        
        // --- [END] BAGIAN SPAWN MUSUH ---
        
        this.animate();
        window.addEventListener('resize', this.onWindowResize.bind(this), false);
    }

    createEnemyHpBar(enemy) {
        if (!this.enemyHpBarsArea) return;
        const container = document.createElement('div');
        container.id = `hp-${enemy.id}`; 
        container.className = 'enemy-hp-bar-container'; 
        const fill = document.createElement('div');
        fill.className = 'enemy-hp-bar-fill';
        container.appendChild(fill);
        this.enemyHpBarsArea.appendChild(container); 
        this.enemyHpBarElements.set(enemy.id, { container, fill });
    }

    spawnProjectile(startPosition, direction, options = {}) {
        let projectile;
        if (options.type === 'dismantle') {
            console.log("Spawning Dismantle Projectile!");
            projectile = new DismantleProjectile(
                this.scene, startPosition, direction, 
                this.player, options.damage, options.speed 
            );
        } else {
             projectile = new Projectile(
                this.scene, startPosition, direction, this.player
            );
        }
        if (projectile) {
             this.projectiles.push(projectile);
        }
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        const delta = this.clock.getDelta();
        
        // --- Update Semua Komponen ---
        this.playerControls.update(); 
        if (this.cameraManager) this.cameraManager.update(delta);
        if (this.player) this.player.update(delta); 
        if (this.vfxManager) this.vfxManager.update(delta);

        if (this.activeGravityOrb) {
            this.activeGravityOrb.update(delta);
            if (this.activeGravityOrb.isFinished) {
                this.activeGravityOrb.destroy(); 
                this.activeGravityOrb = null; 
            }
        }

        // --- PUSAT KONTROL PLAYER & UI (HP + ENERGI) ---
        // (Menggunakan check 'playerHpBarContainer' dari kode lama untuk safety)
        if (this.player && this.player.model && this.playerHpBarContainer) {
            
            // (Logika Debug 'P' Key - Tidak Berubah)
            if (this.keyboardControls.keys['p']) {
                console.log("Tombol 'P' terdeteksi!"); 
                const boss = this.enemies.find(enemy => {
                    return enemy.config && 
                           enemy.config.attackType && 
                           (enemy.config.attackType === 'melee' || enemy.config.attackType === 'mixed'); 
                });
                console.log("Mencari boss...", boss); 
                if (boss && !boss.isEliminated && boss.canUseDomain && boss.state !== 'USING_DOMAIN') {
                    console.log("Memulai Domain Expansion dari tombol P!"); 
                    boss.startDomainExpansion();
                    this.keyboardControls.keys['p'] = false; 
                } else if (boss) {
                    console.log("Kondisi Boss tidak terpenuhi:", { 
                        isEliminated: boss.isEliminated,
                        canUseDomain: boss.canUseDomain,
                        state: boss.state
                    });
                }
            }
            
            // --- 1. LOGIKA GERAKAN (dari Stik Kiri) (Tidak Berubah) ---
            const cameraForward = new THREE.Vector3();
            this.camera.getWorldDirection(cameraForward);
            cameraForward.y = 0;
            cameraForward.normalize();
            const cameraRight = new THREE.Vector3();
            cameraRight.crossVectors(new THREE.Vector3(0, 1, 0), cameraForward).normalize();
            const moveDirection = new THREE.Vector3();
            const moveInput = this.playerControls.state.move;
            moveDirection.addScaledVector(cameraForward, -moveInput.y);
            moveDirection.addScaledVector(cameraRight, moveInput.x);

            if (moveDirection.lengthSq() > 0.01) {
                moveDirection.normalize();
                const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), moveDirection);
                this.player.model.quaternion.slerp(targetQuaternion, 0.15);
                const moveDistance = this.player.moveSpeed * delta;
                this.player.model.position.add(moveDirection.multiplyScalar(moveDistance));
                this.player.animationManager.playAction('Run'); 
            } else {
                this.player.animationManager.playAction('Idle'); 
            }

            // --- 2. LOGIKA AKSI (dari Tombol Gamepad) (Tidak Berubah) ---
            if (this.playerControls.state.punch) { 
                this.player.punch(this.enemies); 
            }
            if (this.playerControls.state.activateBlueSkill && !this.activeGravityOrb) {
                 const newOrb = this.player.activateBlueSkill(
                     this.enemies, this.vfxManager, this.playerControls, this.camera 
                 );
                 if (newOrb) { 
                     this.activeGravityOrb = newOrb; 
                 }
            }
            if (this.playerControls.state.jump) { 
                this.player.jump();
            }

            // --- 3. Update UI Player (HP & Energi) ---
            
            // Cek jika player masih hidup untuk update UI
            if (!this.player.isEliminated) {
                 // --- Hitung Posisi Layar ---
                 const headPositionOffset = new THREE.Vector3(0, 2.5, 0); 
                 this.tempWorldVector.copy(this.player.model.position).add(headPositionOffset);
                 this.tempWorldVector.project(this.camera);
                 const screenX = (this.tempWorldVector.x * 0.5 + 0.5) * this.renderer.domElement.clientWidth;
                 const screenY = (-this.tempWorldVector.y * 0.5 + 0.5) * this.renderer.domElement.clientHeight;
                 const isBehindCamera = this.tempWorldVector.z > 1;

                 // --- Update HP Bar ---
                 if (this.playerHpBarContainer) {
                     this.playerHpBarContainer.style.left = `${screenX}px`;
                     this.playerHpBarContainer.style.top = `${screenY}px`;
                     const hpPercentage = (this.player.currentHp / this.player.maxHp) * 100;
                     this.playerHpBarFill.style.width = `${hpPercentage}%`;
                     this.playerHpBarContainer.style.visibility = isBehindCamera ? 'hidden' : 'visible';
                 }

                 // --- TAMBAHKAN 3: Update Bar Energi ---
                 if (this.playerCeBarContainer) {
                     // Hitung posisi Y agar tepat di bawah HP bar
                     const hpBarHeight = 8; // Tinggi HP bar dari CSS (sesuaikan jika beda)
                     const barSpacing = 2; // Jarak antar bar
                     const ceBarTop = screenY + hpBarHeight + barSpacing; 

                     this.playerCeBarContainer.style.left = `${screenX}px`;
                     this.playerCeBarContainer.style.top = `${ceBarTop}px`; // Gunakan posisi Y baru

                     // Update lebar fill bar energi
                     const energyPercentage = (this.player.currentCursedEnergy / this.player.maxCursedEnergy) * 100;
                     this.playerCeBarFill.style.width = `${energyPercentage}%`;
                     
                     // Visibilitas sama dengan HP bar
                     this.playerCeBarContainer.style.visibility = isBehindCamera ? 'hidden' : 'visible';
                 }

            } else {
                 // Jika player tereliminasi, sembunyikan kedua bar
                 if (this.playerHpBarContainer && this.playerHpBarContainer.style.visibility !== 'hidden') {
                     this.playerHpBarContainer.style.visibility = 'hidden';
                 }
                 if (this.playerCeBarContainer && this.playerCeBarContainer.style.visibility !== 'hidden') {
                     this.playerCeBarContainer.style.visibility = 'hidden';
                 }
            }
        } // --- Akhir dari 'if (this.player && this.player.model && this.playerHpBarContainer)' ---

        // --- UPDATE MUSUH & HP BAR MUSUH (Tidak Berubah) ---
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            if (!enemy.isEliminated) {
                enemy.update(delta); 
            }

            const hpBar = this.enemyHpBarElements.get(enemy.id);

            if (hpBar) { 
                if (!enemy.isEliminated && enemy.mesh.visible) {
                    const enemyYOffset = (enemy.size / 2) + 0.5; 
                    const enemyHeadOffset = new THREE.Vector3(0, enemyYOffset, 0); 
                    this.tempWorldVector.copy(enemy.mesh.position).add(enemyHeadOffset);
                    this.tempWorldVector.project(this.camera);
                    const screenX = (this.tempWorldVector.x * 0.5 + 0.5) * this.renderer.domElement.clientWidth;
                    const screenY = (-this.tempWorldVector.y * 0.5 + 0.5) * this.renderer.domElement.clientHeight;
                    hpBar.container.style.left = `${screenX}px`;
                    hpBar.container.style.top = `${screenY}px`;
                    const hpPercentage = (enemy.currentHp / enemy.maxHp) * 100;
                    hpBar.fill.style.width = `${hpPercentage}%`;
                    hpBar.container.style.visibility = (this.tempWorldVector.z > 1) ? 'hidden' : 'visible';
                } else {
                    if (hpBar.container.style.visibility !== 'hidden') {
                        hpBar.container.style.visibility = 'hidden';
                    }
                }
            }

            if (enemy.isEliminated) {
                const hpBarToRemove = this.enemyHpBarElements.get(enemy.id);
                if (hpBarToRemove) {
                    hpBarToRemove.container.remove(); 
                    this.enemyHpBarElements.delete(enemy.id); 
                }
                this.enemies.splice(i, 1); 
                if (enemy.mesh && enemy.mesh.parent) {
                    this.scene.remove(enemy.mesh);
                }
                console.log(`Cleaned up eliminated enemy: ${enemy.id}`);
            }
        } // Akhir loop musuh

        // --- UPDATE PROJECTILE (Tidak Berubah) ---
        this.projectiles = this.projectiles.filter(p => {
             const alive = p.update(delta); 
             if (!alive) {
                 if (p.destroy) p.destroy();
             }
             return alive; 
        });
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// Panggil game.init() setelah kelas didefinisikan
const game = new Game();
game.init();