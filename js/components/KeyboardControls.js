// components/KeyboardControls.js

export class KeyboardControls {
    constructor() {
        /**
         * Objek untuk menyimpan status tombol keyboard yang sedang ditekan.
         * Contoh: { 'w': true, 'a': false }
         * @type {Object<string, boolean>}
         */
        this.keys = {};

        // --- PROPERTI BARU ---
        // State untuk serangan yang akan dicek oleh class lain
        this.attack = false;
        // Variabel internal untuk melacak status tombol di frame sebelumnya
        this._attackPressedLastFrame = false;

        // Pasang event listeners saat objek dibuat
        this._setupEventListeners();
    }

    _setupEventListeners() {
        window.addEventListener('keydown', (event) => {
            // event.key akan menghasilkan 'w', 'a', 's', 'd', 'e', dll.
            this.keys[event.key.toLowerCase()] = true;
        });

        window.addEventListener('keyup', (event) => {
            this.keys[event.key.toLowerCase()] = false;
        });
    }

    /**
     * BARU: Method update yang harus dipanggil di setiap frame.
     * Fungsinya untuk menangani input yang butuh deteksi sekali tekan, seperti serangan.
     */
    update() {
        // 1. Reset status 'attack' di setiap awal frame.
        //    Ini memastikan 'attack' hanya bernilai true selama satu frame.
        this.attack = false;

        // 2. Cek status mentah tombol 'e' dari event listener.
        const isAttackPressed = this.keys['e'] || false;

        // 3. Logika utama: Cek jika tombol 'e' ditekan SEKARANG tapi TIDAK di frame sebelumnya.
        if (isAttackPressed && !this._attackPressedLastFrame) {
            this.attack = true; // Set trigger attack menjadi true untuk frame ini.
        }

        // 4. Simpan status tombol frame ini untuk perbandingan di frame BERIKUTNYA.
        this._attackPressedLastFrame = isAttackPressed;
    }
}