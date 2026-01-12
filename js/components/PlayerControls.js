// js/components/PlayerControls.js (VERSI BARU DENGAN TOMBOL AKSI)

export class PlayerControls {
    constructor() {
        this.state = {
            move: { x: 0, y: 0 }, // Stik Kiri (Tidak berubah)
            look: { x: 0, y: 0 }, // Stik Kanan (Digunakan untuk skill Blue)
            jump: false,          // Tombol X (Cross) - Trigger
            // --- TAMBAHKAN STATE BARU ---
            activateBlueSkill: false, // Tombol O (Circle) - Trigger
            punch: false              // Tombol Kotak (Square) - Trigger
        };

        // Properti internal untuk nilai mentah
        this._rawMove = { x: 0, y: 0 };
        this._rawLook = { x: 0, y: 0 };
        this._rawJump = false; 
        // --- TAMBAHKAN RAW STATE BARU ---
        this._rawActivateBlueSkill = false;
        this._rawPunch = false;
        
        // Deteksi penekanan tombol sekali saja
        this._jumpPressedLastFrame = false;
        // --- TAMBAHKAN LAST FRAME BARU ---
        this._activateBlueSkillPressedLastFrame = false;
        this._punchPressedLastFrame = false;


        this.gamepadIndex = null;
        this.deadzone = 0.15;
        this.smoothingFactor = 0.1; // Smoothing bisa disesuaikan

        this._setupEventListeners();
    }

    _setupEventListeners() {
        window.addEventListener('gamepadconnected', (event) => {
            if (this.gamepadIndex === null) this.gamepadIndex = event.gamepad.index;
        });
        window.addEventListener('gamepaddisconnected', (event) => {
            if (this.gamepadIndex === event.gamepad.index) {
                this.gamepadIndex = null;
                // Reset semua state mentah & last frame
                this._rawMove = { x: 0, y: 0 };
                this._rawLook = { x: 0, y: 0 };
                this._rawJump = false;
                this._rawActivateBlueSkill = false;
                this._rawPunch = false;
                this._jumpPressedLastFrame = false;
                this._activateBlueSkillPressedLastFrame = false;
                this._punchPressedLastFrame = false;
            }
        });
    }

    update() {
        // --- Reset semua trigger state di awal ---
        this.state.jump = false;
        this.state.activateBlueSkill = false;
        this.state.punch = false;

        if (this.gamepadIndex !== null) {
            const gamepad = navigator.getGamepads()[this.gamepadIndex];
            if (gamepad) {
                // --- Baca Stik Analog ---
                // Stik Kiri (Axes 0, 1 - Tidak berubah)
                let moveX = gamepad.axes[0];
                let moveY = gamepad.axes[1];
                // Apply deadzone (lebih baik cek absolut dulu)
                this._rawMove.x = Math.abs(moveX) > this.deadzone ? -moveX : 0;
                this._rawMove.y = Math.abs(moveY) > this.deadzone ? moveY : 0;
                
                // Stik Kanan (Axes 2, 3 - Untuk Skill Blue)
                let lookX = gamepad.axes[2];
                let lookY = gamepad.axes[3];
                this._rawLook.x = Math.abs(lookX) > this.deadzone ? -lookX : 0;
                this._rawLook.y = Math.abs(lookY) > this.deadzone ? lookY : 0;

                // --- Baca Tombol ---
                // (Mapping umum: 0=X, 1=O, 2=Kotak, 3=Segitiga)
                this._rawJump = gamepad.buttons[0]?.pressed || false; // Tombol X
                this._rawActivateBlueSkill = gamepad.buttons[1]?.pressed || false; // Tombol O
                this._rawPunch = gamepad.buttons[2]?.pressed || false; // Tombol Kotak

            } else {
                // Reset jika gamepad tidak terdeteksi
                this._rawMove = { x: 0, y: 0 };
                this._rawLook = { x: 0, y: 0 };
                this._rawJump = false;
                this._rawActivateBlueSkill = false;
                this._rawPunch = false;
            }
        } else {
             // Reset jika tidak ada gamepad terhubung
             this._rawMove = { x: 0, y: 0 };
             this._rawLook = { x: 0, y: 0 };
             this._rawJump = false;
             this._rawActivateBlueSkill = false;
             this._rawPunch = false;
        }
        
        // --- Logika Deteksi Penekanan Tombol Sekali ---
        // Lompat (X)
        if (this._rawJump && !this._jumpPressedLastFrame) {
            this.state.jump = true; 
        }
        this._jumpPressedLastFrame = this._rawJump;

        // Aktivasi Skill Biru (O)
        if (this._rawActivateBlueSkill && !this._activateBlueSkillPressedLastFrame) {
            this.state.activateBlueSkill = true; 
        }
        this._activateBlueSkillPressedLastFrame = this._rawActivateBlueSkill;

        // Pukulan (Kotak)
        if (this._rawPunch && !this._punchPressedLastFrame) {
            this.state.punch = true; 
        }
        this._punchPressedLastFrame = this._rawPunch;

        // --- Terapkan Smoothing (Opsional, sesuaikan nilai smoothingFactor) ---
        this.state.move.x += (this._rawMove.x - this.state.move.x) * this.smoothingFactor;
        this.state.move.y += (this._rawMove.y - this.state.move.y) * this.smoothingFactor;
        this.state.look.x += (this._rawLook.x - this.state.look.x) * this.smoothingFactor;
        this.state.look.y += (this._rawLook.y - this.state.look.y) * this.smoothingFactor;
    }
}