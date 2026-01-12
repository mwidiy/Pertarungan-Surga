// main1.js (VERSI DIPERBARUI - Boss dengan Dismantle & Projectile Aktif)

import * as THREE from 'three';
import { Arena } from './components/Arena.js';
import { Player } from './components/Player.js';
import { Enemy } from './components/Enemy.js'; 
// --- TAMBAHKAN: Impor untuk Projectile ---
import { Projectile } from './components/Projectile.js';
// --- TAMBAHKAN: Impor untuk Projectile Dismantle ---
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
        this.projectiles = []; // Sekarang akan kita gunakan

        this.cameraManager = null;
        this.arena = null;
        this.player = null;
        this.playerControls = null;
        this.keyboardControls = null;
        
        this.vfxManager = null;

        // --- Referensi ke elemen HP Bar Player ---
        this.playerHpBarContainer = document.getElementById('player-hp-bar-container');
        this.playerHpBarFill = document.getElementById('player-hp-bar-fill');
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

        if (this.player && this.player.model && this.playerHpBarContainer) {
            this.playerHpBarContainer.style.visibility = 'visible';
        }

        // --- [START] BAGIAN SPAWN MUSUH ---
        
        const minionConfig = {
            hp: 20,
            size: 1, 
            color: 0xffa500, 
            attackType: 'ranged', 
            cooldown: 3, 
            moveSpeed: 0 
        };

        // --- UPDATE KONFIGURASI BOSS ---
        const bossConfig = {
            hp: 350, // HP lebih tinggi
            size: 3.5, 
            color: 0x8b0000, 
            attackType: 'mixed', // Bisa melee & ranged
            moveSpeed: 3.5, // Sedikit lebih cepat
            minChaseDistance: 4.0, // Jaga jarak sedikit saat melee
            // Melee
            meleeRange: 4.0, 
            meleeDamage: 25,
            meleeCooldown: 1.8,
            // Dismantle
            canUseDismantle: true, // AKTIFKAN
            dismantleDamage: 30,
            dismantleCooldown: 5.0,
            dismantleRange: 20,
            // Domain Expansion
            canUseDomain: true, // AKTIFKAN
            domainTriggerHp: 0.6, // Trigger di 60% HP
            domainCooldown: 25.0,
        };

        console.log("Spawning Boss...");
        const boss = new Enemy(
            this.scene, 
            this.player, 
            // --- Gunakan fungsi spawnProjectile yang baru ---
            (pos, dir, options) => this.spawnProjectile(pos, dir, options), 
            bossConfig
        );
        boss.mesh.position.set(0, bossConfig.size / 2, -15); // Mundur sedikit
        this.enemies.push(boss);
        this.createEnemyHpBar(boss);
        console.log("Boss spawned.");

        // --- Spawn kroco (Tidak Berubah) ---
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
                // Kroco akan memanggil ini dengan options kosong
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

    // --- Fungsi untuk membuat elemen HP Bar Musuh (Tidak Berubah) ---
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

    // --- UPDATE FUNGSI SPAWN PROJECTILE ---
    spawnProjectile(startPosition, direction, options = {}) {
        let projectile;
        
        // Cek tipe projectile dari options
        if (options.type === 'dismantle') {
            console.log("Spawning Dismantle Projectile!");
            projectile = new DismantleProjectile(
                this.scene, 
                startPosition, 
                direction, 
                this.player, // Targetnya player
                options.damage, 
                options.speed 
            );
        } else {
             // Projectile biasa (untuk kroco)
             projectile = new Projectile(
                this.scene, 
                startPosition, 
                direction, 
                this.player // Targetnya player
            );
        }

        // Tambahkan ke daftar projectiles jika berhasil dibuat
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

        // --- Update Skill Orb Aktif (Tidak Berubah) ---
        if (this.activeGravityOrb) {
            this.activeGravityOrb.update(delta);
            if (this.activeGravityOrb.isFinished) {
                this.activeGravityOrb.destroy(); 
                this.activeGravityOrb = null; 
            }
        }

        // --- PUSAT KONTROL PLAYER & HP BAR ---
        if (this.player && this.player.model && this.playerHpBarContainer) {


            if (this.keyboardControls.keys['p']) {
                console.log("Tombol 'P' terdeteksi!"); // <-- LOG 1
                const boss = this.enemies.find(enemy => {
                    // Cek apakah config, attackType ada, DAN attackType adalah 'melee' ATAU 'mixed'
                    return enemy.config && 
                           enemy.config.attackType && 
                           (enemy.config.attackType === 'melee' || enemy.config.attackType === 'mixed'); 
                });
                console.log("Mencari boss...", boss); // <-- LOG 2
    
                if (boss && !boss.isEliminated && boss.canUseDomain && boss.state !== 'USING_DOMAIN') {
                    console.log("Memulai Domain Expansion dari tombol P!"); // <-- LOG 3
                    boss.startDomainExpansion();
                    this.keyboardControls.keys['p'] = false; 
                } else if (boss) {
                    console.log("Kondisi Boss tidak terpenuhi:", { // <-- LOG 4 (Jika boss ada tapi gagal)
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
                     this.enemies, 
                     this.vfxManager, 
                     this.playerControls, 
                     this.camera 
                 );
                 if (newOrb) { 
                     this.activeGravityOrb = newOrb; 
                 }
            }
            if (this.playerControls.state.jump) { 
                this.player.jump();
            }

            // --- 3. Update Posisi & Lebar HP Bar Player (Tidak Berubah) ---
            if (this.player.currentHp > 0) {
                 const headPositionOffset = new THREE.Vector3(0, 2.5, 0); 
                 this.tempWorldVector.copy(this.player.model.position).add(headPositionOffset);
                 this.tempWorldVector.project(this.camera);
                 const screenX = (this.tempWorldVector.x * 0.5 + 0.5) * this.renderer.domElement.clientWidth;
                 const screenY = (-this.tempWorldVector.y * 0.5 + 0.5) * this.renderer.domElement.clientHeight;
                 this.playerHpBarContainer.style.left = `${screenX}px`;
                 this.playerHpBarContainer.style.top = `${screenY}px`;
                 const hpPercentage = (this.player.currentHp / this.player.maxHp) * 100;
                 this.playerHpBarFill.style.width = `${hpPercentage}%`;
                 if (this.playerHpBarContainer.style.visibility !== 'visible') {
                     this.playerHpBarContainer.style.visibility = 'visible';
                 }
                 if (this.tempWorldVector.z > 1) {
                     this.playerHpBarContainer.style.visibility = 'hidden';
                 }
            } else {
                 if (this.playerHpBarContainer.style.visibility !== 'hidden') {
                     this.playerHpBarContainer.style.visibility = 'hidden';
                 }
            }
        } // --- Akhir dari 'if (this.player && this.player.model && this.playerHpBarContainer)' ---

        // --- UPDATE MUSUH & HP BAR MUSUH (Logika Cleanup Diperbarui) ---
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            // Update musuh HANYA jika belum tereliminasi
            if (!enemy.isEliminated) {
                enemy.update(delta); 
            }

            const hpBar = this.enemyHpBarElements.get(enemy.id);

            if (hpBar) { 
                if (!enemy.isEliminated && enemy.mesh.visible) {
                    // Update posisi & lebar HP bar
                    // (Menggunakan enemy.size dari kode lama, asumsikan 'size' ada di enemy)
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
                    // Sembunyikan jika tereliminasi atau tidak visible
                    if (hpBar.container.style.visibility !== 'hidden') {
                        hpBar.container.style.visibility = 'hidden';
                    }
                }
            }

            // --- Logika Pembersihan Musuh yang Tereliminasi ---
            if (enemy.isEliminated) {
                // Hapus HP Bar jika masih ada
                const hpBarToRemove = this.enemyHpBarElements.get(enemy.id);
                if (hpBarToRemove) {
                    hpBarToRemove.container.remove(); 
                    this.enemyHpBarElements.delete(enemy.id); 
                }
                // Hapus musuh dari array utama
                this.enemies.splice(i, 1); 
                // Hapus mesh dari scene jika masih ada
                if (enemy.mesh && enemy.mesh.parent) {
                    this.scene.remove(enemy.mesh);
                    // TODO: Dispose geometry & material untuk memori
                    // enemy.mesh.geometry.dispose();
                    // enemy.mesh.material.dispose();
                }
                console.log(`Cleaned up eliminated enemy: ${enemy.id}`);
            }
        } // Akhir loop musuh

        // --- AKTIFKAN KEMBALI UPDATE PROJECTILE ---
        this.projectiles = this.projectiles.filter(p => {
             const alive = p.update(delta); 
             if (!alive) {
                 // Panggil destroy projectile jika ada (untuk cleanup)
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